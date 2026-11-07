# Qualification

Dependencies: [runtime](../docs/LIMITS.md#dependencies). Native tests write only to disposable drawings under `output/native`.

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

Omit `-IncludeUi` to run only the 13 non-palette suites. Run the [gallery checks](AXIOM_AUDIT.md#reproduce) separately.

Use one native runner at a time. The harness refuses drawings outside `output/native`; inspect its completed report as well as the process exit status. Test identities and descriptions belong in [cases.json](cases.json). Geometric limits belong in [limits](../docs/LIMITS.md).
