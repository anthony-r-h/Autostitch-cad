# Original-rule audit

Reference: ten original axioms in `STITCH_MODEL.md` at commit `4c3cda7`; 22 original cases at pitches 2.7, 3, 3.38 and 3.85 mm. Current rules are in [axioms](../docs/AXIOMS.md); reproducible cases are in [cases.json](cases.json).

The original comparison found 80 runs matching spacing and anchor constraints, plus eight deliberate A03/A04 hole-placement changes. There were no unexpected failures. Central correction placement differs where applicable.

## Trace

| Rule | Native implementation and evidence |
| --- | --- |
| A1: ordered open/closed route | `ast:g-range`, `ast:g-normalize`, `ast:g-solve`; interval counts, reversal and closure. |
| A2: fixed local slit shape | `ast:g-slit`; independent exported-axis and dimension measurements. |
| A3: direct pitch | Actual centre distances by interval kind; circular pitch checked as chord distance. |
| A4: landmark gap | Required centres checked around the reference station; no hole at the reference. |
| A5: reservations first | Fixed corner neighbours and landmark pairs; S04/J06 protected intervals. |
| A6: minimum corrections | 540 native fits against an independent selector; selector checked against 8,215 exhaustive count/block cases. |
| A7: bounded adjustment | Exported gaps within 10%; protected gaps unchanged. |
| A8: fixed anchors and closure reuse | L01/L02 fixed-prefix reservations; closure emits one start opening. CAD Generate recomputes the complete set. |
| A9: direct construction | Bounded count selection; analytic intersections; no farther-root rescue. |
| A10: failure preserves constraints | F05/J05 rejection; adapter rollback and retained prior output. |

S04/J06 protections and L01/L02 committed prefixes are equivalent fixed reservations in the test adapter. They do not imply separate CAD editing commands.

## Deliberate rule changes

- A03/A04: virtual slit tips now meet at the round hole. The original experiment placed the hole at the guide vertex. The eight differences are identified, not counted as original-rule matches.
- Correction blocks now prefer the centre of each free span.
- Exact opening footprints replaced the conservative length-only guard.
- Shared T/X holes are an added branch rule, covered by the connected-geometry suite.

Straight-corner checks cover 112 pitch/handedness/turn combinations. Curved-corner checks cover 48 line/arc, arc/line and arc/arc combinations, plus reversal and rigid transforms. The solver's tiny-span regression is covered: arithmetic residue around `4.44e-16 mm` is treated as zero, while a real `1e-8 mm` span still rejects.

## Reproduce

With a disposable `output/native/Autostitch-native.dwg` open:

```powershell
node tests/build-gallery-parity.mjs
./tests/run-native.ps1 -ScriptPath ./output/native/gallery-native.lsp
./tests/run-native.ps1 -ScriptPath ./output/native/gallery-free-corners.lsp
node tests/build-gallery-parity.mjs --report
```

The generated [comparison](../output/native/gallery-parity.html) shows original and actual native output at the same scale. The report rejects missing/duplicate records and unexpected differences. Original comparison: 1,204 checks, 1,196 passes and eight declared differences.

Current run status: [qualification](QUALIFICATION.md). All uncertainty is recorded in [limits](../docs/LIMITS.md).
