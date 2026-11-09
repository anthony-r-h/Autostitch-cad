# Counter-examples

Sources and reproducible figures for [stitching examples](../../docs/counter_examples/EXAMPLES_skeleton.md): observed constructions and worked cases. Sellier source photograph: `hermies_sellier.webp`, supplied by Anthony.

Keep these cases in `docs/counter_examples/` and their source material here. Add them to the pitch only when Anthony requests it.

Loewe source photograph: `loewe_mini_feather.jpg`, supplied by Anthony. The case isolates the rectangular strap below the swivel hook.

Louis Vuitton source photograph: `lv_speedy.png`, supplied by Anthony. The case isolates the left handle chape, the leather tab connecting the handle hardware to the bag.

Jaeger-LeCoultre / Casa Fagliano source photograph: `jaeger_lecoultre_fagliano.png`, supplied by Anthony. The case isolates the pointed end of the right strap.

| Figure | Catalog ID | Construction |
| --- | --- | --- |
| `sellier-diagonal-corner` | `ILL-SELLIER-CORNER` | Top row already punched; vertical row flips from rear-style to front-style across its guide, then the shared diagonal slit and complete thread appear. The two adjacent thread segments have extra weight. |
| `sellier-wallet-autostitch` | `ILL-SELLIER-WALLET` | Static detail: five top slits, four side slits and four bottom slits; shared corner hole and six H circles. |
| `sellier-wallet-diagonal` | `ILL-SELLIER-WALLET-DIAGONAL` | Static comparison: the same ordinary slit counts and H, with one shared diagonal slit at the top corner. |
| `loewe-hanger-reference` | `ILL-LOEWE-HANGER` | Static reference: left shared slit, right round hole, and a horizontal middle thread. |
| `loewe-hanger-autostitch` | `ILL-LOEWE-HANGER` | Same three guides with two A6 corner holes and a fitted top span. |
| `lv-speedy-chape-reference` | `ILL-LV-SPEEDY-CHAPE` | Closed pentagon, five shared corner slits, no mirrored runs. |
| `lv-speedy-chape-autostitch` | `ILL-LV-SPEEDY-CHAPE` | Same pentagon with five A6 round holes, fitted spans and closure. |
| `fagliano-tip-compression` | `ILL-FAGLIANO-TIP` | Aligned straight pairs; left nominal curve overruns its reserved station, then compresses equally; right follows; unequal curved chords and final thread. |
| `fagliano-tip-autostitch` | `ILL-FAGLIANO-AUTOSTITCH` | Static comparison on identical guides: minimum adjusted gaps, one on the left and four on the right. |

All use a $600\times375$ canvas. The Sellier corner and Fagliano tip GIFs loop with a two-second final thread hold. Other case comparisons are static SVG/PNG, with a common scale within each pair. Geometry and sequence come from `scenes.mjs`; parameters live in `tests/cases.json`.

The vertical flip illustrates reflection by horizontal foreshortening. Opening centres and the top row stay fixed; it is a change of placement convention, not movement of punched holes.

## Reproduce

From the repository root:

```powershell
./examples/illustrated/build.ps1 -SceneScript ./examples/counter_examples/scenes.mjs -OutputDirectory ./examples/counter_examples/assets
node tests/validate-counter-examples.mjs
node tests/validate-cases.mjs
```

Outputs: `examples/counter_examples/assets/`. Temporary frames: `output/counter_examples/`. Uses the existing Windows renderer and Node; no packages or CAD session.

## Geometry

- Common profile: $p=3\,\mathrm{mm}$, slit length $1.5\,\mathrm{mm}$, round-hole diameter $0.5\,\mathrm{mm}$.
- Reference corner: three nominal intervals per arm; ordinary slit axes $-40^\circ$ and $-50^\circ$ in Cartesian coordinates; shared axis $-45^\circ$. Its axis is the diagonal seen in the annotated photograph. Connect each slit's positive tip to the next slit's negative tip; the shown face is already encoded in the slit axes.
- Autostitch case: signed local lean $-40^\circ$ throughout. The incoming minus-tip and outgoing plus-tip locate the shared hole. Integer nominal steps determine the top and right rows.
- Reference case: rear-style top lean $-40^\circ$ and front-style vertical lean $+40^\circ$. The shared slit replaces the outgoing virtual centre; nominal steps determine the top row.
- H: two legs, three circular openings per leg, width and height $3\,\mathrm{mm}$, rotated $45^\circ$. Each join continues an ordinary thread line until it meets the circle of radius $p$ about the neighbouring slit centre. The H position follows the incident slit lean; both cases retain the same H dimensions and nominal spacing. The bottom row starts from the corresponding nominal join.
- Loewe: guides $8.1\,\mathrm{mm}$ across and $9\,\mathrm{mm}$ down each side. Reference top slit axes $+40^\circ$ and $-40^\circ$ put the connected tips at the same height, producing the observed flat thread. This is an inferred reconstruction, not a measurement of the holes.
- Loewe Autostitch: nominal corner steps fix the top neighbours; the intervening gap is approximately $3.249\,\mathrm{mm}$, within the adjustment bounds. The vertical rows use three nominal steps from each virtual centre, with start/end positions inside the same guides. A6 geometry is analytic; the top fit uses the independent selector.
- Speedy: the five vertices in the catalog define a schematic closed pentagon. Ordinary slits use $+40^\circ$ lean throughout both diagrams. Reference corners use the midpoint orientation between the incident rows; each side has evenly spaced reference openings. The exact corner axes are illustrative.
- Speedy Autostitch: intersect the incoming minus-tip and outgoing plus-tip loci at each vertex, reserve nominal corner steps, and fit all five intervening spans with the independent selector. Closure reuses the starting opening. The drawing contains five round holes and twenty-one real slits.
- Fagliano: symmetric circular guides of radius $24\,\mathrm{mm}$ and sweep $40^\circ$, with three aligned straight openings per side. Local lean stays $+40^\circ$ along the complete route. The selected virtual-tip loci locate one shared round hole; handedness makes the two reserved stations asymmetric.
- Fagliano fitting: keep the first curved gap and virtual-to-real corner step nominal. Compress four intervening gaps equally per arm, to approximately $2.9368\,\mathrm{mm}$ and $2.7290\,\mathrm{mm}$. This is the requested equal-redistribution construction, not the production solver's minimum-adjustment-block policy. The dimensions and compression sequence are illustrative, not measurements of the photograph.

Fagliano timing: establish three straight pairs; reveal each nominal curved run, hold its overrun, then interpolate the four free gaps together. Finish the left arm before starting the right. Chord labels update during compression; straight centres, curve entry gaps and nominal corner steps remain fixed in length. The final frame adds all thread at once. PNG and SVG retain that final state.

Fagliano Autostitch comparison: apply the independent circular fit selector between the protected entry and corner neighbours. The left free span needs one adjusted gap of approximately $2.7470\,\mathrm{mm}$, placed centrally with the half-index tie toward the route end. The right needs four adjusted gaps of approximately $2.7290\,\mathrm{mm}$. Both retain the reference guides, straight stations, opening counts and shared hole. This checks the documented fitting policy analytically; it is not native CAD evidence.

Interpretation notes are collected in the examples document. These figures use analytic geometry, not a native plugin run. The diagonal-slit alternative is distinct from A6; the H remains external decoration rather than evidence of support for arbitrary fixed decorative holes.
