# Native qualification — 2026-11-07

Host: Windows, BricsCAD Ultimate 22.2.02, OpenDCL 10.1.2.2. All writes used separate drawings under `output/native`; the user's original drawing was not edited.

| Check | Result |
| --- | --- |
| Native geometry: routes, angled/curved corners, reversal, rigid transforms, closure, ranges, rejection and clearance | 1,035 passed |
| Original HTML cases compared with actual native output at all four pitches | 80 match spacing/anchor constraints; 8 declared A03/A04 placement changes; no unexpected failures |
| Connected geometry: corners, T/X, curved crossings, root identity and normalization | 43 passed |
| Independent JavaScript oracle compared with native line/arc fitting | 540 passed |
| DWG generation, injected rollback failures, transforms, saved units, attachments and repair | 59 passed |
| Connected-set merge/split, copies and missing-member recovery | 39 passed |
| Persistent markers, exact CEN/NODE snaps, shared labels and rollback | 38 passed |
| Native MOVE/STRETCH/ERASE, Undo/Redo, palette input save, event bootstrap and failure rollback | 61 passed |
| Native paired COPY and source ownership across model/paper space | 5 passed |
| Thread-tip display, adjusted-spacing notes, inch scaling, tight arcs, visibility, signatures and rollback | 36 passed |
| Existing JavaScript laboratory | 30 core tests, 22 references, 1,637 invariants passed |

Actual palette controls were exercised in BricsCAD: Select, Add landmark, Move, Start, End, Reverse and Generate. Picked inputs survived regeneration. Cancelling selection retained the previous seam. Invalid pitch left inputs and output unchanged.

The [original-axiom audit](AXIOM_AUDIT.md) found and fixed a false rejection of coincident feature anchors caused by floating-point residue. All 11 native suites and the 540-fit oracle were rerun. The older open host also crashed during concurrent automation probes; its cause remains unresolved. Saved drawings were restored. This host failure limits stability claims independently of the passing geometry results.

The corrected **Select landmark** control snapped to an existing pattern-edge endpoint at 16.5 mm; **Re-pick** snapped to an edge crossing at 31.5 mm. The pattern edges were unchanged. Generated stitch centres straddled that crossing at 30 and 33 mm. Cancellation retained the landmark; success and cancellation restored the previous snap mask, including its disabled state. Repeated palette opening and Generate/Undo/Redo passed.

This picker test exposed a host failure: the history listener could invoke LISP during an input save's internal UNDO Begin/End. Version 1.2 skips callbacks while LISP is active; the native probe measured CMDACTIVE=36 during those commands. A fresh process saved the landmark and completed a subsequent LISP evaluation. The event suite now includes this save path with the palette active. First-launch OpenDCL loading was also corrected to load the project before querying its forms. After the original host failure, the untitled drawing was restored from its secured autosave with its two LINE entities; the older demo's recovery copy was retained separately.

The revised palette was exercised for a T connection, circle/line ConnectAll, cancellation, and Remove missing lines. Both crossings were stored with one current shared output. Native centre picking and Escape restored the exact previous OSMODE. Set start moved its saved marker; one Undo and Redo restored the previous and new range. Moving a selected source retained an uncommitted pitch draft and displayed the Generate-needed notice.

Marker synchronization runs synchronously through the managed host event hook. Native MOVE, STRETCH and ERASE shared their Undo operation with marker changes; Redo remained available. An injected failure after writing two helpers restored exact helper geometry, Xrecords and block definitions while retaining the user's earlier source edit. Property/automation edits refresh markers on explicit selection.

After opening the palette once, a new drawing inherited callbacks without APPLOAD. Actual Select and Generate created 11 cuts; MOVE, Undo and Redo updated the source and markers together. The original drawing retained its two entities and unchanged DBMOD value.

The managed bootstrap uses a native command because V22 did not expose newly loaded managed LISP functions reliably to already-open drawings. Its acknowledgment checks the drawing identity. Undo/Redo invokes a separate read-only palette refresh with no database transaction: Disconnect changed 8 outputs to 9 and disabled its button, Undo restored 8 and enabled it, and Redo restored 9 and disabled it again.

Changing pitch from 3 to 4 mm through Generate produced **one Undo step** restoring both old pitch and old output. Redo restored the new pair. Generate after a subsequent Undo used the persisted 3 mm value, without reviving stale palette state.

Repeated AUTOSTITCH calls retained a visible palette. Reopening in either drawing displayed that drawing's saved seam. Switching drawings without reopening, with an uncommitted pitch shown, then clicking Generate changed neither drawing: the palette required a new selection. This checks the shared OpenDCL display against separate per-drawing LISP state.

Four saved examples were closed, reopened and regenerated successfully: straight with a 31.5 mm landmark, closed rectangle, tangent line/arc/line, and circle. Reciprocal links remained current before regeneration. Paired native COPY remapped the links and regenerated independently of the original.

A connected T with its primary source erased was saved and reopened. Both the surviving source and old output remained selectable; explicit repair produced a current independent line without requiring Undo.

The final eight-example drawing reopened with all 12 sources and 12 marker sets current. All eight outputs regenerated successfully, including separate-line corners, T/X and circle/line crossings.

The standalone package loaded in a fresh drawing using its own folder. The actual unitless-drawing prompt accepted Millimetres, Generate created 11 openings, and the stored 1.0 mm/unit conversion remained readable after clearing the session's units choice.

The final package was checked again through actual Select and Generate controls: 11 cuts, current output, and source/marker positions restored by MOVE, Undo and Redo. A separate fresh hidden BricsCAD process then loaded the packaged `Autostitch.Events.dll` version 1.1, regenerated a saved source, and moved its markers through the native event callback. The process exited after testing its isolated drawing; no development assembly was required.

One automated replay in the long-running development session missed the expected Redo result. It did not reproduce in direct comparisons, a fresh process, or subsequent complete event runs. The runner now requires three consecutive idle observations and records actual coordinates on failure. Timing is a possible cause, not a proven diagnosis.

Measured solver times: 101 openings ≈16 ms; 334 ≈15 ms; 1,001 ≈172 ms. These are single-run host measurements, not performance guarantees. Every seam has a hard 2,000-opening cap; oversized requests fail without truncated output.

The display update passed all **12 native suites: 1,255 assertions**. Actual **Show stitches** and **Spacing notes** clicks changed their drawing layers immediately; native Undo/Redo restored both visibility and checkbox state. Saving and reopening retained both display choices and current output. Notes identify actual direct/chord spacing, mark both bounding slits, and exclude derived corner-hole gaps. Reversed lines and small-radius arc brackets were inspected in BricsCAD. Arc brackets use exact outward circular segments. Editing markers can overlap notes on crowded geometry; `AUTOSTITCH_UI` can be hidden for inspection and is nonplotting. There is no automatic annotation collision layout.

## Repeat

Create and save a disposable `output/native/Autostitch-native.dwg`, then run:

```powershell
./tests/run-suites.ps1
./tests/run-events.ps1
node tests/build-native-oracle.mjs
./tests/run-native.ps1 -ScriptPath ./output/native/geometry-oracle.lsp
Get-Content ./output/native/geometry-oracle.txt
```

The harness refuses drawings outside `output/native`. Tests intentionally create entities in that drawing. `tests/create-demo.lsp` can recreate the demonstration in an empty drawing after loading `AUTOSTITCH.lsp`.

## Remaining limits

- Tested on this V22 host; other versions and operating systems are unqualified.
- WCS XY at Z=0 only; source types LINE, ARC, CIRCLE and LWPOLYLINE.
- Changed polyline attachments require explicit repair when correspondence cannot be proved.
- Overlapping source geometry must be trimmed before connecting, even when active ranges partition the overlap. Ambiguous edited intersections require Disconnect/Connect repair.
- Native copy ownership was qualified within one DWG; cross-DWG scaled insertion is unqualified.
- Native edits issued inside other LISP routines refresh markers on selection; the listener avoids re-entering an active interpreter.
- Physical slit width, retained-material margin, leather behavior and tool-body access were not measured. The visible unverified-profile warning is intentional.
- No automatic regeneration, obstruction pairing, guaranteed mirrored correction patterns, or rigid multi-tooth placement on arbitrary curves.
- Core fit/clearance tests do not establish universal visual preference; stitched sample comparison is still needed.
