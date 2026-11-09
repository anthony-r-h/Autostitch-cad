# Counter-examples

Supporting figures for [the Sellier study](../../docs/counter_examples/HERMES_SELLIER_skeleton.md). Source photograph: `hermies_sellier.webp`, supplied by Anthony.

| Figure | Catalog ID | Construction |
| --- | --- | --- |
| `sellier-diagonal-corner` | `ILL-SELLIER-CORNER` | Inferred ordinary rows, shared diagonal slit, then the complete thread. The two adjacent thread segments have extra weight. |
| `sellier-wallet-autostitch` | `ILL-SELLIER-WALLET` | Static detail: five top slits, four side slits and four bottom slits; shared corner hole and six H circles. |
| `sellier-wallet-diagonal` | `ILL-SELLIER-WALLET-DIAGONAL` | Static comparison: the same ordinary slit counts and H, with one shared diagonal slit at the top corner. |

All use a $600\times375$ canvas. The corner GIF loops with a two-second final thread hold. Both reduced wallets are static SVG/PNG at the same scale. Geometry and sequence come from `scenes.mjs`; parameters live in `tests/cases.json`.

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
- Reference corner: three nominal intervals per arm; ordinary slit axes $-40^\circ$ and $-50^\circ$ in Cartesian coordinates; shared directed axis $135^\circ$. Its undirected axis is the diagonal seen in the annotated photograph. Thread connections are reconstructed separately from the hole axes.
- Autostitch wallet: signed local lean $-40^\circ$. The incoming minus-tip and outgoing plus-tip locate the shared hole. The top endpoint and H anchors are placed by integer nominal steps from the virtual centres; the bottom row uses integer steps from the left H anchor.
- Diagonal wallet: reuse the reference corner's slit axes and thread connections. Keep the H, right-row centres and bottom-row centres fixed. Place the corner slit at the outgoing virtual centre and set the top guide from nominal steps; this slightly raises the top guide while retaining nominal gaps throughout.
- H: two legs, three circular openings per leg, width $3\,\mathrm{mm}$, height $6\,\mathrm{mm}$, rotated $45^\circ$. Connectivity is drawn explicitly; it is not a sewing itinerary.

The study's reconstruction assumptions are collected in its document. These figures use analytic geometry, not a native plugin run. The diagonal-slit alternative is deliberately distinct from A6; the H remains an external decoration.
