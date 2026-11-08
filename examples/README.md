# Examples

[Demo drawings, status and reproduction](demo.md). All commands run from the repository root unless stated otherwise.

- `demos/`: one canonical DWG per demo. Save a copy before experimenting.
- `fills/`: previews of actual stitched fill samples.
- [`illustrated/`](illustrated/README.md): small explanatory diagrams for the pitch, with storyboards, sources and current assets.
- `demo.lsp`: native command loader.
- `emblem.lsp`, `fills.lsp`, `banner.lsp`: current demo geometry and fitting.
- `demo-export.lsp`: exports actual generated drawing entities.
- `render-demos.ps1`: converts exported entities to PNG/SVG.

Geometry and stitch fitting run in BricsCAD through the same core as the tool. Preview rendering is separate.

## Where to change an example

| Change | Source |
| --- | --- |
| Emblem letters, placement, interrupted rings | `emblem.lsp` |
| Banner letters, word spacing, internal flow, background diamonds | `banner.lsp` |
| Shared fill motifs and their stitch fitting | `fills.lsp` |
| Drawing entities included in a preview | `demo-export.lsp` |
| Preview appearance and raster/vector export | `render-demos.ps1` |
| Explanatory comparison or illustration | `illustrated/` |

`demo.lsp` loads the shared helpers before their consumers. The banner uses the emblem's stroke and clearance helpers and the fill fitter; these are intentional dependencies, not earlier artwork revisions. There are no installed font dependencies.

Keep the current recipe and one canonical drawing, not a sequence of patch scripts or suffixed versions. Temporary build scripts under `output/` are not inputs. `tests/create-demo.lsp` is a separate plugin qualification fixture, not a dependency of these artworks. Expected results remain in [the test catalog](../tests/cases.json).
