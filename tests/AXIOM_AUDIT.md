# Axiom coverage

Rules: [axioms](../docs/AXIOMS.md). Reusable inputs and test identities: [cases.json](cases.json).

| Rule | Implementation and evidence |
| --- | --- |
| A1: ordered open/closed route | `ast:g-range`, `ast:g-normalize`, `ast:g-solve`; interval counts, reversal and closure. |
| A2: fixed local slit shape | `ast:g-slit`; independent exported-axis and dimension measurements. |
| A3: direct pitch | Actual centre distances by interval kind; circular pitch checked as chord distance. |
| A4: landmark gap | Required centres checked around the reference station; no hole at the reference. |
| A5: reservations first | Fixed corner neighbours and landmark pairs; S04/J06 protected intervals. |
| A6: minimum corrections | 540 native fits against an independent selector; selector checked against 8,215 exhaustive count/block cases. |
| A7: bounded adjustment | Exported gaps within 10%; protected gaps unchanged. |
| A8: fixed anchors and closure reuse | L01/L02 fixed reservations; closure emits one start opening. Generate recomputes the complete set. |
| A9: direct construction | Bounded count selection; analytic intersections; no farther-root rescue. |
| A10: failure preserves constraints | F05/J05 rejection; adapter rollback and retained prior output. |

Straight-corner checks cover 112 pitch/handedness/turn combinations. Curved-corner checks cover line/arc, arc/line and arc/arc combinations, plus reversal and rigid transforms. T/X sharing is covered by the connected-geometry suite.

The tiny-span regression is covered: arithmetic residue around `4.44e-16 mm` is treated as zero, while a real `1e-8 mm` span still rejects.

## Reproduce

With a disposable `output/native/Autostitch-native.dwg` open:

```powershell
node tests/build-gallery.mjs
./tests/run-native.ps1 -ScriptPath ./output/native/gallery-native.lsp
./tests/run-native.ps1 -ScriptPath ./output/native/gallery-free-corners.lsp
node tests/build-gallery.mjs --report
```

The gallery checks 22 cases at four pitches and renders the native results. All 1,284 checks pass across 88 case variants plus eight fixed-range runs for curved corners. Missing, duplicate or extra records and solver exceptions fail validation.

Run status: [qualification](QUALIFICATION.md). Uncertainties: [limits](../docs/LIMITS.md).
