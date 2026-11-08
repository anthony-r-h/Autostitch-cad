# Examples

[Demo drawings, status and reproduction](../demo.md).

- `demos/`: one canonical DWG per demo. Save a copy before experimenting.
- `fills/`: previews of actual stitched fill samples.
- `demo.lsp`: native command loader.
- `emblem.lsp`, `fills.lsp`, `velvet.lsp`: current demo geometry and fitting.
- `demo-export.lsp`: exports actual generated drawing entities.
- `render-demos.ps1`: converts exported entities to PNG/SVG.

Geometry and stitch fitting run in BricsCAD through the same core as the tool. Preview rendering is separate.
