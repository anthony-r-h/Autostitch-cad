# Original rules against native output

2026-11-07. Source: the ten axioms in `STITCH_MODEL.md` at commit `4c3cda7`, and the original 22 HTML cases at pitches 2.7, 3, 3.38 and 3.85 mm.

**80 cases match the original spacing and anchor constraints. Eight deliberately change curved-corner placement: A03/A04 at four pitches.** These eight pass the current construction's independent geometry checks; they are not claimed as original-rule matches. Central correction placement differs throughout where applicable.

Open [the visual comparison](../output/native/gallery-parity.html): every case has original and actual BricsCAD output at the same scale. The release includes this report under `verification/`.

## Axiom trace

| Original requirement | Implementation and evidence |
| --- | --- |
| 1. Ordered route, explicit open/closed state | `ast:g-range`, `ast:g-normalize`, `ast:g-solve`; complete-route interval counts and closure checked. |
| 2. Fixed slit shape at its local tangent | `ast:g-slit`; exported axes, length and diameter measured independently at all four pitches. |
| 3. Direct ordinary pitch; junction distances separate | Exported centre distances checked against pitch and interval kind. Junction intervals must have a real round-hole endpoint. Circular pitch is a chord. |
| 4. Landmark centred in a nominal gap | Both required slit positions checked against the original landmark station. No hole at the reference. |
| 5. Reserve feature anchors before fitting | Corner neighbours and landmark pairs fixed before ordinary spans. S04/J06 additionally encode their example's protected interval. |
| 6. Fewest corrected gaps, no arbitrary count cap | Counts checked against the original examples; 540 native fits match an independent selector, itself checked against 8,215 exhaustive count/block cases. |
| 7. Corrections within 10%; protected gaps unchanged | Actual exported distances and reserved positions checked. A genuine positive 0.00000001 mm free span still rejects. |
| 8. Earlier accepted geometry fixed; reuse closure | L01/L02 preserve every prescribed prefix interval using fixed reservations; closure emits one start opening. The CAD tool has no incremental resume command. Generate recomputes the complete requested result; failure retains the previous complete CAD output. |
| 9. Direct formulas; no search/backtracking | Bounded count selection and analytic line/circle intersections. Nearest prescribed corner root is tested; a farther root cannot rescue failure. |
| 10. Report failure; do not relax constraints | F05/J05 reject as required. Native failure returns no partial generation; the old gallery retains a diagnostic prefix. CAD rollback is tested separately. |

S04/J06 protection and L01/L02 prefixes are translated into equivalent fixed nominal-gap reservations for testing. This preserves their constraints, not necessarily the old correction position or a direct CAD editing workflow.

## Corners and deliberate changes

- **Straight corners:** 112 combinations cover four pitches, both handednesses and signed turns from 30 to 150 degrees. Independent formulas check the hole and neighbouring centres. The original 45/90/135-degree included-angle examples are all in the gallery comparison.
- **Curved corners:** 48 line/arc, arc/line and arc/arc combinations cover both turn directions and curve windings. Independent coordinates/tangents reconstruct both virtual tips and nominal chords. Complete three-opening routes, reversed traversal, rotation and translations up to (1000,1000) mm are checked. Tight R3 examples include valid, disjoint-construction and actual-collision outcomes.
- **Angle limits:** checks bracket the chosen recipe's 22.483429-degree shallow-turn limit. With the illustrative width/margin of 0.2/0.2 mm, an included angle of 20.435 degrees passes and 20.434 degrees fails. These are profile-dependent examples, not universal stitching limits. Curvature, arm length and actual opening clearance also matter.
- **A03/A04:** the exploratory source recipe centres the round hole at the guide vertex. The current rule makes the selected virtual slit tips meet, extending the straight-corner principle to curves. It preserves each arm's ordinary thread continuation; it does not promise equal guide/thread angles or superior stitched appearance. The comparison keeps the original free outer margins and shows the displaced hole explicitly.
- **Other changes:** minimum corrections now sit centrally; exact footprint checks replace the old conservative length-only guard. T/X sharing is an added rule, tested by the connected-geometry suite rather than attributed to the original gallery.

## Defect found and fixed

Reconstructing a valid corner left a supposed zero free span of **4.440892098500626e-16 mm**. The planner tried fitting another interval and rejected it. This caused 42 complete curved-corner checks and five original loop runs to fail. A subsequent rigid-motion check exposed the same issue away from the origin. The zero-span comparison now uses the existing arithmetic tolerance scaled to the source coordinates, extent and radius. At 1000 mm this is about 1.4e-11 mm; a genuine 1e-8 mm span still rejects. No manufacturing allowance or pitch relaxation was added. Arbitrarily large coordinate scales remain unqualified.

Final evidence: **1,035 geometry assertions, 184 other native assertions, 540 independent native-fit comparisons; all passed.** The gallery performs **1,204 checks: 1,196 pass, eight identify the declared A03/A04 hole-location difference, zero unexpected failures.** The original JavaScript suite still passes its 30 core tests, 22 references and 1,637 invariants.

## Repeat

Use a disposable drawing under `output/native`, named `Autostitch-native.dwg`, then:

```powershell
node tests/build-gallery-parity.mjs
./tests/run-native.ps1 -ScriptPath ./output/native/gallery-native.lsp
./tests/run-native.ps1 -ScriptPath ./output/native/gallery-free-corners.lsp
node tests/build-gallery-parity.mjs --report
./tests/run-suites.ps1
node tests/build-native-oracle.mjs
./tests/run-native.ps1 -ScriptPath ./output/native/geometry-oracle.lsp
```

The comparison refuses missing/duplicate records and fails on unexpected discrepancies. Geometry checks do not establish leather strength, measured tool width, material-edge clearance or universal visual preference.

During the audit, the previously open CAD process crashed in OpenDCL/COM while several automation probes were active. The cause is unresolved; this is not a qualified host-stability result. Saved drawings were reopened with their prior entity counts (2, 19 and 49). Final native suites ran through the established single-instance runner in a disposable drawing. Crash diagnostics remain under ignored `output/native/`.
