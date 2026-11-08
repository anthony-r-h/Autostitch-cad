# Illustrated examples

Supporting figures for [the pitch](../../docs/PITCH_skeleton.md).

## The problem

Nominal spacing leaves a remainder at the fixed endpoint. The next proposed slit overshoots.

![Nominal spacing leaves a remainder](assets/pitch-problem.gif)

## Naive solution

Distribute the openings evenly between the endpoints. It fits, but every gap departs from the tool's nominal spacing.

![Redistribute every gap](assets/pitch-spread.gif)

## Good enough solution

Keep most gaps nominal and adjust the last two.

![Adjust the last two gaps](assets/pitch-end.gif)

## Autostitch solution

Reserve the endpoints and plan the fewest adjusted gaps centrally, then fill the nominal runs.

![Plan the central adjustment before filling the line](assets/pitch-centre.gif)

All four use `S02`: the same $30.5\,\mathrm{mm}$ guide, $3\,\mathrm{mm}$ pitch, $1.5\,\mathrm{mm}$ slits and $40^\circ$ lean. The naive solution has ten $3.05\,\mathrm{mm}$ gaps. The other two have eight nominal gaps and two $3.25\,\mathrm{mm}$ gaps. Dashed slits are proposals; `I` marks identify adjusted spacing.

## Axioms in geometry

### Follow the guide; keep the slit profile: A1-A3

A slit follows the local tangent without changing length or lean. Pitch is a direct chord between centres, not distance along the curve. `A01`.

![Slit orientation follows the curve; pitch is a chord](assets/axiom-curve.gif)

### Reserve a landmark pair: A4, A5, A7

Place a nominal gap across the reference first. Keep that pair fixed while fitting the remaining spans. There is no opening at L1. `F02`.

![A landmark protects its nominal pair while the surrounding spans are fitted](assets/axiom-landmark.gif)

### Construct the corner hole: A6

The selected tips of two virtual slits meet at one round hole. Place the real neighbours one corner step away; the virtual slits remain dashed construction. `J02`.

![Virtual slit tips locate a shared corner hole](assets/axiom-corner.gif)

### Share the smooth join: A8

The straight and curved portions use one slit at their common tangent. Revealing both portions does not add a second opening there. `A05`.

![Straight and curved portions share one slit](assets/axiom-smooth.gif)

### Share the branching junction: A9

Reserve one round hole and its nominal neighbours before filling the arms. `ILL-JUNCTION`.

![A T junction shares one hole with nominal neighbours on each arm](assets/axiom-junction.gif)

### Check the whole layout: A10

Both rows retain nominal pitch as their guides approach. The final arrangement is rejected because the slit profiles overlap. Light envelopes show the clearance allowance. This example specifies $w=0.3\,\mathrm{mm}$ and $m=0.2\,\mathrm{mm}$; it is deliberately invalid. `ILL-CLEARANCE`.

![Individually valid rows collide when placed together](assets/axiom-clearance.gif)

## Further model examples

### No permitted fit

For a $7\,\mathrm{mm}$ span at $3\,\mathrm{mm}$ pitch, two equal gaps are too long and three are too short. Reject the span rather than move its fixed ends. `ILL-NOFIT`.

![No gap count fits the permitted bounds](assets/fit-rejected.gif)

### Loop closure

Twenty nominal chord gaps return to the reserved start. Count that opening once. `ILL-CLOSURE`.

![Close the loop and reuse the start opening](assets/axiom-closure.gif)

### Matched guides

Solve one source, then reveal corresponding openings on its reflected copy. The copy retains the whole layout, including adjusted gaps and reflected slit axes. `ILL-MATCHED`.

![One solved layout copied to a reflected guide](assets/matched-guides.gif)

### Curved corners

The same selected-tip construction applies to an arc/line pair and an arc/arc pair. `A03`, `A04`.

![Curved and straight arms share a corner hole](assets/corner-arc-line.gif)

![Two curved arms share a corner hole](assets/corner-arc-arc.gif)

### Shallow curved corner

The outgoing corner step increases to approximately $3.21\,\mathrm{mm}$ to bring its neighbour onto the finite arc. `J08`.

![A bounded corner adjustment keeps the neighbour on its guide](assets/corner-shallow.gif)

## Reproduce

From the repository root, using Node and Windows PowerShell with built-in `System.Drawing` and WPF. No packages or CAD session are needed.

```powershell
./examples/illustrated/build.ps1
node tests/validate-illustrated.mjs
node tests/validate-cases.mjs
```

- `scenes.mjs`: catalog inputs, analytic constructions, diagram elements and reveal timing.
- `build.ps1`: renders those elements and encodes the frames. Temporary files stay under `output/illustrated/`.
- `assets/<name>.gif`: looping illustration. Matching `.svg` and `.png` files contain the final state for still-image use.
- `tests/cases.json`: source cases and stable illustration IDs. The validator checks drawn geometry, constraints, GIF frame counts, delays and looping.

### Notation

- `s`, `e`: extent and direction of the stitch line; closed loops reuse `s`.
- `j`: shared slit or round hole at a junction.
- `L1`: landmark reference; `I` crossbars mark adjusted spacing.
- Boxed `ST-1` / `ST-1-A`: source and matched-copy IDs.

### Updating after plugin changes

1. Update the affected canonical cases and run their native solver checks.
2. Align `scenes.mjs` constructions and the independent `tests/fit-oracle.mjs` selector with the changed rules. Keep comparison inputs identical.
3. Run the build and validation commands above; inspect the rebuilt GIFs and commit the sources and assets together.

The builder reads catalog inputs and analytic scene recipes. It does not load the production LISP solver. Native artwork regeneration uses [the demo commands](../demo.md).

## Figure rules

- Fixed $600\times375$ px canvas and framing throughout each loop.
- Geometry on a plain background. No headings, scorecards, counters, banners or duplicate prose inside the image.
- Only local dimensions and feature labels needed to follow the current step.
- Show guide, constraint, attempted placement, consequence and response. Hold the result, then visibly reset.
- Keep comparison geometry and tool profile identical. Do not exaggerate small pitch changes.
- Use movement to explain construction and decisions; do not merely fade in a finished infographic.
- Animation is the primary example. Keep a still fallback and editable vector elements.
