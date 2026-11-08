# Demos

One canonical DWG per demo, stored in `examples/demos/`. Git keeps revisions; temporary builds stay under `output/native/`.

| Demo | Drawing | Contents / status |
| --- | --- | --- |
| Fill samples | [fills.dwg](examples/demos/fills.dwg) | Concentric circles, branching maze, diamond quilt and flow with generated stitches. [Qualification](tests/QUALIFICATION.md). |
| can / YOU / really | [can-you-really.dwg](examples/demos/can-you-really.dwg) | Script outer rows and outlined YOU; lettering study at 600 by 960 px. Stitch fitting and background design are pending; reserve a 6 mm clear band. |
| Emblem | [emblem.dwg](examples/demos/emblem.dwg) | Stitched AUTO Stitch with three concentric rings interrupted around a clear lettering border. |

## Reproduce in BricsCAD

1. Start a new empty drawing.
2. **APPLOAD** `AUTOSTITCH.lsp`, then `examples/demo.lsp`.
3. Run one command below and **SAVEAS** its canonical path, or a personal working copy.

| Command | Creates |
| --- | --- |
| `ASTFILLDEMOS` | Stitched fill samples with named views |
| `ASTBANNERDEMO` | Three-row lettering study |
| `ASTEMBLEMDEMO` | Stitched emblem with a 6 mm clear band around the lettering |

Fills and emblem commands generate stitches. The banner command creates lettering guides. All lettering uses editable geometry, with no installed font dependency.

The emblem keeps the lettering shapes, clips the rings around them and omits remnants shorter than three nominal stitches. Its clear band is measured between hole outlines; ring fragments use nominal spacing.

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
