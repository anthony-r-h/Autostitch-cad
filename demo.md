# Demos

One canonical DWG per demo, stored in `examples/demos/`. Git keeps revisions; temporary builds stay under `output/native/`.

| Demo | Drawing | Contents / status |
| --- | --- | --- |
| Fill samples | [fills.dwg](examples/demos/fills.dwg) | Concentric circles, branching maze, diamond quilt and flow with generated stitches. [Qualification](tests/QUALIFICATION.md). |
| Velvet | [can-you-really.dwg](examples/demos/can-you-really.dwg) | **Can / You / Really**, rounded heavy lettering with stitched background fill. [Qualification](tests/QUALIFICATION.md). |
| Emblem | [emblem.dwg](examples/demos/emblem.dwg) | Stitched AUTO Stitch with three concentric rings interrupted around a clear lettering border. |

## Reproduce in BricsCAD

1. Start a new empty drawing.
2. **APPLOAD** `AUTOSTITCH.lsp`, then `examples/demo.lsp`.
3. Run one command below and **SAVEAS** its canonical path, or a personal working copy.

| Command | Creates |
| --- | --- |
| `ASTFILLDEMOS` | Stitched fill samples with named views |
| `ASTVELVETDEMO` | Velvet banner |
| `ASTEMBLEMDEMO` | Stitched emblem with a 6 mm clear band around the lettering |

The native commands create guides and generate stitches. Velvet's lettering is embedded, with no installed font dependency.

The emblem keeps the lettering shapes, clips the rings around them and omits remnants shorter than three nominal stitches. Its clear band is measured between hole outlines; ring fragments use nominal spacing.

Use the saved DWGs for routine review; generating connected stitch blocks can take a minute or more. Close each test drawing after checking it.

## Preview exports

Run `ASTDEMOEXPORT` in a stitched demo drawing. It writes generated stitch entities and pattern references to `output/native/demo-export.jsonl`. [render-demos.ps1](examples/render-demos.ps1) renders that export at the requested drawing bounds and pixel dimensions.

Example for the Velvet phone preview:

```powershell
./examples/render-demos.ps1 -InputPath output/native/demo-export.jsonl -OutputBase examples/demos/can-you-really-phone -Bounds 0,0,160,256 -Width 360 -Height 576
```

After rendering the fill previews, rebuild their overview:

```powershell
./examples/render-demos.ps1 -FillLibrary
```

## Fill recipes

[Fill definitions](docs/FILLS.md) describe the parameters and constraints. [cases.json](tests/cases.json) is the canonical test catalog. Native fill generation and solving live in [fills.lsp](examples/fills.lsp).
