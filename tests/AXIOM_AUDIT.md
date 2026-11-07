# Axiom coverage

Rules: [axioms](../docs/AXIOMS.md). Reusable inputs and test identities: [cases.json](cases.json).

| Rule | Implementation and evidence |
| --- | --- |
| A1: guide geometry and order | `ast:g-range`, `ast:g-normalize`, `ast:g-solve`; gap counts, reversal, closure and redundant-subdivision checks. |
| A2: fixed local slit shape | `ast:g-slit`; independent exported-axis and dimension measurements. |
| A3: direct pitch | Actual centre distances by gap type; circular pitch checked as chord distance. |
| A4: landmark gap | Required centres checked around the reference station; no hole at the reference. |
| A5: fixed features | Fixed corner neighbours and landmark pairs; S04/J06 protected gaps and L01/L02 fixed opening positions. |
| A6: sharp corners | Independent virtual-tip reconstruction; straight/curved corner matrices, finite-arm checks and bounded corner-step adjustment. The reported shallow corner is catalogued with its exact coordinates. |
| A7: bounded adjustment | Exported slit-to-slit gaps within $\pm10\%$; protected gaps unchanged. |
| A8: shared openings | Smooth joins, closure reuse, connected identity and conflicting-opening rejection. |
| A9: three or more arms | T/X shared holes; nominal neighbours on straight and circular arms; adjacent junction cases. |
| A10: clearance | Finite slit/disk pair distances, positive width/margin checks and whole-set collision rejection. |

Solution-policy checks cover fewest adjusted gaps, central placement and deterministic ties: 540 native fits against an independent selector, checked against 8,215 exhaustive count/block cases. F05/J05 reject infeasible spans. Corner checks reject ambiguous roots and do not rescue a failed construction with a farther root.

Straight-corner checks cover 112 pitch/handedness/turn combinations. Curved-corner checks cover line/arc, arc/line and arc/arc combinations, plus reversal and rigid transforms. T/X sharing is covered by the connected-geometry suite.

Corner-step regressions cover nearest-to-nominal placement, the adjustment boundary, disabled adjustment, curved contraction, zero-length free spans and reversed guide selection. Display checks require `I` marks on the adjusted real slit. Guide-workflow checks separate saved connections from generated output.

The earlier curved matrix used turns of $\pm45^\circ$, $\pm90^\circ$ and $\pm135^\circ$; it missed the shallow placement boundary. New geometry rules need tests on both sides of their limits, including mixed curves and connected guides. A solver accepting a case is not itself evidence that the case is valid.

Shallow coverage now includes:

- **J07–J10:** the reported straight corner, line/arc, arc/line and arc/arc, each at four pitches. Independent analytic positions and chord steps distinguish nominal, adjusted and rejected cases.
- **GEO-SHALLOW-CURVES:** sixteen winding/turn combinations at $\pm21.5^\circ$, plus short-arm, clearance and lower adjustment-boundary checks.
- **NET-SHALLOW-CORNERS:** separate guides agree with the single route, including reversed selection and an over-limit rejection.
- **NET-SHALLOW-BRANCHES:** straight T/X junctions at $5^\circ$ and $15^\circ$; curved T junctions at $14^\circ$ with both windings. Passing cases preserve nominal first chords; failing cases reject clearance.

The tiny-span regression is covered: arithmetic residue around $4.44\times10^{-16}\,\mathrm{mm}$ is treated as zero, while a real $10^{-8}\,\mathrm{mm}$ span still rejects.

## Reproduce

With a disposable `output/native/Autostitch-native.dwg` open:

```powershell
node tests/build-gallery.mjs
./tests/run-native.ps1 -ScriptPath ./output/native/gallery-native.lsp
./tests/run-native.ps1 -ScriptPath ./output/native/gallery-free-corners.lsp
node tests/build-gallery.mjs --report
```

The gallery checks 26 cases at four pitches and renders the native results, including virtual slits and adjustment marks. All 1,702 checks pass across 104 case variants plus eight fixed-range runs for curved corners. Missing, duplicate or extra records and solver exceptions fail validation.

Run status: [qualification](QUALIFICATION.md). Uncertainties: [limits](../docs/LIMITS.md).
