# Fill recipes

Fills arrange guides; the production solver places the stitches. Fill spacing controls density independently of stitch pitch.

![Solved fill samples](../examples/fills/fill-library.png)

All samples use pitch $p=3\,\mathrm{mm}$ and slit length $\ell=1.5\,\mathrm{mm}$.

| Recipe | Configuration | Construction |
| --- | --- | --- |
| Arc spiral | $3\,\mathrm{mm}$ inner radius; $2.5\,\mathrm{mm}$ turn spacing | Thirteen tangent semicircles |
| Branching maze | $36\times30\,\mathrm{mm}$; $3\,\mathrm{mm}$ corridors | Sharp orthogonal walls with shared junction holes |
| Diamond quilt | $6\,\mathrm{mm}$ between crossings | Two families of eight lines; 64 shared X junctions |
| Flow | $35.38\times74.89\,\mathrm{mm}$; $3\,\mathrm{mm}$ row spacing | 25 translated circular arcs; free ends stop at nominal pitch |

These are tested configurations, not minimum spacings. The maze's short turns are formed at visible T/X junctions; its passages remain connected. Its free gaps and all flow gaps are nominal.

## Reuse

- [fills.lsp](../examples/fills.lsp): `ast:fill-paths` returns native line/arc polyline vertices. `ASTFILLDEMOS` draws and stitches the samples.
- [cases.json](../tests/cases.json): stable IDs, parameters and expected results.
- [fills.dwg](../examples/demos/fills.dwg): editable guides and generated blocks, with a named view per recipe.
- [Reproduction commands](../demo.md): native generation and preview export.

Maze coordinates define one fixed motif; they are not an arbitrary maze generator. Flow trims the free ends equally without changing the underlying arc. No independent hatch recipe is needed: the crossing grid is the diamond quilt.

Velvet uses circular-arc rows clipped around letter contours. Fragments too short to fit are omitted; retained fragments can be trimmed symmetrically.

## Validation

Each sample must fit completely and pass combined opening clearance, including openings on separate guides. Crossings are declared junctions with shared holes. Clearance uses default model settings; it is not a calibrated material-width allowance. [Native results](../tests/QUALIFICATION.md).
