# Demos

One canonical DWG per demo, stored in `examples/demos/`. Git keeps revisions; temporary builds stay under `output/native/`.

| Demo | Drawing | Contents / status |
| --- | --- | --- |
| Fill samples | [fills.dwg](examples/demos/fills.dwg) | Concentric circles, branching maze, diamond quilt and flow with generated stitches. [Qualification](tests/QUALIFICATION.md). |
| can / YOU / really? | [can-you-really.dwg](examples/demos/can-you-really.dwg) | All lettering stitched; shared flow arcs inside YOU with a $3\,\mathrm{mm}$ clear band between holes. Preview: $600\times960$ px. |
| Emblem | [emblem.dwg](examples/demos/emblem.dwg) | Stitched AUTO Stitch with three concentric rings interrupted around a clear lettering border. |

## Reproduce in BricsCAD

1. Start a new empty drawing.
2. **APPLOAD** `AUTOSTITCH.lsp`, then `examples/demo.lsp`.
3. Run one command below and **SAVEAS** its canonical path, or a personal working copy.

| Command | Creates |
| --- | --- |
| `ASTFILLDEMOS` | Stitched fill samples with named views |
| `ASTBANNERDEMO` | Stitched lettering and flow inside YOU |
| `ASTEMBLEMDEMO` | Stitched emblem with a 6 mm clear band around the lettering |

All commands generate stitches. The banner includes stitched letter outlines, flow fill and one round question-mark dot. All lettering uses editable geometry, with no installed font dependency.

The emblem keeps the lettering shapes, clips the rings around them and omits remnants shorter than three nominal stitches. Its clear band is measured between hole outlines; ring fragments use nominal spacing.

The banner clips one field of translated flow arcs across all three YOU letters. Rows are $3\,\mathrm{mm}$ apart; all stitching uses $2.7\,\mathrm{mm}$ pitch; free ends trim symmetrically to nominal spacing. Fragments with at least one complete stitch are retained, including the tapered Y arms. The fill stays at least $3\,\mathrm{mm}$ from the outline holes, including O's counter. Its guide clipping inset is $3.75\,\mathrm{mm}$ to allow for the outline slits. Both script rows use the same size. The a bowls are true circles, separated from their uprights.

Use the saved DWGs for routine review; generating connected stitch blocks can take a minute or more. Close each test drawing after checking it.

## Preview exports

Run `ASTDEMOEXPORT` in a demo drawing. It writes generated stitches and artwork guides to `output/native/demo-export.jsonl`. [render-demos.ps1](examples/render-demos.ps1) renders that export at the requested drawing bounds and pixel dimensions.

Example for the portrait lettering preview:

```powershell
./examples/render-demos.ps1 -InputPath output/native/demo-export.jsonl -OutputBase examples/demos/can-you-really -Bounds 0,0,160,256 -Width 600 -Height 960
```

After rendering the fill previews, rebuild their overview:

```powershell
./examples/render-demos.ps1 -FillLibrary
```

## Fill recipes

[Fill definitions](docs/FILLS.md) describe the parameters and constraints. [cases.json](tests/cases.json) is the canonical test catalog. Native fill generation and solving live in [fills.lsp](examples/fills.lsp).
