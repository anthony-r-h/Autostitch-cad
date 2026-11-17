using System;
using System.Collections.Generic;
using Bricscad.ApplicationServices;
using Teigha.DatabaseServices;
using Teigha.Runtime;

[assembly: ExtensionApplication(typeof(Autostitch.EditEvents))]
[assembly: CommandClass(typeof(Autostitch.EditEvents))]
[assembly: System.Reflection.AssemblyVersion("1.3.0.0")]

namespace Autostitch
{
    // Native callbacks join the triggering edit's Undo operation. Geometry,
    // persistence, and editing remain in the existing LISP implementation.
    public sealed class EditEvents : IExtensionApplication
    {
        private sealed class EditState
        {
            public readonly HashSet<ObjectId> Changed = new HashSet<ObjectId>();
            public int Depth;
            public bool Tracking;
        }
        private static readonly Dictionary<Document, EditState> Enabled = new Dictionary<Document, EditState>();
        private static readonly HashSet<string> History = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "U", "UNDO", "REDO", "MREDO"
        };
        private static bool syncing;

        public void Initialize()
        {
            Application.DocumentManager.DocumentToBeDestroyed += Closing;
        }

        public void Terminate()
        {
            Application.DocumentManager.DocumentToBeDestroyed -= Closing;
            foreach (Document document in new List<Document>(Enabled.Keys)) Detach(document);
        }

        [CommandMethod("ASTENABLEEVENTSV2", CommandFlags.NoUndoMarker | CommandFlags.NoHistory)]
        public static void Enable()
        {
            Document document = Application.DocumentManager.MdiActiveDocument;
            if (document == null) return;
            // A loaded .NET DLL cannot be unloaded. On a live upgrade, detach the
            // previous bridge from this document before enabling the new one.
            foreach (System.Reflection.Assembly assembly in AppDomain.CurrentDomain.GetAssemblies())
            {
                if (assembly == typeof(EditEvents).Assembly || assembly.GetName().Name != "Autostitch.Events") continue;
                Type legacy = assembly.GetType(typeof(EditEvents).FullName, false);
                if (legacy == null) continue;
                System.Reflection.MethodInfo detach = legacy.GetMethod("Detach",
                    System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Static);
                if (detach != null) detach.Invoke(null, new object[] { document });
            }
            if (!Enabled.ContainsKey(document))
            {
                Enabled.Add(document, new EditState());
                document.CommandWillStart += Starting;
                document.CommandEnded += Edited;
                document.CommandCancelled += Edited;
                document.CommandFailed += Edited;
                document.Database.ObjectModified += Modified;
                document.Database.ObjectAppended += Modified;
                document.Database.ObjectErased += Erased;
            }
            // Native commands are available in drawings opened before NETLOAD;
            // V22's managed LispFunction bindings are not reliably available there.
            using (ResultBuffer call = new ResultBuffer(new TypedValue(5005, "ast:events-ready"),
                new TypedValue(5005, document.Name)))
            using (ResultBuffer result = Bricscad.Global.Editor.Invoke(call)) { }
        }

        private static void Closing(object sender, DocumentCollectionEventArgs arguments)
        {
            Detach(arguments.Document);
        }

        private static void Detach(Document document)
        {
            if (!Enabled.Remove(document)) return;
            document.CommandWillStart -= Starting;
            document.CommandEnded -= Edited;
            document.CommandCancelled -= Edited;
            document.CommandFailed -= Edited;
            document.Database.ObjectModified -= Modified;
            document.Database.ObjectAppended -= Modified;
            document.Database.ObjectErased -= Erased;
        }

        private static void Starting(object sender, CommandEventArgs arguments)
        {
            EditState state;
            if (syncing || !Enabled.TryGetValue((Document)sender, out state)) return;
            if (state.Depth++ != 0) return;
            state.Changed.Clear();
            string name = arguments.GlobalCommandName;
            // Palette actions already update helpers in their own transactions.
            // All other commands are filtered by the objects they actually change.
            state.Tracking = !History.Contains(name) && !name.StartsWith("ASTUI", StringComparison.OrdinalIgnoreCase) &&
                !name.Equals("AUTOSTITCH", StringComparison.OrdinalIgnoreCase) &&
                !name.Equals("ASTENABLEEVENTSV2", StringComparison.OrdinalIgnoreCase);
        }

        private static void Modified(object sender, ObjectEventArgs arguments) { Changed(arguments.DBObject); }
        private static void Erased(object sender, ObjectErasedEventArgs arguments) { Changed(arguments.DBObject); }

        private static void Changed(DBObject value)
        {
            Document document = Application.DocumentManager.MdiActiveDocument;
            EditState state;
            if (syncing || document == null || value.Database != document.Database ||
                !Enabled.TryGetValue(document, out state) || !state.Tracking) return;
            if (!value.ObjectId.IsNull) state.Changed.Add(value.ObjectId);
            // Keep the owner as well: a removed block child or Xrecord may no longer open.
            if (!value.OwnerId.IsNull) state.Changed.Add(value.OwnerId);
        }

        private static DBObject Read(Transaction transaction, ObjectId id)
        {
            return id.IsNull || !id.IsValid ? null : transaction.GetObject(id, OpenMode.ForRead, true);
        }

        private static void Candidates(Transaction transaction, ObjectId id, HashSet<ObjectId> visited,
            HashSet<ObjectId> candidates, HashSet<ObjectId> content)
        {
            if (!visited.Add(id)) return;
            DBObject value = Read(transaction, id);
            if (value == null) return;
            BlockTableRecord block = value as BlockTableRecord;
            if (block != null)
            {
                if (!block.IsLayout && !block.IsErased)
                    foreach (ObjectId reference in block.GetBlockReferenceIds(true, false))
                    {
                        candidates.Add(reference);
                        content.Add(reference);
                    }
                return;
            }
            if (value is Entity) candidates.Add(id);
            if (value is Entity || value is Xrecord || value is DBDictionary)
                Candidates(transaction, value.OwnerId, visited, candidates, content);
        }

        private static void Related(Transaction transaction, ObjectId id, HashSet<ObjectId> visited,
            HashSet<ObjectId> affected)
        {
            if (!visited.Add(id)) return;
            Entity entity = Read(transaction, id) as Entity;
            if (entity == null || entity.ExtensionDictionary.IsNull) return;
            DBDictionary dictionary = Read(transaction, entity.ExtensionDictionary) as DBDictionary;
            if (dictionary == null) return;
            // Persisted ownership is the registry. It survives COPY and Undo without
            // a second, potentially stale in-memory membership index or a layer scan.
            foreach (string key in new[] { "AUTOSTITCH_V1", "AUTOSTITCH_UI_V1", "AUTOSTITCH_MATCH_V1" })
            {
                if (!dictionary.Contains(key)) continue;
                affected.Add(id);
                Xrecord record = Read(transaction, dictionary.GetAt(key)) as Xrecord;
                if (record == null) continue;
                using (ResultBuffer data = record.Data)
                {
                    if (data == null) continue;
                    foreach (TypedValue item in data)
                        if (item.TypeCode >= 331 && item.TypeCode <= 335 && item.Value is ObjectId)
                            Related(transaction, (ObjectId)item.Value, visited, affected);
                }
            }
        }

        private static string Handles(HashSet<ObjectId> ids)
        {
            List<string> handles = new List<string>();
            foreach (ObjectId id in ids) handles.Add("\"" + id.Handle.ToString() + "\"");
            return "(" + string.Join(" ", handles.ToArray()) + ")";
        }

        private static void Edited(object sender, CommandEventArgs arguments)
        {
            Document document = sender as Document;
            EditState state;
            bool history = History.Contains(arguments.GlobalCommandName);
            if (syncing || document == null || !Enabled.TryGetValue(document, out state)) return;
            if (state.Depth > 0) state.Depth--;
            if (state.Depth != 0) return;
            bool tracking = state.Tracking;
            state.Tracking = false;
            HashSet<ObjectId> changed = new HashSet<ObjectId>(state.Changed);
            state.Changed.Clear();
            if ((!history && !tracking) || document != Application.DocumentManager.MdiActiveDocument) return;
            syncing = true;
            try
            {
                // A LISP action can issue native UNDO Begin/End while saving inputs.
                // Re-entering its interpreter here can corrupt the active evaluation.
                if ((Convert.ToInt32(Application.GetSystemVariable("CMDACTIVE")) & 32) != 0) return;
                // History notifications may refresh controls only. Even opening a
                // database transaction here can invalidate native Redo.
                if (history)
                {
                    using (ResultBuffer call = new ResultBuffer(new TypedValue(5005, "ast:markers-history-refresh")))
                    using (ResultBuffer result = Bricscad.Global.Editor.Invoke(call)) { }
                    return;
                }
                if (changed.Count == 0) return;
                using (Transaction transaction = document.Database.TransactionManager.StartTransaction())
                {
                    HashSet<ObjectId> candidates = new HashSet<ObjectId>();
                    HashSet<ObjectId> content = new HashSet<ObjectId>();
                    HashSet<ObjectId> visited = new HashSet<ObjectId>();
                    foreach (ObjectId id in changed) Candidates(transaction, id, visited, candidates, content);
                    HashSet<ObjectId> affected = new HashSet<ObjectId>();
                    visited.Clear();
                    foreach (ObjectId id in candidates) Related(transaction, id, visited, affected);
                    if (affected.Count == 0) return;
                    content.IntersectWith(affected);
                    using (ResultBuffer call = new ResultBuffer(new TypedValue(5005, "ast:markers-native-changed"),
                        new TypedValue(5005, Handles(affected)), new TypedValue(5005, Handles(content))))
                    using (ResultBuffer result = Bricscad.Global.Editor.Invoke(call))
                    {
                        TypedValue[] values = result == null ? new TypedValue[0] : result.AsArray();
                        if (values.Length == 1 && values[0].TypeCode == 5021) transaction.Commit();
                        else
                        {
                            string message = values.Length == 1 && values[0].Value is string
                                ? (string)values[0].Value : "The editing-marker update did not complete.";
                            document.Editor.WriteMessage("\nAutostitch: " + message + " Select the stitch line to refresh its markers.");
                        }
                    }
                }
            }
            catch (System.Exception error)
            {
                document.Editor.WriteMessage("\nAutostitch: " + error.Message + " Select the stitch line to refresh its markers.");
            }
            finally { syncing = false; }
        }
    }
}
