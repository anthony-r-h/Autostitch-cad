# BricsCAD implementation plan

Accepted design, not an implemented plugin. [STITCH_MODEL.md](STITCH_MODEL.md) owns geometry; [PHYSICAL_RULES.md](PHYSICAL_RULES.md) owns physical claims.

## Target and stack

**Use AutoLISP + the existing OpenDCL palette on Windows BricsCAD V22.** The running executable is version 22.2.02; `OpenDCL.x64.22.brx` version 10.1.2.2 is loaded. Reuse the adjacent [Csvlabel](https://github.com/anthony-r-h/Csvlabel) project's callback, palette-source and packaging patterns.

The bounded line/arc mathematics does not require C# or BRX. Keep pure geometry functions separate from CAD reads/writes and palette callbacks. No Node subprocess, browser UI, external solver or custom entity. Ship loadable LISP and compiled `.odcl`; retain editable palette source. The installed .NET alternative targets **Framework 4.8**, not .NET 8 ([V22 documentation](https://developer.bricsys.com/bricscad/help/en_US/V22/DevRef/source/dotNET_overview.htm)); it has no present advantage sufficient to justify another stack.

## Normal workflow

One `AUTOSTITCH` command opens a compact palette:

```text
[Select guide]       Pitch [3 mm]
[Add landmark]       [Generate]
Start / End / Reverse                 (secondary actions)
Selected seam + short status
```

1. Select a supported guide. Show its highlight, endpoint markers, direction arrow and derived junction markers. An open guide defaults to its two endpoints; a closed guide asks for one start/phase pick.
2. Pick landmarks only where a centred nominal gap is intended. Selecting a landmark offers Move/Delete. Other drawing intersections have no effect.
3. Generate. Calculate the entire candidate, show errors at their features, then create or replace that seam's output. Live preview can follow the first working slice; it must not add another compulsory confirmation.
4. Later select either the guide or its linked output to reopen the same inputs. Edit the original guide with normal CAD tools, then Generate again.

Default pitch is provisionally 3 mm, then the last choice; an existing seam always restores its own value. Tool/process setup is done once and remains outside the normal seam controls. Show `Physical clearance unverified` when calibration is absent, while still permitting ideal geometry.

Junctions derive from normalized guide geometry. Do not make users mark every corner or store a second authoritative junction list. A derived marker identifies rejected/unsupported joins and conflicting landmark reservations.

Use native snaps/picking. Drawing callbacks use OpenDCL's command-context `EventInvoke=1`; initialize callbacks per document and clear selection on document switch ([event context](https://www.opendcl.com/HelpFiles/ENU/Reference/Property/EventInvoke.htm), [lifecycle](https://www.opendcl.com/HelpFiles/ENU/Concepts/Modality.htm)). Input markers, correction dimensions and individual-placement warnings are nonplotting overlays, **not extra cut entities**.

## Source, attachments and edits

The actual source entity remains authoritative on its original layer. Read analytic geometry and convert declared units to mm; unitless drawings need one explicit units choice. Normalize in a local plane and transform points, tangents, directions and parity consistently. Never read SVG samples or explode the source for geometry extraction.

| Attachment | Meaning after an edit |
| --- | --- |
| Default endpoint | Follows the same semantic endpoint. |
| Picked guide vertex | Follows that vertex only while sequence correspondence is established. |
| Interior line/arc point | Owning primitive plus fixed physical distance from its original start; not a proportional fraction. |
| Landmark picked at another object's crossing | Attached to the guide only; no implied association with the other object. |

Example: extend a 30 mm line to 40 mm at its end. A landmark at 16.5 mm stays 16.5 mm; it does not become 22 mm. Shorten below 16.5 mm: mark invalid and require repair. Moving the owning start moves a distance-attached landmark; show the updated marker before generation. Tool Reverse changes traversal, not the stored geometric attachment.

Store the previous analytic primitive sequence to validate attachments. Same topology plus demonstrable endpoint/vertex correspondence permits stretching. Inserted/deleted/reordered vertices, native entity reversal, primitive-type changes or ambiguous correspondence require affected markers to be re-picked. Never use nearest-point reassignment or silently clamp a station. A redundant collinear/co-circular split can normalize away if correspondence is proven.

Changing the guide/inputs makes old output stale; it does not immediately rewrite holes. Detect this on selection/open/Generate, including edits made with the plugin unloaded. There is no reactor-driven regeneration in the first version. Marker edits and committed pitch changes are their own Undo steps; a failed Generate retains those inputs and the last successful output.

## Output and minimum persistence

One ordinary block reference per seam on `AUTOSTITCH`; each physical slit LINE and hole CIRCLE is also on that layer. Use incrementing seam names with a new definition for each successful revision, e.g. `AUTOSTITCH_0001_R2`. Keep the user's guide outside the block. Blocks contain the per-hole entities; they reduce selection clutter, not the actual entity count.

Use versioned Xrecords on the guide and output reference. Object links use actual DWG reference fields, not serialized handle strings. Keep metadata off shared block definitions.

| Record | Contents |
| --- | --- |
| Guide definition | Schema/rule version, seam ID, output reference, units/plane, pitch and saved profile/process values, direction/closed state, user start/end overrides and landmark attachments. |
| Last successful generation | Revision, exact analytic source/input snapshot, expected output placement transform. |
| Output reference | Reciprocal guide reference, seam ID, generation revision. |

The physical cuts are already DWG entities; no duplicate full opening list is needed initially. Derived junctions/preview graphics are recalculated. Unknown schema/rule versions open read-only until an explicit migration; do not regenerate them under new rules automatically. Missing source means detached/stale output, never silent replacement by a snapshot.

## Complete replacement and Undo

1. Read/validate inputs, attachments, source/output association and physical units. Solve and validate **everything in memory**. On failure, retain existing output; a diagnostic prefix is never committed as a complete seam.
2. In command context, with usable Undo, begin one Undo group. Stage a fresh unique block definition; check every entity and metadata write.
3. Reassign only this seam's output reference to that definition, creating its first reference if needed. Write matching source/output generation metadata in the same group. Retain old definitions while referenced.
4. On any write failure, explicitly roll back this generation group and restore editor settings. Report the real error. A successful Generate is one Undo operation; prior source edits remain earlier operations.

**An Undo mark is not a transaction.** Inject failures after geometry creation and during each association update; prove rollback in V22 before calling this writer atomic. If rollback cannot be guaranteed, reject Generate before writing. Never invoke the writer from a reactor or asynchronous palette callback.

## Copies, movement and correspondence

| Operation | Required result |
| --- | --- |
| Copy output only | Static geometry. A nonreciprocal link cannot authorize editing the original seam. |
| Copy guide only | New independent seam identity on first edit/Generate; no inherited output to overwrite. |
| Copy guide and output | Preserve editability only if DWG references remap to a reciprocal pair. Assign a new identity before editing; otherwise create independent output from the copied guide. |
| Regenerate a native copy sharing a definition | Assign a fresh definition to that reference; never modify the shared definition. |
| Move/rotate guide only | Stale output. Regenerate from current source. |
| Move/rotate both together | Recognize their common rigid placement and retain generation revision. |
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
| 5. Physical qualification and packaging | Run the coupons in PHYSICAL_RULES, inspect one real pattern and a representative long seam, record supported profile/version, ship loadable files plus brief usage instructions. |

Stages 1-2 establish the usable editing loop. Do not port every gallery shape before testing that loop. Do not claim general line/arc support until stage 3 passes. Benchmark before adding spatial indexing, custom entities, background work or a different runtime.

**Later imprints:** copy the successfully generated master openings by explicit rigid registration, optionally reflection once face convention is settled; never solve each destination independently. Store source revision, destination placement and opening correspondence together. Keep stable local frames so moving the master around the sheet does not move an imprint. Source changes mark it stale; explicit refresh updates geometry and correspondence. Same-DWG first; no inference of assembled layers or leather deformation.

## Host evidence and limits

Read-only inspection on 2026-11-06 found V22.2.02 running, OpenDCL 10.1.2.2 loaded, OpenDCL Studio installed, and the sibling Csvlabel source/compiled palette. Its README reports native V22 tests; those were not rerun here. Installed `API/dotNet` samples independently confirm Framework 4.8.

Licensed edition remains unverified. Read-only COM probes returned `CO_E_CLASSSTRING` for the unversioned ProgID and `MK_E_UNAVAILABLE` for `.22.0`; the cause was not established. No drawing commands or plugin code were sent to the running host, and no open drawing was modified. Stage 1 must verify the actual writer/UI behavior.
