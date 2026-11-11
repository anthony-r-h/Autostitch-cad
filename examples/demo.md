# Demos

One canonical DWG per demo, stored in `examples/demos/`. Git keeps revisions; temporary builds stay under `output/native/`.

| Demo | Drawing | Contents / status |
| --- | --- | --- |
| Fill samples | [fills.dwg](demos/fills.dwg) | Concentric circles, branching maze, diamond quilt and flow with generated stitches. [Qualification](../tests/QUALIFICATION.md). |
| can / YOU / really? | [can-you-really.dwg](demos/can-you-really.dwg) | Stitched lettering, flow inside YOU and an open diamond background. Preview: $600\times750$ px. |
| Emblem | [emblem.dwg](demos/emblem.dwg) | Stitched AUTO Stitch with three concentric rings interrupted around a clear lettering border. |

## Reproduce in BricsCAD

1. Start a new empty drawing.
2. **APPLOAD** `AUTOSTITCH.lsp`, then `examples/demo.lsp`.
3. Run one command below and **SAVEAS** its canonical path, or a personal working copy.

| Command | Creates |
| --- | --- |
| `ASTFILLDEMOS` | Stitched fill samples with named views |
| `ASTBANNERDEMO` | Stitched lettering, flow fill and diamond background |
| `ASTEMBLEMDEMO` | Stitched emblem with a 6 mm clear band around the lettering |

All commands generate stitches. The banner includes stitched lettering, flow fill, a diamond background and one round question-mark dot. All lettering uses editable geometry, with no installed font dependency.

The emblem uses $2.7\,\mathrm{mm}$ nominal pitch throughout, with $1.5\,\mathrm{mm}$ slits. Two landmarks at the outer and inner A crown apices reserve nominal gaps and give mirrored crown stations. The lettering guides fit this pitch; the rings clip around them and omit remnants shorter than three nominal stitches. The $6\,\mathrm{mm}$ clear band is measured between hole outlines; ring fragments use nominal spacing. Native regeneration and save/reopen checks passed on 2026-11-10: 15 lettering guides, 12 ring arcs, 580 lettering openings and 496 ring openings, plus the separate dot.

The banner clips one field of translated flow arcs across all three YOU letters. Rows are $3\,\mathrm{mm}$ apart; all stitching uses $2.7\,\mathrm{mm}$ pitch; free ends trim symmetrically to nominal spacing. Fragments with at least one complete stitch are retained, including the tapered Y arms. The fill stays at least $3\,\mathrm{mm}$ from the outline holes, including O's counter. Its guide clipping inset is $3.75\,\mathrm{mm}$ to allow for the outline slits. The page is $160\times200\,\mathrm{mm}$ (4:5), with $14\,\mathrm{mm}$ between word extents. Both script rows use the same size. The a bowls are true circles, separated from their uprights.

Branching junctions reserve half-pitch neighbours on every arm. The h rising stroke, l approaches and y lead-in leave enough room for the remaining ordinary gaps.

The diamond background has crossings $13.5\,\mathrm{mm}$ apart, giving diamonds about $19.1\,\mathrm{mm}$ wide. It stays $6\,\mathrm{mm}$ from the text holes and stops inside the outer frame. Closed letter interiors remain empty of background stitching; fragments shorter than three nominal gaps are omitted. Free ends stop half a pitch inside the clipped runs, keeping their phase consistent with the junction neighbours. The frame is a clipping boundary.

Use the saved DWGs for routine review; generating connected stitch blocks can take a minute or more. Close each test drawing after checking it.

## Preview exports

Run `ASTDEMOEXPORT` in the corresponding demo drawing before each export. It exports the whole drawing, independent of the current view. It writes generated stitches and artwork guides to `output/native/demo-export.jsonl`. [render-demos.ps1](render-demos.ps1) renders that export at the requested drawing bounds and pixel dimensions.

Preview colours use `documentationTheme` in [illustrated/colors.json](illustrated/colors.json), currently Graphite. Pass `-Theme <name>` to override it. For colour changes alone, reuse the published SVG geometry:

```powershell
./examples/illustrated/build.ps1 -SceneScript ./examples/illustrated/emblem-square.mjs -OutputDirectory ./examples/demos
./examples/render-demos.ps1 -SvgPath examples/demos/can-you-really.svg -OutputBase examples/demos/can-you-really
```

The square emblem is a 600 by 600 px annotated preview with 3x supersampling. Solid white slits use 1.2 px strokes and thread uses 0.9 px strokes to remain visible at roughly 300 px thumbnail size. Thin guides, virtual slits, direction marks and landmarks, blue adjustment marks and red thread-angle arcs supply the notation. Dimension numbers are omitted. Its builder uses the shared theme and the native drawing geometry, retained verbatim in the SVG's `native-emblem` metadata. The animation reads that preserved export and keeps its existing presentation. Run `node tests/validate-emblem-storyboard.mjs` to check both views.

The square emblem retains the crop `60,68,465,465` in the original 600 px native SVG coordinates, clipping the outer ring while retaining both words. After a geometry change, first render the new native export with the bounds below at 600 by 600 px, then run the square builder above and rebuild the animation. Use the square builder for subsequent notation or colour changes; `render-demos.ps1 -SvgPath` is for unannotated native previews.

Example for the portrait lettering preview:

```powershell
./examples/render-demos.ps1 -InputPath output/native/demo-export.jsonl -OutputBase examples/demos/can-you-really -Bounds 0,0,160,200 -Width 600 -Height 750
```

Use these fixed crop bounds with the same renderer. Bounds are drawing coordinates in millimetres, in `xmin,ymin,xmax,ymax` order. Run commands from the repository root. Each fill uses the export from `fills.dwg`.

| Preview / `-OutputBase` | `-Bounds` | `-Width` / `-Height` |
| --- | --- | --- |
| `examples/demos/can-you-really` | `0,0,160,200` | `600` / `750` |
| `examples/demos/emblem` | `333,-120.9290248733575,589,135.0709751266425` | `600` / `600` |
| `examples/fills/fill-quilt` | `12.1195346748255,12.1195346748255,83.8804653251744,83.8804653251744` | `600` / `600` |
| `examples/fills/fill-circles` | `308,-12,380,60` | `600` / `600` |
| `examples/fills/fill-maze` | `477,-6,519,36` | `600` / `600` |
| `examples/fills/fill-flow` | `623.552939397217,3.10587879443474,704.447060602782,84` | `600` / `600` |

After rendering all four fill previews, rebuild their overview:

```powershell
./examples/render-demos.ps1 -FillLibrary
```

## Fill recipes

[Fill definitions](../docs/FILLS.md) describe the parameters and constraints. [cases.json](../tests/cases.json) is the canonical test catalog. Native fill generation and solving live in [fills.lsp](fills.lsp).

## Source and verification

- `demo.lsp` loads `emblem.lsp`, `fills.lsp`, `banner.lsp`, then `demo-export.lsp`. Load this entry point rather than individual modules.
- `emblem.lsp` defines the emblem letters and reusable stroke, clipping and clearance helpers. `banner.lsp` uses those helpers, defines its own lettering and composition, and clips the flow and diamond fields. `fills.lsp` supplies the shared fill recipes and production fitting.
- The coordinates, transforms, spacing and clipping rules in those files are the complete artwork recipes. No external fonts, temporary scripts or earlier DWGs are required.
- Regeneration needs BricsCAD V22 and the plugin's [runtime dependencies](../docs/LIMITS.md#dependencies). PNG export uses PowerShell and Windows `System.Drawing`; SVG export is written by the same renderer. No additional packages are needed.
- Run `(ast:emblem-check)` or `(ast:banner-check)` in the corresponding generated drawing. For fills, load `tests/autostitch-fill-tests.lsp` after the demo loader and run `(ast:fill-tests)`. Inspect the returned result, then save/reopen and check again when changing the native recipe.
- The [test catalog](../tests/cases.json) records expected geometry and stable scenario IDs. [Qualification](../tests/QUALIFICATION.md) records completed native checks; documentation edits do not constitute a new native run.

Temporary JSONL exports and test reports belong under `output/native/`. They are reproducible intermediate files, not recipe inputs. Keep one canonical DWG and its current previews per demo; use Git for history. Do not delete working or recovery drawings as part of example cleanup.
