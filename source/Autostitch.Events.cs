using System;
using System.Collections.Generic;
using Bricscad.ApplicationServices;
using Teigha.DatabaseServices;
using Teigha.Runtime;

[assembly: ExtensionApplication(typeof(Autostitch.EditEvents))]
[assembly: CommandClass(typeof(Autostitch.EditEvents))]
[assembly: System.Reflection.AssemblyVersion("1.1.0.0")]

namespace Autostitch
{
    // Native callbacks join the triggering edit's Undo operation. Geometry,
    // persistence, and editing remain in the existing LISP implementation.
    public sealed class EditEvents : IExtensionApplication
    {
        private static readonly HashSet<Document> Enabled = new HashSet<Document>();
        private static readonly HashSet<string> Edits = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "MOVE", "STRETCH", "ERASE", "COPY", "ROTATE", "SCALE", "MIRROR",
            "PEDIT", "REVERSE", "TRIM", "EXTEND", "BREAK", "LENGTHEN", "JOIN",
            "EXPLODE", "CHANGE", "CHPROP", "GRIP_EDIT", "GRIP_STRETCH",
            "GRIP_MOVE", "GRIP_ROTATE", "GRIP_SCALE", "GRIP_MIRROR"
        };
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
            foreach (Document document in new List<Document>(Enabled)) Detach(document);
        }

        [CommandMethod("ASTENABLEEVENTSV1", CommandFlags.NoUndoMarker | CommandFlags.NoHistory)]
        public static void Enable()
        {
            Document document = Application.DocumentManager.MdiActiveDocument;
            if (document == null) return;
            if (Enabled.Add(document))
            {
                document.CommandEnded += Edited;
                document.CommandCancelled += Edited;
                document.CommandFailed += Edited;
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
            document.CommandEnded -= Edited;
            document.CommandCancelled -= Edited;
            document.CommandFailed -= Edited;
        }

        private static void Edited(object sender, CommandEventArgs arguments)
        {
            Document document = sender as Document;
            bool history = History.Contains(arguments.GlobalCommandName);
            if (syncing || (!history && !Edits.Contains(arguments.GlobalCommandName)) || document == null ||
                !Enabled.Contains(document) || document != Application.DocumentManager.MdiActiveDocument) return;
            syncing = true;
            try
            {
                // History notifications may refresh controls only. Even opening a
                // database transaction here can invalidate native Redo.
                if (history)
                {
                    using (ResultBuffer call = new ResultBuffer(new TypedValue(5005, "ast:ui-native-refresh")))
                    using (ResultBuffer result = Bricscad.Global.Editor.Invoke(call)) { }
                    return;
                }
                using (Transaction transaction = document.Database.TransactionManager.StartTransaction())
                using (ResultBuffer call = new ResultBuffer(new TypedValue(5005, "ast:markers-native-sync")))
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
            catch (System.Exception error)
            {
                document.Editor.WriteMessage("\nAutostitch: " + error.Message + " Select the stitch line to refresh its markers.");
            }
            finally { syncing = false; }
        }
    }
}
