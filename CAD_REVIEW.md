# CAD implementation review

Review date: 2026-11-06. Recommendations for incorporation into BRICSCAD_PLAN.md; this is not a second product specification.

## Decision

Build the first usable tool in **AutoLISP with the existing OpenDCL palette runtime**, targeting Windows BricsCAD V22. Keep the calculations in ordinary, independently callable LISP functions, with a small DWG adapter and palette callbacks. Port the accepted formulas and their tests; do not run Node, HTML or an external geometry service inside the product.

This follows the demonstrated CSVLABEL deployment. The geometry uses doubles, direct trigonometry and bounded walks; it does not require a compiled solver. LISP needs explicit record validation and careful rollback. C# would improve types, transactions and clone-event access, but would still require the same route planner, attachment rules and physical decisions. Those benefits do not justify a second runtime/build path for the first supported line/arc workflow. Implement one stack now.

| Option | Decision |
| --- | --- |
| AutoLISP + OpenDCL | Use. Existing installed runtime, working project patterns, dockable palette, CAD picking. |
| AutoLISP + ordinary DCL | Adds repeated close/pick/reopen interactions; no need to build a second UI. |
| C# + native WinForms PaletteSet | Technically available for V22/.NET Framework 4.8; retain as a future replacement only if measured scale or required native UI integration warrants it. |
| BRX custom entities, WPF/web UI, hybrid LISP/C# | No present requirement warrants the deployment or object-lifecycle work. |

Reuse CSVLABEL's callback conventions and packaging, not its entire application. OpenDCL is a dockable palette, not the native BricsCAD panel icon strip. Ship the compiled `.odcl`; users should not build it. [CSVLABEL](https://github.com/anthony-r-h/Csvlabel)

## Smallest useful interaction

One `AUTOSTITCH` command/button opens one compact palette. Its normal controls are **Select guide**, **Start**, **End**, **Landmark**, **Intersection**, **Reverse**, pitch, and **Generate**. Selecting a displayed marker offers Move/Delete. Show the selected guide, a travel arrow, and a short status; do not expose construction tables or numeric stations.

For a new open guide, show Start/End at its endpoints immediately. Preserve entity traversal direction; Reverse is one action. Use 3 mm as an explicitly provisional first-run pitch, then remember the last pitch. A seam's stored pitch always overrides the session default. The straight-line happy path is select guide, inspect defaults, Generate. No mandatory annotations, extra preview acceptance, profile dialog or layer setup.

For a closed guide, require one start pick and show direction; coincident endpoints alone cannot define the traversal. Additional landmarks/intersections are intentional picks, not inferred from every crossing. An unannotated sharp turn must be highlighted as needing a supported junction treatment rather than silently assigned one. Unsupported curves and junctions fail with their location and reason.

Palette picking temporarily gives control to the drawing, uses normal snaps, and returns to the same tool. Drawing actions use OpenDCL `EventInvoke=1`; simple field updates use synchronous events. Initialize callbacks in each document and clear selection when documents change. [OpenDCL event context](https://www.opendcl.com/HelpFiles/ENU/Reference/Property/EventInvoke.htm), [document lifecycle](https://www.opendcl.com/HelpFiles/ENU/Concepts/Modality.htm)

Display input symbols as nonplotting tool graphics, separate from generated cuts. Derive their positions from stored attachments each time the tool opens. Pitch/annotation changes are saved input edits with predictable Undo; Generate is a separate operation. A live preview is useful but must not become an extra required confirmation or a prerequisite for the first vertical slice.

## Attachments: choose a meaning, not just a parameter

Use the actual user-drawn entity as the authoritative guide. Never replace it with the last generated snapshot. Default attachment meanings:

| Pick | Stored meaning |
| --- | --- |
| Open Start/End at entity endpoint | Semantic first/last endpoint; follows that endpoint when length changes. |
| Marker snapped to a supported guide vertex | That vertex in the validated primitive sequence; follows a supported stretch of that vertex. |
| Interior point on a line/arc | Owning primitive plus fixed physical distance from its start, with a visible attachment description. Distance locates the annotation; it does not redefine slit pitch as arc length. |
| Intersection of another object and the guide | Initially a guide marker only; do not imply an associative link to the other object. |

Example: a 30 mm line with a landmark 16.5 mm from its start becomes 40 mm by extending its end. The landmark remains 16.5 mm from the start; it must not become 22 mm because its old fraction was 0.55. Shortening below 16.5 mm invalidates it. Moving the owning start moves its distance-attached marker; show the attachment and moved marker before regeneration. Reverse traversal does not change an existing marker's physical attachment.

For polylines, a bare vertex/segment index is insufficient. Store the prior analytic primitive sequence and validate correspondence before reusing indices. Support unchanged topology and demonstrably corresponding endpoint/vertex edits. Adding/removing/reordering vertices, reversing native entity geometry, changing primitive type, or ambiguous correspondence requires reattachment of affected markers. Never select the nearest new segment or silently clamp a station. Prefer a clear re-pick to an inferred semantic change.

No general associative constraint engine is needed. Linking landmarks to pocket edges can be a later explicit feature. Until then, moving another object does not move a landmark.

## Generation and DWG writes

Each seam has one unique output block reference on `AUTOSTITCH`, containing actual lines, circles and correction marks on that same layer. Keep the source guide on its original layer. Keep metadata on the guide and block reference, never solely on a potentially shared block definition.

1. Read and validate current guide, units, attachments and settings. Reject unitless drawings until units are selected once for the drawing.
2. Compute the complete result in memory. Validate finite values, admitted junctions, protected gaps, correction limits and relevant collision/clearance conditions. On failure, retain the prior output and identify the failing input. Accepted prefixes may be diagnostic preview only.
3. In one command context, start an Undo group and stage a fresh uniquely named block definition. Check every entity/metadata write. Do not modify the old block definition in place.
4. Switch only this seam's output reference to the staged definition, or create its first reference. Write matching source/output revision metadata within the same group. Retain old definitions while any reference uses them.
5. On any write failure, roll back the entire generation group and report the actual error. Restore editor settings in the error handler. End successful generation as one Undo operation.

`StartUndoMark` groups changes; it is **not a database transaction or automatic rollback**. A failure after entity creation or during metadata replacement must be deliberately injected in host tests. Never describe the LISP writer as atomic until those tests pass. Restrict the first writer to command context with Undo enabled; reject generation if rollback cannot be guaranteed. Do not attempt a write from a reactor callback.

Ordinary guide edits leave the previous output unchanged and visibly stale when the tool next inspects it. Generate performs the replacement. No automatic hole regeneration on each grip movement. Compare the live guide against saved generation inputs on selection/open/Generate, so edits made with the plugin unloaded are detected too.

## Minimum persistence

Use a versioned extension-dictionary Xrecord on the guide. Validate known fields explicitly when reading it. Keep object references in actual DWG reference fields rather than embedding handle strings in a serialized blob. CSVLABEL already uses Xrecords, but its CSV-label identity is not sufficient for seam copying.

| Record | Minimum contents |
| --- | --- |
| Guide definition | Schema/rule version; seam identity; output reference; units/plane; pitch/profile ID; traversal and endpoint policy; typed marker attachments. |
| Successful generation | Revision; exact analytic source/input snapshot sufficient to detect staleness and validate attachments. |
| Output reference | Guide reference; seam identity; generated revision; expected transform. |

The actual cuts are already DWG entities; do not also persist a second full opening list unless imprint correspondence requires it. Store no SVG, UI state, cached station labels, or unneeded seam/instance/master identity hierarchy in the first slice. Use numeric, locale-independent data. Unknown schema/rule versions are read-only until explicitly migrated.

## Copies, transforms and Undo

- Require reciprocal guide/output references before replacing anything. Copied IDs or matching block names alone never authorize an update.
- Copying only output produces ordinary static geometry, not another editable master. The tool must not follow its old guide link and overwrite the original seam.
- Copying only a guide creates an independent definition when next opened/generated. Clear any nonreciprocal output association and assign a new identity; generate a new output.
- Copying both may preserve editing only after translated references are verified as a reciprocal pair. Assign an independent identity on first edit. If cloning did not remap both references, treat the copied guide as independent with no output rather than guessing by proximity.
- Native copies can share block definitions. Regenerate by assigning a new definition to the selected reference; never alter the common definition.
- Move/rotate the guide and output together to relocate a seam. If output alone was moved, flag the transform mismatch and require an explicit restore/detach action; Generate must not silently snap it back.
- Scaling requires explicit unit/profile policy; do not silently scale physical pitch or tool size. Mirroring a static output preserves its transformed cuts. Regeneration of reflected guides remains unsupported until punching-face handedness is settled.
- One Undo after Generate restores the previous output and generation revision. Earlier source edits remain separate Undo steps. Redo and save/reopen must preserve the same association.

## Build order and acceptance gates

1. **LINE vertical slice:** select; visible endpoint defaults; pitch; Generate one block; edit source length; Generate replacement; save/reopen; Undo/Redo. No geometry extension until this works in V22.
2. **Intent:** interior landmarks and validated attachments; prove the 30-to-40 mm example and shortening rejection; marker Move/Delete; multiple spans; errors localized at the responsible marker.
3. **Admitted routes:** analytic polylines/arcs, supported straight corners and closure, with a bounded ordered planner. Port numerical tests independently of the palette. Do not market A03/A04 exploratory sharp curved joins as solved.
4. **Lifecycle:** cancellation and injected write failures; locked layer; deleted source; copy guide/output/both; shared definition independence; document switching; stale outputs after edits with plugin unloaded. Count output references before/after to prove no duplicates.
5. **Physical and scale check:** verify profile/handedness with real tooling and inspect a representative long seam. Add spatial indexing or migrate a proven bottleneck only after measured need; do not introduce a framework in anticipation.

## Verified evidence and limits

- Read-only process/file inspection found running `C:\Program Files\Bricsys\BricsCAD V22 en_US\bricscad.exe`, version **22.2.02**. V21 is also installed; it is not the selected target.
- The running process has `C:\Program Files (x86)\Common Files\OpenDCL\OpenDCL.x64.22.brx` loaded, file/product version **10.1.2.2**. OpenDCL Studio is installed. No installation is needed for this chosen stack.
- Read the sibling `C:\Users\Anthony\Documents\Csvlabel` and GitHub repository using the GitHub connector. Its palette source is `source/CSVLABEL.odcl.json`; callbacks and Xrecord examples are in `CSVLABEL.lsp`. Its README reports native V22 smoke tests; this review did not rerun them.
- Installed `API/dotNet/README.txt` and `CsBrxMgd.csproj` specify **.NET Framework 4.8**; `Commands.cs` contains a WinForms `PaletteSet` example. The [official V22 API overview](https://developer.bricsys.com/bricscad/help/en_US/V22/DevRef/source/dotNET_overview.htm) agrees. A V26/.NET 8 template would be wrong for this host.
- Licensed edition is unverified. Read-only COM probing failed: the unversioned ProgID returned `CO_E_CLASSSTRING`; the registered `.22.0` ProgID returned `MK_E_UNAVAILABLE`. These failures do not establish why COM was unavailable. No drawing commands, plugins or tests were sent to the running host, and no open drawing was modified.
