# Fill recipes

Fills arrange guides inside an area. The stitch model then fits holes to those guides.

![Reusable fills](../examples/fills/fill-library.png)

| Recipe | Parameters | Main constraint |
| --- | --- | --- |
| Diagonal hatch | Bounds, angle, lane spacing, offset | Fit each clipped run independently. |
| Arc spiral | Centre, inner radius, turn spacing, half-turn count | Tangent arc joins; clearance between turns. |
| Maze meander | Origin, grid order, cell size | One noncrossing route with repeated sharp corners. |
| Diamond quilt | Bounds, angle, lane spacing, offset | Two hatch families; declare their crossings as junctions. |
| Flowing hatch | Bounds, row spacing, amplitude, wavelength, phase length | Curvature and clearance between neighbouring rows. Used by Velvet. |

Fill spacing controls density; stitch pitch $p$ controls hole spacing. They are separate parameters. Quilting and maze fills retain all junction and corner constraints from the [axioms](AXIOMS.md).

## Reuse

- Definitions and sample parameters: `fillRecipes` in [cases.json](../tests/cases.json).
- Shared generator and clipping: [fill-recipes.ps1](../examples/fill-recipes.ps1).
- Quilt A/B and Velvet call these generators directly in [design-studies.ps1](../examples/design-studies.ps1).
- An inclusion mask trims guides to a region and splits them around exclusions. The Velvet mask reserves space around the lettering. Clipping does not create landmarks or junctions automatically.

```powershell
./examples/design-studies.ps1 -FillSamples -OutputFolder examples/fills
./tests/check-fill-recipes.ps1
```

## Qualification

Current checks cover guide continuity, hatch spacing, maze topology, clipping, short fragments and invalid parameters. Native stitch qualification remains pending for these fill samples.

Clipping uses samples at most $0.5\,\mathrm{mm}$ apart. The artwork removes runs shorter than $5\,\mathrm{mm}$; retained runs can still be infeasible. For example, a straight $7\,\mathrm{mm}$ run cannot fit pitch $p=3\,\mathrm{mm}$ within the permitted gap adjustment. Curved samples need native arc preparation before stitching. Validate openings across the entire fill, including separate guides.
