# Demos

One canonical DWG per demo, stored in `examples/demos/`. Git keeps revisions; temporary builds stay under `output/native/`.

| Demo | Drawing | Contents / status |
| --- | --- | --- |
| Fill samples | [fills.dwg](demos/fills.dwg) | Concentric circles, branching maze, diamond quilt and flow with generated stitches. [Qualification](../tests/QUALIFICATION.md). |
| can / YOU / really? | [can-you-really.dwg](demos/can-you-really.dwg) | Stitched lettering, flow inside YOU and an open diamond background. Preview: $600\times960$ px. |
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

The emblem keeps the lettering shapes, clips the rings around them and omits remnants shorter than three nominal stitches. Its clear band is measured between hole outlines; ring fragments use nominal spacing.

The banner clips one field of translated flow arcs across all three YOU letters. Rows are $3\,\mathrm{mm}$ apart; all stitching uses $2.7\,\mathrm{mm}$ pitch; free ends trim symmetrically to nominal spacing. Fragments with at least one complete stitch are retained, including the tapered Y arms. The fill stays at least $3\,\mathrm{mm}$ from the outline holes, including O's counter. Its guide clipping inset is $3.75\,\mathrm{mm}$ to allow for the outline slits. Both script rows use the same size. The a bowls are true circles, separated from their uprights.

The diamond background has crossings $27\,\mathrm{mm}$ apart, giving diamonds about $38.2\,\mathrm{mm}$ wide. It stays $6\,\mathrm{mm}$ from the text holes and stops inside the outer frame. Closed letter interiors remain empty of background stitching; fragments shorter than three nominal gaps are omitted. The frame is a clipping boundary.

Use the saved DWGs for routine review; generating connected stitch blocks can take a minute or more. Close each test drawing after checking it.

## Preview exports

Run `ASTDEMOEXPORT` in the corresponding demo drawing before each export. It exports the whole drawing, independent of the current view. It writes generated stitches and artwork guides to `output/native/demo-export.jsonl`. [render-demos.ps1](render-demos.ps1) renders that export at the requested drawing bounds and pixel dimensions.

Example for the portrait lettering preview:

```powershell
./examples/render-demos.ps1 -InputPath output/native/demo-export.jsonl -OutputBase examples/demos/can-you-really -Bounds 0,0,160,256 -Width 600 -Height 960
```

Use these fixed crop bounds with the same renderer. Bounds are drawing coordinates in millimetres, in `xmin,ymin,xmax,ymax` order. Run commands from the repository root. Each fill uses the export from `fills.dwg`.

| Preview / `-OutputBase` | `-Bounds` | `-Width` / `-Height` |
| --- | --- | --- |
| `examples/demos/can-you-really` | `0,0,160,256` | `600` / `960` |
| `examples/demos/emblem` | `333,-120.9290248733575,589,135.0709751266425` | `600` / `600` |
| `examples/fills/fill-quilt` | `11.0588745030457,11.0588745030457,84.9411254969543,84.9411254969543` | `600` / `600` |
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
