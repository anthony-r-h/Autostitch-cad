# Native qualification — 2026-11-06

Host: Windows, BricsCAD Ultimate 22.2.02, OpenDCL 10.1.2.2. All writes used separate drawings under `output/native`; the user's original drawing was not edited.

| Check | Result |
| --- | --- |
| Native geometry: routes, corners, closure, ranges, rejection and clearance | 54 passed |
| Independent JavaScript oracle compared with native line/arc fitting | 540 passed |
| DWG generation, injected rollback failures, transforms, units, attachments and repair | 56 passed |
| Native paired COPY and source ownership across model/paper space | 5 passed |
| Existing JavaScript laboratory | 30 core tests, 22 references, 1,637 invariants passed |

Actual palette controls were exercised in BricsCAD: Select, Add landmark, Move, Start, End, Reverse and Generate. Picked inputs survived regeneration. Cancelling selection retained the previous seam. Invalid pitch left inputs and output unchanged.

Changing pitch from 3 to 4 mm through Generate produced **one Undo step** restoring both old pitch and old output. Redo restored the new pair. Generate after a subsequent Undo used the persisted 3 mm value, without reviving stale palette state.

Repeated AUTOSTITCH calls retained a visible palette. Reopening in either drawing displayed that drawing's saved seam. Switching drawings without reopening, with an uncommitted pitch shown, then clicking Generate changed neither drawing: the palette required a new selection. This checks the shared OpenDCL display against separate per-drawing LISP state.

Four saved examples were closed, reopened and regenerated successfully: straight with a 31.5 mm landmark, closed rectangle, tangent line/arc/line, and circle. Reciprocal links remained current before regeneration. Paired native COPY remapped the links and regenerated independently of the original.

The standalone package loaded in a fresh drawing using its own folder. The actual unitless-drawing prompt accepted Millimetres, Generate created 11 openings, and the stored 1.0 mm/unit conversion remained readable after clearing the session's units choice.

Measured solver times: 101 openings ≈16 ms; 334 ≈15 ms; 1,001 ≈172 ms. These are single-run host measurements, not performance guarantees. Every seam has a hard 2,000-opening cap; oversized requests fail without truncated output.

## Repeat

Create and save a disposable `output/native/Autostitch-native.dwg`, then run:

```powershell
./tests/run-suites.ps1
node tests/build-native-oracle.mjs
./tests/run-native.ps1 -ScriptPath ./output/native/geometry-oracle.lsp
Get-Content ./output/native/geometry-oracle.txt
```

The harness refuses drawings outside `output/native`. Tests intentionally create entities in that drawing. `tests/create-demo.lsp` can recreate the demonstration in an empty drawing after loading `AUTOSTITCH.lsp`.

## Remaining limits

- Tested on this V22 host; other versions and operating systems are unqualified.
- WCS XY at Z=0 only; source types LINE, ARC, CIRCLE and LWPOLYLINE.
- Changed polyline attachments require explicit repair when correspondence cannot be proved.
- Physical slit width, retained-material margin, leather behavior and tool-body access were not measured. The visible unverified-profile warning is intentional.
- No automatic regeneration, obstruction pairing, guaranteed mirrored correction patterns, or rigid multi-tooth placement on arbitrary curves.
- Core fit/clearance tests do not establish universal visual preference; stitched sample comparison is still needed.
