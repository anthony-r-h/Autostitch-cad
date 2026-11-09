# Illustrated examples

Supporting figures for [the pitch](../../docs/PITCH_skeleton.md).

## The problem

Nominal spacing leaves a remainder at the fixed endpoint. The next proposed slit overshoots.

![Nominal spacing leaves a remainder](assets/pitch-problem.gif)

## Naive solution

Distribute the openings evenly between the endpoints. It fits, but every gap departs from the tool's nominal spacing.

![Redistribute every gap](assets/pitch-spread.gif)

## Good enough solution

Keep four gaps nominal and adjust the last one.

![Adjust the last gap](assets/pitch-end.gif)

## Autostitch solution

Reserve the endpoints and plan the fewest adjusted gaps centrally, then fill the nominal runs.

![Plan the central adjustment before filling the line](assets/pitch-centre.gif)

All four use `ILL-S02`: six slits on the same $15.3\,\mathrm{mm}$ guide, $3\,\mathrm{mm}$ pitch, $1.5\,\mathrm{mm}$ slits and $40^\circ$ lean. The naive solution has five $3.06\,\mathrm{mm}$ gaps. The other two have four nominal gaps and one $3.3\,\mathrm{mm}$ gap, at the end or in the centre. Dashed slits are proposals; `I` marks identify adjusted spacing.

## Axioms in geometry

### Follow the guide; keep the slit profile: A1-A3

A slit follows the local tangent without changing length or lean. Pitch is a direct chord between centres, not distance along the curve. `A01`.

![Slit orientation follows the curve; pitch is a chord](assets/axiom-curve.gif)

### Reserve a landmark pair: A4, A5, A7

Place a nominal gap across the reference first. Keep that pair fixed while fitting the remaining spans. There is no opening at L1. `F02`.

![A landmark protects its nominal pair while the surrounding spans are fitted](assets/axiom-landmark.gif)

### Construct the corner hole: A6

Stitch towards the corner along one arm, ending at its dashed virtual slit. Approach from the other arm the same way. The two terminal virtual tips meet at one round hole. The `s`, `e` and `j` labels remain visible throughout. `J02`.

![Each arm approaches its terminal virtual slit before their shared corner hole is identified](assets/axiom-corner.gif)

### Share the smooth join: A8

The straight and curved portions use one slit at their common tangent. Revealing both portions does not add a second opening there. `A05`.

![Straight and curved portions share one slit](assets/axiom-smooth.gif)

### Share the branching junction: A9

Reserve one round hole and its nominal neighbours before filling the arms. `ILL-JUNCTION`.

![A T junction shares one hole with nominal neighbours on each arm](assets/axiom-junction.gif)

### Check the whole layout: A10

Two fixed arms meet at $6^\circ$. Stitching approaches the junction from the wide end: two pairs pass, the next leaves only $0.04\,\mathrm{mm}$ clearance, and the nearest pair overlaps. Checks and crosses identify the result; numbers are edge-to-edge clearance in millimetres. Light envelopes show the required allowance. With $w=0.3\,\mathrm{mm}$ and $m=0.2\,\mathrm{mm}$, the complete layout is invalid. `ILL-CLEARANCE`.

![Pairs farther from the junction pass clearance; pairs near it fail](assets/axiom-clearance.gif)

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

The same approach along each arm applies to an arc/line pair and an arc/arc pair. Each virtual slit continues the position and orientation of its row. `A03`, `A04`.

![Curved and straight arms share a corner hole](assets/corner-arc-line.gif)

![Two curved arms share a corner hole](assets/corner-arc-arc.gif)

### Shallow curved corner

The outgoing corner step increases to approximately $3.21\,\mathrm{mm}$ to bring its neighbour onto the finite arc. `J08`.

![A bounded corner adjustment keeps the neighbour on its guide](assets/corner-shallow.gif)

## Glossary close-ups

The [glossary](../../docs/GLOSSARY.md) uses four static figures with aligned labels and horizontal or vertical leaders.

![Guide, gaps, landmark and free span](assets/terms-layout.png)

`ILL-TERMS-LAYOUT`: the same `F02` layout as the landmark example, with nominal, adjusted and protected gaps identified.

![Slit axis, length, width, lean and tangent](assets/terms-slit.png)

`ILL-TERMS-SLIT`: magnified profile with $\ell=1.5\,\mathrm{mm}$, $w=0.15\,\mathrm{mm}$ and $\alpha=40^\circ$.

![Junction, shared round hole and three arms](assets/terms-junction.png)

`ILL-TERMS-JUNCTION`: the same T junction as `ILL-JUNCTION`, with each arm identified.

![Chord length compared with arc length between the same slit centres](assets/terms-chord.png)

`ILL-TERMS-CHORD`: a nominal $3\,\mathrm{mm}$ chord on a $3\,\mathrm{mm}$ radius. The corresponding arc length is $\pi\,\mathrm{mm}$.

## Reproduce

From the repository root, using Node and Windows PowerShell with built-in `System.Drawing` and WPF. No packages or CAD session are needed.

```powershell
./examples/illustrated/build.ps1
node tests/validate-illustrated.mjs
node tests/validate-cases.mjs
```

- `scenes.mjs`: catalog inputs, analytic constructions, diagram elements and reveal timing.
- `build.ps1`: renders those elements and encodes the frames. Temporary files stay under `output/illustrated/`.
- `assets/<name>.gif`: looping illustration. Matching `.svg` and `.png` files contain the final state. Glossary figures (`terms-*`) use only SVG/PNG.
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
