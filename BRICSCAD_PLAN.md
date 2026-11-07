# BricsCAD implementation plan

The AutoLISP/OpenDCL plugin includes independent and explicitly connected stitch paths. [STITCH_MODEL.md](STITCH_MODEL.md) owns geometry; [PHYSICAL_RULES.md](PHYSICAL_RULES.md) owns physical claims. Implementation and qualification are separate; use [README.md](README.md) for operation and [verification results](tests/QUALIFICATION.md) for tested behavior.

## Current implementation status

`AUTOSTITCH.lsp` loads the geometry, connected-path solver, DWG adapter, saved markers and palette callbacks from `source`; `AUTOSTITCH.odcl` is the compiled palette. Controls include Select stitch line, Connect stitch lines, Disconnect line, Save pitch, Set start/end, Reset range, Reverse direction, Add/Move/Delete gap, Generate cuts and Restore cut position. Set start/end follow the displayed traversal direction; closed lines use Set start for phase. Saved nonplotting markers provide native NODE/CEN snaps.

The solver supports line/arc routes and explicit connections between separate sources, including corners, T junctions and crossings. Range picks, nominal gap reservations and all distinct emitted cuts are validated across the complete connected set. Extraction accepts LINE, ARC, CIRCLE and LWPOLYLINE in WCS XY at Z=0 with a positive Z normal; arbitrary drawing planes are not implemented. Unitless drawings require an explicit millimetre/inch choice.

The connected workflow and automatic marker updates have passed native checks in BricsCAD V22.2 with OpenDCL 10.1.2.2, including actual palette picks, saved deleted-member recovery, native edit Undo/Redo and failure rollback. [Verification results](tests/QUALIFICATION.md) record the evidence and remaining limits; physical qualification is still open.

Attachment correspondence is deliberately conservative: changed polylines with landmarks or range picks can require clearing/re-picking those attachments. Polylines without attachments can regenerate after edits. The current fixed profile is 1.5 mm slits, 0.5 mm holes and 40° lean; tool width and retained-material margin are uncalibrated. Physical clearance remains unverified, and curved or corrected runs may require individual placement.

## Target and stack

**AutoLISP + OpenDCL, with a small managed event bridge, on Windows BricsCAD V22.** The qualification host is version 22.2.02 with OpenDCL 10.1.2.2. The palette follows the adjacent [Csvlabel](https://github.com/anthony-r-h/Csvlabel) project's callback, palette-source and packaging patterns.

The bounded geometry remains pure AutoLISP, separate from CAD reads/writes and palette callbacks. `Autostitch.Events.dll`, placed beside the main LISP, bridges native command completion to marker synchronization through BricsCAD V22's built-in .NET support. It is not a geometry solver or external package dependency. Ship the DLL, loadable LISP, compiled `.odcl` and `source` together; retain editable palette and bridge source. No Node subprocess, browser UI, external solver or custom cut entity is required.

## Normal workflow

One `AUTOSTITCH` command opens a compact palette:

```text
[Select stitch line] [Generate cuts]
Pitch [3 mm]        [Save pitch]
[Set start] [Set end] [Reset range]
[Reverse direction]
[Connect stitch lines] [Disconnect line]
Gaps: Add / Move / Delete
Selected line + short status
```

1. Select a supported guide. Show its highlight, endpoint markers, direction arrow and derived junction markers. An open guide defaults to its two endpoints; a new closed guide uses the selection pick as its explicit start phase.
2. Add a gap only where a centred nominal gap is intended. Connect stitch lines is a separate declaration of shared openings: select another source or output; one new intersection connects directly, while multiple required intersections offer ConnectAll or Cancel. The count includes every member of the merged set. Unselected drawing geometry has no effect.
3. Generate cuts. Calculate and validate the complete candidate before replacing output. Every connected member retains its own pitch, range, direction and gap inputs; its physical slit/hole profile must agree with the others.
4. Select any member source, its saved markers or the linked output to reopen the work. A source selection edits that member's inputs; Generate updates the whole connected set. Edit original sources with normal CAD tools and generate again.
5. Disconnect line removes that member's connections and regenerates the resulting components. A missing source changes the action to Remove missing lines: retain surviving connections, choose a surviving primary when necessary, and solve all components before replacing cuts.

Default pitch is provisionally 3 mm, then the last choice; an existing seam always restores its own value. Tool/process setup is done once and remains outside the normal seam controls. Show `Physical clearance unverified` when calibration is absent, while still permitting ideal geometry.

Corners within a source derive from normalized geometry. Explicit source-to-source connections persist as source/primitive attachments. Two-arm treatment depends on geometry, not CAD entity boundaries; T and X nodes emit one shared round opening. Lost or ambiguous connection correspondence requires disconnecting the affected line and connecting it again. Raw sources that overlap for a positive length must be trimmed before connection, even if their selected ranges are adjacent.

Use native snaps/picking. Drawing callbacks use OpenDCL's command-context `EventInvoke=1`; initialize callbacks per document and clear selection on document switch ([event context](https://www.opendcl.com/HelpFiles/ENU/Reference/Property/EventInvoke.htm), [lifecycle](https://www.opendcl.com/HelpFiles/ENU/Concepts/Modality.htm)). Input markers are ordinary saved helper blocks on nonplotting `AUTOSTITCH_UI`, with exact POINT and circle centres. They are separate from physical cut entities and survive palette closure, redraw and save/reopen.

## Source, attachments and edits

The actual source entity remains authoritative on its original layer. Read analytic geometry and convert declared units to mm; unitless drawings need one explicit units choice. Normalize in a local plane and transform points, tangents, directions and parity consistently. Never read SVG samples or explode the source for geometry extraction.

| Attachment | Meaning after an edit |
| --- | --- |
| Default endpoint | Follows the same semantic endpoint. |
| Picked guide vertex | Follows that vertex only while sequence correspondence is established. |
| Interior line/arc point | Owning primitive plus fixed physical distance from its original start; not a proportional fraction. |
| Landmark picked at another object's crossing | Attached to the guide only; no implied association with the other object. |
| Explicit shared intersection | Same source primitives and selected analytic root; recompute from live geometry, with a correspondence check before accepting edits. |

Example: extend a 30 mm line to 40 mm at its end. A landmark at 16.5 mm stays 16.5 mm; it does not become 22 mm. Shorten below 16.5 mm: mark invalid and require repair. Moving the owning start moves a distance-attached landmark; show the updated marker before generation. Tool Reverse changes traversal, not the stored geometric attachment.

Store the previous analytic primitive sequence to validate attachments. Same topology plus demonstrable endpoint/vertex correspondence permits stretching. Inserted/deleted/reordered vertices, native entity reversal, primitive-type changes or ambiguous correspondence require affected markers to be re-picked. Never use nearest-point reassignment or silently clamp a station. A redundant collinear/co-circular split can normalize away if correspondence is proven.

Changing a source or its inputs makes the complete connected output stale; it does not immediately rewrite holes. Detect this on selection/open/Generate, including edits made with the plugin unloaded. The event bridge synchronizes markers after ordinary native commands such as MOVE, STRETCH and ERASE, including Undo/Redo. Property-palette and direct COM changes refresh on selection; automatic coverage of those edits is not claimed. Marker/input writes remain undoable. Cut regeneration stays an explicit command, and a failed Generate retains inputs and the last successful output.

## Output and minimum persistence

One ordinary block reference per independent path or connected set on `AUTOSTITCH`; each physical slit LINE and hole CIRCLE is also on that layer. Shared openings exist once in the combined cut list. Use a new definition for each successful revision, e.g. `AUTOSTITCH_0001_R2`. Keep all original sources outside the block. The 2,000-opening limit applies to the whole set.

Use versioned Xrecords on the guide and output reference. Object links use actual DWG reference fields, not serialized handle strings. Keep metadata off shared block definitions.

| Record | Contents |
| --- | --- |
| Guide definition | Schema/rule version, seam ID, output reference, units/plane, pitch and saved profile/process values, direction/closed state, user start/end overrides and landmark attachments. |
| Connected primary | Ordered native source references and explicit connection attachments; each member retains its own input record and reciprocal primary pointer. |
| Last successful generation | Revision, exact analytic source/input snapshot, expected output placement transform. |
| Output reference | Reciprocal primary reference, identity, revision, content signature, native member references and compact connection backup for missing-primary recovery. |

The physical cuts are already DWG entities; no duplicate full opening list is stored. Exact numeric data uses native double fields. Source-member slots survive erased references so save/reopen cannot change connection indexes. The output backup contains topology, while source snapshots remain on canonical source records. Unknown schema/rule versions open read-only; existing independent records retain their rule. Missing members expose an editable repair state and block Generate. Remove missing lines explicitly prunes deleted incidences and repairs surviving components; reads never silently remove members or recreate a deleted source from a snapshot.

## Complete replacement and Undo

1. Read/validate inputs, attachments, source/output association and physical units. Solve and validate **everything in memory**. On failure, retain existing output; a diagnostic prefix is never committed as a complete seam.
2. In command context, with usable Undo, begin one Undo group. Stage a fresh unique block definition; check every entity and metadata write.
3. Reassign the set's output reference to that definition, creating its first reference if needed. Write matching metadata for every source and the output, then update markers. Connect retires superseded independent output references inside the same transaction; Disconnect/repair may create several pre-solved components. Retain old definitions while referenced.
4. On any write failure, explicitly roll back this generation group and restore editor settings. Report the real error. A successful Generate is one Undo operation; prior source edits remain earlier operations.

**An Undo mark is not a transaction.** Inject failures after geometry creation and during each association update; prove rollback in V22 before calling this writer atomic. If rollback cannot be guaranteed, reject Generate before writing. Never invoke the writer from a reactor or asynchronous palette callback.

## Copies, movement and correspondence

| Operation | Required result |
| --- | --- |
| Copy output only | Static geometry. A nonreciprocal link cannot authorize editing the original seam. |
| Copy guide only | New independent seam identity on first edit/Generate; no inherited output to overwrite. |
| Copy all connected sources and output | Preserve editability only when every native reference remaps reciprocally. Assign a new identity on generation. Partial copies cannot acquire authority over uncopied originals. |
| Regenerate a native copy sharing a definition | Assign a fresh definition to that reference; never modify the shared definition. |
| Move/rotate guide only | Stale output. Regenerate from current source. |
| Move/rotate all sources and output together | Recognize their common rigid placement across every member and retain generation revision. |
| Move output only | Explicit Restore from guide or Detach; no silent snap on Generate. |
| Scale physical geometry | Requires regeneration with declared units/profile; never silently scale pitch, slit length or diameter. |
| Mirror | Static transformed cuts are possible; editable reflected punching-face semantics remain outside the first release. |
| BEDIT/explode generated output | Unsupported manual alteration/detachment. Regeneration from a valid guide replaces generated content. |

For common movement, compute `delta=liveOutputTransform * inverse(savedOutputTransform)`. Accept it only when it is rigid and current guide/attachments equal `delta` applied to the saved source. Otherwise use the source-edit/output-only cases above. Symmetric geometry can make correspondence ambiguous: require explicit repair, not proximity matching. Rigid placement alone does not increment geometry revision.

Manual changes inside generated blocks cannot be assumed absent. On tool inspection, compare generated entity types/coordinates with the last accepted recipe and its rule version, or a saved content signature. Mark mismatches; replace them only through explicit Generate. Normal CAD plotting remains possible without the plugin.

## Implementation order and acceptance gates

| Stage | Work and proof required before proceeding |
| --- | --- |
| 1. LINE slice | Port straight fit/placement and profile validation into pure LISP functions. Select, default endpoints, Generate one block, change length, regenerate, save/reopen, Undo/Redo. Measure actual pitch/slit length in V22. |
| 2. Landmarks | Typed attachment records, multiple reserved spans, localized failure; verify 30-to-40 mm extension, shortening failure, Reverse and marker Move/Delete. |
| 3. Ordered line/arc routes | One normalized planner, chord fits, shared smooth joins, bounded sharp-junction candidates, closure and whole-route finite-cut checks. Port independent oracle/fixture results; show honest unsupported cases. |
| 4. Lifecycle qualification | Inject write failures; cancellation, locked layer, deleted source, copied guide/output/both, common transforms, shared definitions, multiple documents and edits while plugin unloaded. Count output references to rule out duplicates. |
| Connected workflow | Separate-LINE corner equivalence, T/X, multiple-crossing ConnectAll, per-member inputs, global clearance, atomic merge/split, full/partial copies and deleted-primary recovery after save/reopen. |
| Saved marker workflow | Native NODE/CEN snaps, command-driven movement/edit/deletion, Undo/Redo, source/output selection, palette closure, reopen, orphan cleanup and explicit property-edit fallback. |
| 5. Physical qualification and packaging | Run the coupons in PHYSICAL_RULES, inspect one real pattern and a representative long seam, record supported profile/version, ship loadable files plus brief usage instructions. |

Stages 1-2 establish the usable editing loop. Do not port every gallery shape before testing that loop. Do not claim general line/arc support until stage 3 passes. Benchmark before adding spatial indexing, custom entities, background work or a different runtime.

**Later imprints:** copy the successfully generated master openings by explicit rigid registration, optionally reflection once face convention is settled; never solve each destination independently. Store source revision, destination placement and opening correspondence together. Keep stable local frames so moving the master around the sheet does not move an imprint. Source changes mark it stale; explicit refresh updates geometry and correspondence. Same-DWG first; no inference of assembled layers or leather deformation.

## Initial host inspection (historical)

Read-only inspection on 2026-11-06 found V22.2.02 running, OpenDCL 10.1.2.2 loaded, OpenDCL Studio installed, and the sibling Csvlabel source/compiled palette. Its README reports native V22 tests; those were not rerun here. Installed `API/dotNet` samples independently confirm Framework 4.8.

During that initial read-only inspection, the licensed edition was unverified. COM probes returned `CO_E_CLASSSTRING` for the unversioned ProgID and `MK_E_UNAVAILABLE` for `.22.0`; the cause was not established. No drawing commands or plugin code were sent during that inspection. Later implementation work ran native checks in a separate test drawing, as distinguished in the current status above.
