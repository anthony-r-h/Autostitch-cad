# Qualification

Dependencies: [runtime](../docs/LIMITS.md#dependencies). Native tests write only to disposable drawings under `output/native`.

## Compact fills and Velvet: 2026-11-08

- Eighteen focused native fill checks pass: concentric circles, quilt, branching maze and flow, including clearance, gap bounds and expected failures.
- Maze: $36\times30\,\mathrm{mm}$, $6\,\mathrm{mm}$ corridors, 77 openings, seven shared junction holes, no adjusted gaps. Independent source audit confirms that all 30 passage cells remain connected.
- Saved fill drawing reopened with 58 guides, 36 output blocks, no read failures and no stale output; all four named views remain.
- Concentric circles: five closed guides, $9\,\mathrm{mm}$ inner radius, $6\,\mathrm{mm}$ radial spacing, 220 openings and ten diameter landmarks; adjusted gaps match across opposite halves.
- Flow: 25 rows, 325 openings and 300 nominal gaps; free ends trimmed equally. Quilt geometry is unchanged.
- Velvet: 18 clearance-comparison checks pass. All 3,799 openings clear the lettering; minimum measured glyph clearance is $0.152\,\mathrm{mm}$. Actual output was inspected at 360 ? 576 px without visible letter outlines.
- Native reproduction checks pass for the emblem (15 guides, three circles); this remains guide artwork.
- Evidence: `output/native/circle-landmarks-build.txt`, `maze-simple-build.txt`, `maze-simple-connectivity.json`, `demo-final-verification.txt` and `circle-landmarks-reopen-check.txt`. Actual stitched previews and canonical drawings: [demo.md](../demo.md).
- Catalog validation passes with 572 stable IDs. Use the saved drawing for routine review.
- Production plugin code is unchanged. Native recipe checks exercise the production solver; the full plugin suite was not rerun for these artwork changes.

## Matched guides and lettering specimen: 2026-11-07

- Focused native suites: 52 palette, 31 matching lifecycle and seven connected matching checks passed (90 total).
- New checks cover stale pitch drafts on children, restoring displaced child output from the source, and keeping the source selectable when a child leaves the drawing plane.
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

Omit `-IncludeUi` to run only the 18 non-palette suites. Run the [gallery checks](AXIOM_AUDIT.md#reproduce) separately.

Use one native runner at a time. The harness refuses drawings outside `output/native`; inspect its completed report as well as the process exit status. Test identities and descriptions belong in [cases.json](cases.json). Geometric limits belong in [limits](../docs/LIMITS.md).
