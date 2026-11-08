# Demos

One canonical DWG per demo, stored in `examples/demos/`. Git keeps revisions; temporary builds stay under `output/native/`.

| Demo | Drawing | Contents / status |
| --- | --- | --- |
| Fill samples | [fills.dwg](examples/demos/fills.dwg) | Spiral, branching maze, diamond quilt and flow with generated stitches. [Qualification](tests/QUALIFICATION.md). |
| Velvet | [can-you-really.dwg](examples/demos/can-you-really.dwg) | **Can / You / Really**, rounded heavy lettering with stitched background fill. [Qualification](tests/QUALIFICATION.md). |
| Emblem | [emblem.dwg](examples/demos/emblem.dwg) | Centred AUTO Stitch, three concentric circles, 21 landmarks. Guide artwork; fitting still needs adjustment. |

## Reproduce in BricsCAD

1. Start a new empty drawing.
2. **APPLOAD** `AUTOSTITCH.lsp`, then `examples/demo.lsp`.
3. Run one command below and **SAVEAS** its canonical path, or a personal working copy.

| Command | Creates |
| --- | --- |
| `ASTFILLDEMOS` | Stitched fill samples with named views |
| `ASTVELVETDEMO` | Velvet banner |
| `ASTEMBLEMDEMO` | Current emblem guides and landmarks |

The native commands create geometry; fills and Velvet also call the stitch solver. Velvet's lettering is embedded, with no installed font dependency.

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
