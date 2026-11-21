# Axiom coverage

Rules: [axioms](../docs/AXIOMS.md). Reusable inputs and test identities: [cases.json](cases.json).

| Rule | Implementation and evidence |
| --- | --- |
| A1: guide geometry and order | `ast:g-range`, `ast:g-normalize`, `ast:g-solve`; gap counts, reversal, closure and redundant-subdivision checks. |
| A2: fixed local slit shape | `ast:g-slit`; independent exported-axis and dimension measurements; STITCH-G checks separate obverse/reverse lean, material face and travel direction. |
| A3: direct pitch | Actual centre distances by gap type; circular pitch checked as chord distance. |
| A4: landmark gap | Required centres checked around the reference station; no hole at the reference. |
| A5: fixed features | Fixed corner neighbours and landmark pairs; S04/J06 protected gaps and L01/L02 fixed opening positions. |
| A6: sharp corners | Independent virtual-tip reconstruction; straight/curved corner matrices, finite-arm checks and bounded corner-step adjustment. The reported shallow corner is catalogued with its exact coordinates. |
| A7: bounded adjustment | Exported slit-to-slit gaps within $\pm10\%$; protected gaps unchanged. |
| A8: shared openings | Smooth joins, closure reuse, connected identity and conflicting-opening rejection. |
| A9: three or more arms | T/X shared holes; half-pitch neighbours on straight and circular arms; adjacent junction cases; reverse-stitch T, five-arm and curved-link regressions. |
| A10: clearance | Finite slit/disk pair distances, positive width/margin checks and whole-set collision rejection. |

Solution-policy checks cover fewest adjusted gaps, central placement and deterministic ties: 540 native fits against a separately implemented JavaScript selector, checked against 8,215 exhaustive count/block cases. The selector and exhaustive enumerator share parameter conversion, candidate construction and ranking functions; this checks search selection, but cannot detect a shared mistake in those functions. F05/J05 reject infeasible spans. Corner checks reject ambiguous roots and do not rescue a failed construction with a farther root.

Straight-corner checks cover 112 pitch/handedness/turn combinations. Curved-corner checks cover line/arc, arc/line and arc/arc combinations, plus reversal and rigid transforms. T/X sharing is covered by the connected-geometry suite.

Corner-step regressions cover nearest-to-nominal placement, the adjustment boundary, disabled adjustment, curved contraction, zero-length free spans and reversed guide selection. Display checks require `I` marks on the adjusted real slit. Guide-workflow checks separate saved connections from generated output.

The earlier curved matrix used turns of $\pm45^\circ$, $\pm90^\circ$ and $\pm135^\circ$; it missed the shallow placement boundary. New geometry rules need tests on both sides of their limits, including mixed curves and connected guides. A solver accepting a case is not itself evidence that the case is valid.

Shallow coverage now includes:

- **J07–J10:** the reported straight corner, line/arc, arc/line and arc/arc, each at four pitches. Independent analytic positions and chord steps distinguish nominal, adjusted and rejected cases.
- **GEO-SHALLOW-CURVES:** sixteen winding/turn combinations at $\pm21.5^\circ$, plus short-arm, clearance and lower adjustment-boundary checks.
- **NET-SHALLOW-CORNERS:** separate guides agree with the single route, including reversed selection and an over-limit rejection.
- **NET-SHALLOW-BRANCHES:** straight T/X junctions at $30^\circ$ and $35^\circ$; curved T junctions at $35^\circ$ with both windings. Passing cases preserve half-pitch first chords; failing cases reject clearance.

The tiny-span regression is covered: arithmetic residue around $4.44\times10^{-16}\,\mathrm{mm}$ is treated as zero, while a real $10^{-8}\,\mathrm{mm}$ span still rejects.

Matching pieces preserve the source solution under a rigid or reflected transform. The mapping suite checks guide coincidence (A1), slit axes and dimensions (A2), gap distances (A3), shared openings (A8/A9), and clearance (A10). CAD checks compare the openings actually written to both blocks and cover connected pieces, landmarks, face changes, failure rollback and saved links. Copies never run a separate fit.

Automatic curve fitting coverage: `CONTINUOUS`, `CONTINUOUS-CAD` and `CONTINUOUS-UI` in [the catalog](cases.json) check Start/End, exact direct gaps, landmark symmetry, closure, protected corners, the profile-dependent shallow-turn bound and branch reservations, plus saved-output lifecycle and selected landmark deletion.

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

## Test audit: 2026-11-20

Scope: catalog and runner review across the native suites, with source review of geometry matrices, matching transfer, continuous validation, fit-oracle generation, and representative CAD/display/fill assertions. This is not a mutation audit of every assertion. Historical pass counts above are not new evidence.

| Finding | Action and remaining evidence |
| --- | --- |
| [Continuous fitting](autostitch-continuous-tests.lsp) compared two identical solver calls | Removed the duplicate call/comparison. Retained expected opening count and gap measurements. |
| [Matching transfer](autostitch-match-tests.lsp) refitted a long shallow corner and asserted the same field mapping hundreds of times | Replaced it with a literal three-opening fixture covering slit axes, round diameter, coordinate and station intervals, virtual slits and adjustment metadata. Real corner fitting stays in GEO; connected transfer stays in MAP and CAD suites. |
| Matching clearance check reused the production validator | Removed it from transfer tests. Explicit coordinate/axis/size comparisons test transfer; clearance correctness belongs to geometry distance/contact checks. |
| Matching source-immutability check held another reference to the same value | Snapshot the source as text before transfer so the expectation cannot follow a changed source. |
| [Rigid corner matrix](autostitch-geometry-tests.lsp) repeated every case at zero, moderate and large translations with the same rotation | Removed the moderate translation. Retained pure rotation and large translation for every winding/type/turn combination. This reduces sampling, not a proof of equivalence at all translations. |
| [Suite runner](run-suites.ps1) always ran the whole selected UI/non-UI set, printed all load/pass records and reused one report path | Added explicit suite IDs, concise success output and unique reports. Reject empty or uncounted success results. Modules still load together for existing helper dependencies. |
| [JavaScript fit oracle](fit-oracle.mjs) shares conversion and ranking with its exhaustive comparator | Retained the cheap search cross-check; narrowed its independence claim. A shared ranking bug can still pass. Fixed expected tie/boundary tests in GEO provide separate evidence for selected cases. |
| [Continuous validator](autostitch-continuous-tests.lsp) uses production station-to-point evaluation | Retained as a gap constraint check, not an independent geometry oracle. It does not independently establish every emitted centre or curve projection. |
| CAD, marker and display checks repeat some geometry across layers | Retained when they inspect actual DWG entities, metadata, callbacks or rollback. Correct solver output alone cannot prove correct drawing writes. |
| Several tests use acceptance, counts or solver-derived fixtures | Useful as smoke/integration checks only. A transform-of-solver-output check can detect loss of invariance while missing the same geometric error in both runs. No blanket correctness claim. |

Routine selection is documented in [qualification](QUALIFICATION.md#run). Keep boundary pairs and known regressions. Add a test only for a distinct failure or contract; do not expand a Cartesian matrix simply to raise counts. Full-suite execution is reserved for releases and shared persistence, transaction or dispatch changes, rather than the number of files touched.

Remaining limitations: no measured per-suite timing baseline; no comprehensive mutation analysis; save/reopen and native-event tests are separate from the ordinary suite. The audit does not establish that every retained assertion is necessary.

Validation of the cleanup:

- GEO, MAP and CONTINUOUS passed using explicit suite selection: [native report](../output/native/suites-c5d9f7c695.txt). GEO decreased from 1,168 to 1,072 assertion executions; MAP from 488 to 53. The continuous self-comparison removal also eliminates one redundant solve.
- Selecting UI alone loaded the palette and passed: [UI report](../output/native/suites-9b192c3ecb.txt). Unknown suite IDs reject before CAD access.
- A temporary defect that left slit axes untransformed failed four direct opening comparisons in the reduced MAP suite: [mutation report](../output/native/test-audit-mutation-20261120.txt). Production code was restored immediately after the probe.
- Deliberate zero-count OK results failed all selected suites: [empty-result report](../output/native/test-audit-empty-20261120.txt).
- Catalog validation and JavaScript exhaustive search comparison passed. No full native, event or save/reopen rerun was needed for these test-only changes. One detected mutation is limited evidence, not a mutation coverage score.
