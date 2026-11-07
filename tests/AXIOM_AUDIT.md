# Axiom coverage

Rules: [axioms](../docs/AXIOMS.md). Reusable inputs and test identities: [cases.json](cases.json).

| Rule | Implementation and evidence |
| --- | --- |
| A1: guide geometry and order | `ast:g-range`, `ast:g-normalize`, `ast:g-solve`; interval counts, reversal, closure and redundant-subdivision checks. |
| A2: fixed local slit shape | `ast:g-slit`; independent exported-axis and dimension measurements. |
| A3: direct pitch | Actual centre distances by interval kind; circular pitch checked as chord distance. |
| A4: landmark gap | Required centres checked around the reference station; no hole at the reference. |
| A5: fixed features | Fixed corner neighbours and landmark pairs; S04/J06 protected intervals and L01/L02 fixed reservations. |
| A6: sharp corners | Independent virtual-tip reconstruction; straight/curved corner matrices and finite-arm checks. |
| A7: bounded adjustment | Exported ordinary gaps within $\pm10\%$; protected gaps unchanged. |
| A8: shared openings | Smooth joins, closure reuse, connected identity and conflicting-opening rejection. |
| A9: branches | T/X shared holes; nominal neighbours on straight and circular arms; adjacent branch-node cases. |
| A10: clearance | Finite slit/disk pair distances, positive width/margin checks and whole-set collision rejection. |

Solution-policy checks cover minimum corrections, central placement and deterministic ties: 540 native fits against an independent selector, checked against 8,215 exhaustive count/block cases. F05/J05 reject infeasible spans. Corner checks reject ambiguous roots and do not rescue a failed construction with a farther root.

Straight-corner checks cover 112 pitch/handedness/turn combinations. Curved-corner checks cover line/arc, arc/line and arc/arc combinations, plus reversal and rigid transforms. T/X sharing is covered by the connected-geometry suite.

The tiny-span regression is covered: arithmetic residue around $4.44\times10^{-16}\,\mathrm{mm}$ is treated as zero, while a real $10^{-8}\,\mathrm{mm}$ span still rejects.

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
