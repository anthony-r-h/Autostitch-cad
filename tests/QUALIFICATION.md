# Qualification

Dependencies: [runtime](../docs/LIMITS.md#dependencies). Native tests write only to disposable drawings under `output/native`.

## Reusable fill guides and canonical demos: 2026-11-08

- Five fill recipes are defined in the catalog and rendered from shared code. Quilt A/B use diamond quilt; selected Velvet uses flowing hatch. Velvet's SVG and DXF are unchanged by extraction.
- `check-fill-recipes.ps1` passes: hatch direction/spacing, near-vertical hatching, spiral continuity, maze adjacency/uniqueness, quilt crossing spacing, exclusion clipping in both directions, short fragments and invalid spacing.
- Canonical demos live in `examples/demos/`; `build-demos.ps1 -Publish` builds fresh drawings and checks completion before replacing them. Reproduction steps are in [demo.md](../demo.md).
- Rebuilt and reopened all three canonical DWGs: emblem has 15 guides and three circles; quilting has 120 guides and its A/B/C views; Velvet has 239 guides and 17 letter boundaries. All retain millimetre units.
- Catalog validation passes with 559 IDs. These checks qualify guide generation and demo construction; native stitch qualification of the new fill samples remains pending. Production plugin code is unchanged.

## Artwork studies: 2026-11-08

- Added a centred three-circle emblem, three quilting options and two portrait lettering options. These are guide drawings for review, not qualified stitch layouts.
- Native DXF import: Quilt A has 39 guide entities; Banner D has 239 guides and 17 letter boundaries. Both retain millimetre units and the intended bounds.
- All five generated options have matching SVG/DXF path counts, unique CAD handles, finite coordinates and correct PNG dimensions. Artwork and comparison sheets were visually reviewed.
- Catalog validation passes with 554 IDs. Production plugin code is unchanged; the full stitch suite was not rerun. Emblem fit status is recorded in [the specimen notes](../examples/README.md#centred-three-circle-study).

## Unstitched pattern circles: 2026-11-08

- Two concentric circles replace the stitched frame and registration ticks. All four lettering crossings are landmarks: three on S, one on h.
- Native verification finds a nominal $3\,\mathrm{mm}$ gap centred at every crossing, with no unmatched crossing or extra reserved gap.
- All 28 sources regenerate: 51 current guides, 32 outputs and eight landmarks across the specimen. Save/reopen preserves those counts, both pattern circles and all three named views.
- The emblem's 523 openings, including the separate round-punch dot, pass combined clearance under default model settings. Guide artwork exports before and after fitting are identical.
- Inspected the artwork and stitched exports at 600 × 600. Plugin code is unchanged; the full suite was not rerun.

## Script emblem and sewn frame: 2026-11-07

- Square-ended AUTO outlines retain the rounded A crown and U bowl. Lowercase script, its dot, the swash and the circular frame all use generated stitches.
- All 32 sources regenerate: 55 current guides, 36 outputs and five landmarks. Save/reopen preserves these and all named views.
- The final emblem's 731 openings pass combined clearance validation under default model settings, including separate letters and frame arcs.
- Inspected the 600 × 600 export. Catalog validation passes. Plugin code is unchanged; the full suite was not rerun.

## Stitched badge: 2026-11-07

- Revised square specimen: outlined AUTO, mixed letter shapes and a pattern circle crossing the S and H.
- All 27 sources regenerate: 54 current guides and 32 output blocks. All three circle crossings have saved landmarks; seven landmarks total across the drawing.
- Save/reopen preserves those counts, current status and all three named views.
- Inspected the actual CAD export at 600 × 600. Plugin code is unchanged; the full suite was not rerun.

## Matched guides and lettering specimen: 2026-11-07

- Focused native suites: 52 palette, 31 matching lifecycle and seven connected matching checks passed (90 total).
- New checks cover stale pitch drafts on children, restoring displaced child output from the source, and keeping the source selectable when a child leaves the drawing plane.
- The fixed [specimen](../examples/README.md) generates 30 stitch blocks from 54 guides. Regeneration passed for all 24 sources; rounded, angular and square exports were inspected.
- Reopening preserved all 54 current guides, six matched copies, six landmarks and three named views. Export rejects displaced output until regenerated.
- Catalog: 548 stable IDs validated. The full suite was not rerun for this change.

## Spacing labels and linked IDs: 2026-11-07

- All 18 native suites passed 2,014 checks. Matching save/reopen passed seven checks.
- Display checks cover smaller text centred on straight and curved guides, two decimal places, reversal and inch drawings.
- Naming checks cover letter rollover, matching block/boxed IDs, migration, collision avoidance and stable sibling names after unlinking.
- Catalog: 542 stable IDs validated. Four matching assertions failed in an earlier session; they passed after restart, in an isolated diagnostic, the original test sequence and the complete suite. The initial cause remains unconfirmed.

## Matching pieces and face views: 2026-11-07

- All 18 native suites passed 2,007 checks, including 488 exact-mapping checks, 31 matching lifecycle/connected-piece checks and 47 palette checks.
- Matching save/reopen passed seven checks: stable IDs, both faces, regeneration and missing-copy repair.
- Native MOVE, STRETCH, ERASE, callback rollback and Undo/Redo passed 61 checks.
- Inspected the palette and adjusted-spacing labels in BricsCAD. The example drawing includes straight and curved matching pieces and a connected corner with a landmark.
- Catalog: 535 stable IDs validated. Mapping uses the existing solver unchanged; the gallery and arithmetic oracle were not rerun.
- An initial closed-loop comparison failed on floating-point error when reconstructing slit lengths from DWG endpoints. The CAD comparison now allows $10^{-7}\,\mathrm{mm}$ in position and $10^{-8}\,\mathrm{mm}$ in slit length; production geometry tolerances are unchanged.

## Shallow junction boundaries: 2026-11-07

- Geometry: 1,135 checks passed, including 91 new shallow-curve and boundary checks.
- Connected geometry: 62 checks passed, including 16 new mixed-corner and T/X checks.
- Visual gallery: 104 fixtures, 112 native solver runs and 1,702 checks passed. J07–J10 include independently calculated expectations.
- Catalog: 432 stable IDs validated. Production code is unchanged; CAD lifecycle and palette suites were not rerun for this test-only change.

## Guide connections and corner allowance: 2026-11-07

- All 15 native suites passed 1,348 checks, including 19 deferred-connection checks and the reported shallow corner at a $3\,\mathrm{mm}$ pitch.
- Save/reopen passed 12 checks for pending connections, retained output, shared IDs and deleted-primary repair.
- Native MOVE, STRETCH, ERASE, callback rollback and Undo/Redo passed 61 checks.
- The geometry gallery passed all 88 fixtures: 96 solver runs and 1,284 checks.
- The canonical catalog validates with 409 stable IDs. `GUIDE-REOPEN` describes the saved-drawing check.

## Three output layers: 2026-11-07

- The 13 non-display native suites passed 1,273 checks. The display suite passed all 42 checks after correcting its new plot-flag assertion.
- A legacy-drawing merge passed eight checks: geometry/style preservation, removal of both old layers, nonprinting UI, Undo/Redo and regeneration.
- The canonical catalog validates with 376 stable IDs.

## Stitch IDs and palette: 2026-11-07

- All 14 native suites passed: 1,313 checks. After the final connected-label refresh, the seven affected suites passed again: 159 checks, including the added migration case.
- Native edit events and Undo/Redo passed 61 checks after that final change.
- Checked the pitch field and equal-width Set start / Set end / Reverse buttons in BricsCAD. The test catalog validates with 375 stable IDs.

## Cleanup verification: 2026-11-07

Rerun after the runtime cleanup and test-catalog migration in `Autostitch-cleanup-tests.dwg`.

| Check | Passed |
| --- | ---: |
| Geometry: routes, straight/curved corners, reversal, transforms, closure, ranges and clearance | 1,035 |
| Connected geometry: corners, T/X, roots and normalization | 43 |
| DWG generation, rollback, lifecycle, attachments and ranges | 59 |
| Connected-set merge/split, copies and missing sources | 39 |
| Markers, shared boxed IDs, snaps and rollback | 54 |
| Native COPY and model/paper-space ownership | 5 |
| Drawing style, thread, `I` marks, fills and virtual slits | 41 |
| Palette, endpoints, IDs, pitch, landmarks and output restore | 21 |
| Native edit events and Undo/Redo | 61 |
| Independent native-fit oracle | 540 |

The first seven rows total 1,276 checks across 12 native suites. Palette and events bring the native total to 1,358. Oracle comparisons are separate.

The [axiom audit](AXIOM_AUDIT.md) maps rules to checks and describes the 88 gallery cases. The independent selector also passed 8,215 exhaustive count/block comparisons.

## Earlier manual and saved-drawing checks

Retained evidence from the preceding implementation; these were not repeated for this behavior-preserving cleanup.

- Palette selection, endpoint and landmark snaps, cancellation and snap-setting restoration.
- Set start / Set end / Reverse direction; closed-loop start and disabled end.
- ConnectAll, T/circle-line junctions, disconnect and missing-source repair.
- Generate saves pitch/output in one Undo step and restores displaced output.
- Switching drawings cannot apply another drawing's displayed inputs.
- Save/reopen, complete-set copies, deleted-primary recovery and standalone package loading.
- Fourteen demo blocks from 19 guides: all current, with one boxed ID per block. Marker update preserved guide geometry, settings and landmarks.
- The 18-control palette and curved-guide boxed label were inspected in BricsCAD.

## Run

Catalog and independent arithmetic:

```powershell
node tests/validate-cases.mjs
node tests/fit-oracle.mjs
node tests/build-native-oracle.mjs
```

With a saved disposable `output/native/Autostitch-native.dwg` open in the existing BricsCAD process:

```powershell
./tests/run-suites.ps1 -IncludeUi
./tests/run-events.ps1
./tests/run-native.ps1 -ScriptPath ./output/native/geometry-oracle.lsp
Get-Content ./output/native/geometry-oracle.txt
```

Omit `-IncludeUi` to run only the 17 non-palette suites. Run the [gallery checks](AXIOM_AUDIT.md#reproduce) separately.

Use one native runner at a time. The harness refuses drawings outside `output/native`; inspect its completed report as well as the process exit status. Test identities and descriptions belong in [cases.json](cases.json). Geometric limits belong in [limits](../docs/LIMITS.md).
