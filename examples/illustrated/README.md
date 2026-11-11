# Illustrated examples

Supporting figures for [the pitch](../../docs/PITCH_skeleton.md).

The explanatory figures use $3\,\mathrm{mm}$ nominal pitch unless stated otherwise. The emblem construction uses $2.7\,\mathrm{mm}$.

## Format and colour studies

- All figures export at $600\times750$ px (4:5 portrait). Geometry scales uniformly; related comparisons share one fixed camera across every frame.
- [Sixteen colour options](palettes/index.html): eight light and eight dark backgrounds, using the same Vertex point corner. [Contact sheet](palettes/contact-sheet.png).
- [colors.json](colors.json) is the single colour and typography file. `documentationTheme` selects **graphite** for both the pitch and counter-example diagrams.
- Each theme defines thread, construction, faded measurements, guides, leather edges, angles/residuals and adjusted-gap colours. `text` sets normal font colour; `textBackground` sets the label box colour. Semantic red/blue text and the Stitch fade retain their roles.
- `rejected` colours crosses red; `accepted` colours checks green. Keep their shapes distinct as well as their colours.
- `leather` sets the piece fill colour; `leatherOpacity` is $0$ for a transparent surface showing the diagram background. `edge` controls the visible outline separately.
- `typography` sets `fontFamily`, `sizeScale`, label-box `paddingX`/`paddingY`, and `background` (set `false` to omit boxes). Font sizes scale from the existing label hierarchy. Use an installed font and preview it at the intended display size.
- `numberFontFamily` sets the monospace font for numeric measurements and angles: **Consolas**. Descriptive labels retain the normal font.
- `typography.lengthSize` sets numeric lengths in output pixels, currently $13\,\mathrm{px}$. Camera scaling does not change their displayed size; `sizeScale` remains the global typography override.
- Start/end markers use math italics $s$ and $e$; landmarks use $l_n$ with upright subscript digits. `notationFontFamily` (Cambria) and `notationSizeScale` control these markers in every output format.
- Thread, measurements and angle labels meet a minimum $4.5:1$ contrast against their background. The same theme resolves every SVG, PNG and GIF frame, including slit interiors and the fade.
- Rebuild the documentation figures after changing the selected theme or typography:

```powershell
./examples/illustrated/build.ps1
./examples/illustrated/build.ps1 -SceneScript ./examples/counter_examples/scenes.mjs -OutputDirectory ./examples/counter_examples/assets
```

Use `-Theme porcelain` (or any key in `colors.json`) to override the selection for a build. Use a separate `-OutputDirectory` for previews. Rebuild the palette gallery and contact sheet:

```powershell
./examples/illustrated/build.ps1 -SceneScript ./examples/illustrated/palettes.mjs -OutputDirectory ./examples/illustrated/palettes -ContactSheet
```

## Animation phases

These are the shared rules for planning, implementing and reviewing illustrated animations. Use **Build -> Adjustment -> Stitch**, followed by optional **Finishing touches**.

| Phase | Geometry and motion | Display |
| --- | --- | --- |
| Build | Establish the guides, features and slit layout | No thread. Slits and relevant dimensions at normal contrast; virtual slits dashed. Start, end and junction notation visible from the outset |
| Adjustment | Slide, redistribute, mirror or otherwise revise the layout | No thread and no fading. Keep fixed features stationary; update affected dimensions with the geometry |
| Stitch | Reveal all thread segments together; freeze the geometry | Fade slits, holes, virtual slits, landmark lines and length dimensions to the theme's secondary colours over $0.3\,\mathrm{s}$. Keep thread prominent, angle annotations red and unresolved conflicts visible |
| Finishing touches (optional) | Complete independent artwork details after stitching, such as the emblem's i-dot. Keep the completed stitch geometry fixed | Preserve thread styling. The storyboard may fade construction marks away and reveal finishing details using the shared theme and reveal settings. Keep unresolved conflicts visible |

- Continue from the previous example's established layout; do not replay Build unnecessarily
- Skip Adjustment when nothing changes; do not invent corrections to fill a phase
- Skip Finishing touches when the stitched result is complete. In the emblem, `fade-openings` and `punch` perform this phase after all stitching; ordinary Stitch only fades construction to secondary colours
- For multi-part artwork, apply Build, optional Adjustment and Stitch in order within each part. Begin Finishing touches after all relevant parts have finished stitching
- Hold the completed result after the last active phase, then loop. The default hold is four seconds; record different timing and loop behaviour in the scene recipe or storyboard
- Record phase boundaries and optional finishing actions in each recipe or storyboard. Check phase order, fixed geometry during Stitch and finishing, shared colours and fade targets, and synchronized timing across comparisons; inspect transitions at the intended display size
- Bridge is an explicit final-phase comparison: retain faded slits and visible thread throughout movement; update length and red angles live, with half-second holds at both positions
- Bridge motion runs $30\%$ slower: $2.14\,\mathrm{s}$ per direction and $5.28\,\mathrm{s}$ per loop, including both holds
- T-junction comparisons retain the final Stitch styling while the arms rotate from $180^\circ$ to $120^\circ$ and back, five seconds each way; both panels share one clock
- The five-arm illustration is static: all five arms reserve a half-pitch neighbour around one shared round hole
- Static stitched figures are the final Stitch state, including the same lightened measurements
- New slits, virtual slits, round holes and thread receive a brief ink-coloured glow. `revealGlow` in `colors.json` controls its enable switch, duration, opacity and width in output pixels. The default is $0.24\,\mathrm{s}$, $12\,\mathrm{px}$ wide, at $68\%$ peak opacity; motion alone does not retrigger it. The pulse uses existing frame time, preserving the phase timing and final holds. Still exports have no glow
- Clearance is a static construction view: no thread, no fade; retain the slit outlines, measurements and pass/fail marks
- Keep existing image paths working when changing animation to static. Vertex point, Clearance and Reject impossible fits export single-frame GIFs alongside their PNG/SVG stills; these GIFs contain no animation or loop
- Use the same display rules in every example. Finer frame stages belong within these phases; review the transitions and completed result at $600\,\mathrm{px}$ width
- Select measurements using the [annotation policy](#annotation-policy). Apply that selection in every phase and static view

## Annotation policy

Dimensions explain the figure's particular comparison or construction. Identify adjustments consistently even when their numeric values are omitted. Each illustration's `measurementPolicy` in [the catalog](../../tests/cases.json) records which quantities are shown.

### Identification and measurement

| Annotation | Meaning | Display rule |
| --- | --- | --- |
| Blue guide segment and `I` marks on bordering slits | Gap differs from nominal pitch | Show every adjusted ordinary gap, following the guide on curves. Colour follows the current geometry during motion |
| Dimension bracket and value | A measured distance | Treat them as one annotation: appear, update and fade together. Dimension only the quantities selected below |
| Red segment, with a value when its amount matters | Residual left to distribute | Draw directly on the guide without end ticks. Update with the layout and remove the segment and any value when resolved |
| Red angle annotation | Visible thread direction relative to an arm | Show with the thread; retain contrast in the final view |

- Blue identifies a spacing change; it does not certify feasibility. Rejected examples retain their rejection mark and reason
- Closure uses unnumbered red residual arcs because the comparison concerns the remaining mismatch at the reserved start. Spacing comparisons retain residual values because the amount being distributed is part of their explanation
- A gap dimension measures opening centre to centre. On a curve, its bracket follows the straight chord even though the blue guide highlight follows the arc
- A corner-step dimension measures real slit centre to virtual slit centre. An adjusted corner step uses a blue guide highlight and dimension; only its real slit receives `I` marks. A visible-thread dimension measures between slit tips or hole centres at the thread's endpoints
- A branching junction's half-pitch connection is fixed geometry. Its dimension stays neutral; it receives no blue adjustment marks
- Distances from a real slit to an A6 corner hole are consequences of the corner construction, not adjusted gaps. Alternative corner treatments use their stated nominal-spacing baseline
- State nominal pitch once in the figure or surrounding comparison text. Repeated nominal dimensions are reserved for examples where comparing all gaps is the point
- Use one bracket and value per contiguous block of equal adjusted gaps. Different values receive separate dimensions; all affected gaps retain blue highlights and slit marks
- Keep numeric lengths in the shared monospace font, regular weight and two decimal places. Keep units in the surrounding explanation or one figure label. Symbolic glossary labels remain symbolic
- Keep bracket endpoints tied to the measured points. Place values beside their brackets with consistent offsets and clear separation from thread, slit marks and other labels. Use the shared renderer and theme settings

### Selection by purpose

| Figure purpose | Measurements |
| --- | --- |
| Spacing problem and completed solutions | Every gap, plus the unresolved residual |
| Rejected fit | Every candidate gap and applicable bound. Keep nominal pitch and total span in the surrounding text |
| Landmark and redistribution | Protected nominal gap; one representative per adjusted block. Label the free spans |
| Two-arm construction | The virtual-to-real corner step being explained. Omit ordinary arm-gap dimensions |
| Corner appearance comparison | Adjoining visible thread lengths and angles. Omit arm-gap dimensions |
| Branching construction | One representative half-pitch centre distance. Add representative adjusted-gap dimensions where fitting is part of the lesson |
| T-junction treatment comparison | Visible connection lengths and angles for each arm; both treatments show the same quantities |
| Worked case reconstruction | Only measurements that explain the case's difference. Retain adjustment identification elsewhere |
| Closure or matched layout | Adjustment identification; no repeated nominal dimensions |
| Guide, slit, chord and glossary definitions | The quantities being defined, with endpoints or leaders identifying their geometric meaning |
| Clearance | The tested opening separation and pass/fail result; no pitch dimensions |
| Finished artwork overview | No measurements. Construction close-ups may label free spans and show residuals and representative adjusted gaps |

### Phase behaviour and review

- Build: show the selected construction dimensions at normal contrast; omit thread-length dimensions until their thread exists
- Adjustment: update endpoints and numbers from the same current geometry. Blue marks track current deviations from nominal; red tracks the remaining residual
- Stitch: fade each length bracket and its value together to secondary grey, or light blue for adjusted gaps. Keep blue guide highlights and slit marks visible. Retain selected final measurements and red angles
- Finishing touches: an artwork overview may remove construction annotations together. Explanatory static views keep the corresponding construction or Stitch state
- Checks must cover bracket/value pairing, numeric formatting, phase colours, measured endpoints and the selected quantities. Inspect the final view and representative moving frames at their published size

## Spacing setup

Each solution begins with the same nominal row and residual. `pitch-problem` is the shared setup fixture; the pitch compares only the three completed solutions.

## Even spacing

Distribute the openings evenly between the endpoints. It fits, but every gap departs from the tool's nominal spacing.

![Redistribute every gap](assets/pitch-spread.gif)

## End adjustment

Keep four gaps nominal and adjust the last one.

![Adjust the last gap](assets/pitch-end.gif)

## Autostitch

Absorb the residual in the fewest adjusted gaps, centred between the fixed endpoints.

![Absorb the residual in the central gap](assets/pitch-autostitch.gif)

All four use `ILL-S02`: six slits on the same centred $15.3\,\mathrm{mm}$ guide, $3\,\mathrm{mm}$ pitch, $1.5\,\mathrm{mm}$ slits and $40^\circ$ lean. Even spacing has five $3.06\,\mathrm{mm}$ gaps. The other two have four nominal gaps and one $3.3\,\mathrm{mm}$ gap, at the end or in the centre. Slits remain solid; `I` marks identify adjusted spacing. Every gap value updates as the residual falls from $0.30\,\mathrm{mm}$ to zero.

Each solution starts at the problem's completed residual state and proceeds directly to redistribution. Motion compares layout revisions, not the movement of already-punched holes or the solver's execution order.

## The corner problem

`ILL-CORNER-PROBLEM`: the same right-angle guides, at $3\,\mathrm{mm}$ pitch with eight intervals per arm. Compare Vertex point, Bridge, Shared diagonal slit with mirrored lean, and Autostitch. The diagonal slit and Autostitch retain the outer endpoints. Vertex point and Bridge move their vertical rows, including the far endpoint, while retaining nominal spacing within both arms.

![Nominal rows joined by a round hole at the vertex](assets/problem-corner-vertex-point.png)

![Compare bridge length and angle balance](assets/problem-corner-bridge.gif)

![Shared diagonal slit with mirrored lean](assets/problem-corner-mirrored.gif)

The common arm lengths are $L_i=np-c_i/2$, with $n=8$ and $c_i$ the signed shift from the guide vertex to the A6 virtual centre along each arm's incoming direction. This gives approximately $23.471688\,\mathrm{mm}$ and $23.953779\,\mathrm{mm}$. Vertex point keeps nominal arm spacing and shifts the vertical row to balance its corner connections. Vertex point absorbs the residual in the final connections to its fixed hole; Bridge joins the last nominal slits directly. A6 alone uses the minimum-adjustment selector and reserves a nominal step next to each virtual slit. The controlled balance is a fixture choice, not a general result for arbitrary endpoints.

Vertex point translates its vertical row upward by $0.4821\,\mathrm{mm}$. The fixed vertex hole then joins two equal $1.9574\,\mathrm{mm}$ visible stitches at $14.3^\circ$ to their respective arms. The final gaps into the hole are both $2.4717\,\mathrm{mm}$; internal arm gaps remain nominal. Move the outgoing virtual slit and end marker with the row. The still and compatibility GIF use this balanced layout.

Bridge advances the incoming row by $0.50\,\mathrm{mm}$ along its guide, preserving nominal pitch, so a $1.00\,\mathrm{mm}$ bridge is reachable. The vertical row then moves between $1.00$ and $3.00\,\mathrm{mm}$ of visible thread. Expand for $2.14\,\mathrm{s}$, hold for $0.5\,\mathrm{s}$, contract for $2.14\,\mathrm{s}$ and hold for $0.5\,\mathrm{s}$. Ease into each hold; omit duplicate endpoint frames and reset frames. Slits remain faded and thread stays visible throughout. The still uses the $1.00\,\mathrm{mm}$ position. Range, initial advance and endpoint hold are stored in the test catalog.

The mirrored treatment reuses `diagonalCornerScene` with the Sellier construction parameters from `ILL-SELLIER-CORNER`, extended to the common arm lengths. Its rows stay nominal from the outer endpoints; only the final gaps into the vertex slit absorb the residuals. These are approximately $2.472\,\mathrm{mm}$ and $2.954\,\mathrm{mm}$; the first is below the Autostitch gap bound. Total absolute adjustment matches A6, but the adjusted-gap count does not. Both rows are present in the first frame; the vertical row immediately mirrors in place before the shared diagonal slit appears. Omit arm gap dimensions. Show only the two visible corner-thread lengths and red thread angles when the thread appears; length dimensions lighten with the slits.

The Autostitch solution starts with a nominal horizontal row. Its terminal virtual slit's lower tip locates the outgoing virtual slit and its nominal vertical row, initially beside the vertical guide. Keep the selected tips coincident and translate the entire vertical row sideways with the incoming virtual slit and its preceding real slit until the row reaches the guide. The horizontal motion opens a residual beside the incoming neighbour. Hold the corner construction, then distribute residual within both arms and restore the specified outer endpoints. Guides and endpoint targets stay fixed throughout the planning sequence. Omit arm gap dimensions throughout; show only the two corner thread lengths and red angles with the final thread. The final incoming arm has two $3.264\,\mathrm{mm}$ adjusted gaps; the outgoing arm has one $3.046\,\mathrm{mm}$ adjusted gap. `I` marks identify them. Reveal the thread together and hold for four seconds.

![Resolve the virtual crossing and fit both arms](assets/problem-corner-autostitch.gif)

Motion shows planning revisions, not physical punching order; the analytic construction and fit selector do not execute the CAD plugin.

## Comparison notation and totals

- Vertex point is a static final thread view. Holes and length dimensions use the same secondary colours as the final animated views; angle annotations stay red. Length brackets measure visible thread between slit tips or the round-hole centre, in millimetres
- Corner thread angles use red wedges, arcs, leaders and values, with regular $13\,\mathrm{px}$ degree labels rounded to one decimal. Measure each visible thread against its arm direction; Bridge uses the same thread against both arms. Reveal them with the thread and retain their contrast during the final hold; they are annotations, not an aggregate score
- Apply the [annotation policy](#annotation-policy) to brackets, values, residuals and static views
- `pitchComparisonMetrics` calculates comparison totals for analysis; the pitch uses the diagrams and their corner measurements
- Spacing treatments share the initial residual, including the unfitted nominal row. The bridge uses its direct endpoint span rather than the abandoned path through the vertex. Autostitch corner steps are nominal and use virtual centres for pitch accounting
- Comparison totals include out-of-bound final gaps in the vertex treatments. The Bridge analysis totals and still use its $2.00\,\mathrm{mm}$ position. Visible thread-length deviation includes the actual connections to the Autostitch round hole

Recalculate totals from the repository root:

```powershell
node --input-type=module -e "import {createScenes,pitchComparisonMetrics} from './examples/illustrated/scenes.mjs'; for(const s of createScenes().filter(s=>s.name.startsWith('pitch-')||s.name.startsWith('problem-corner-'))) console.log(s.name,pitchComparisonMetrics(s));"
```

## Axioms in geometry

### Follow the guide; keep the slit profile: A1-A3

A slit follows the labelled local tangent without changing length or lean. Tangent motion runs at half speed, with two-second reading holds at both ends. The guide ends after five nominal $3\,\mathrm{mm}$ chords at radius $10\,\mathrm{mm}$; no adjusted gaps. Pitch is the direct chord between centres. `ILL-CURVE`, using the arc geometry from `A01`.

![Slit orientation follows the curve; pitch is a chord](assets/axiom-curve.gif)

### Reserve a landmark pair: A4, A5, A7

Seven slits on each side of the central landmark. Extending the guide preserves the $0.50\,\mathrm{mm}$ residual per span while adding nominal runs around each adjustment block. Each free span has two central $3.25\,\mathrm{mm}$ gaps, with nominal gaps at its ends; the protected landmark gap remains $3\,\mathrm{mm}$. The animation moves the adjustments away from the feature while maintaining mirrored positions and fixed openings. `ILL-LANDMARK`: $40\,\mathrm{mm}$ guide, L1 at $20\,\mathrm{mm}$.

Dimension the protected pair and one gap in each equal-adjustment block. Mark every adjusted gap; omit repeated nominal values.

![Adjustments move into the free spans while endpoints and the landmark pair stay fixed](assets/axiom-landmark.gif)

### Construct the corner hole: A6

Stitch towards the corner along one arm, ending at its dashed virtual slit. Approach from the other arm the same way. The two terminal virtual tips meet at one round hole. The `s`, `e` and `j` labels remain visible throughout. `J02`. Guide extents end at the outermost slits; all three steps on each arm are nominal.

![Each arm approaches its terminal virtual slit before their shared corner hole is identified](assets/axiom-corner.gif)

### Share the smooth join: A8

The straight and curved portions use one slit at their common tangent. Revealing both portions does not add a second opening there. `A05`.

![Straight and curved portions share one slit](assets/axiom-smooth.gif)

### Share the branching junction: A9

Five slits on each arm approach one shared round hole. Reveal all three arms together, one slit per arm at each step. Keep the endpoints and half-pitch junction neighbours fixed; split each $0.6\,\mathrm{mm}$ residual across two $3.30\,\mathrm{mm}$ gaps. `ILL-JUNCTION`.

Dimension one half-pitch connection and one representative gap per adjusted block. The curved X construction uses the same selection; its dimensions measure chords.

![A T junction shares one hole with half-pitch neighbours on each arm](assets/axiom-junction.gif)

The curved X example reserves one round hole and four half-pitch chord neighbours, then fits the free spans with fixed outer endpoints. Pitch is $3\,\mathrm{mm}$; the circular arm has radius $20\,\mathrm{mm}$. Its advances use chord lengths. Geometry and inputs are recorded in `ILL-JUNCTION-COMPARISON`.

Gap bounds, fixed neighbours, endpoint positions and opening clearance are checked. The thread appears after fitting and holds for four seconds. This is an analytic illustration, not a native solver run.

![Autostitch X junction with a curved arm](assets/axiom-junction-curved.gif)

#### T-junction comparison

[Open the synchronized comparison](t-junctions/index.html). Vertex point and Vertex point at half pitch sweep from $180^\circ$ to $120^\circ$ in five seconds, then reverse for five seconds. Both panels use the same clock and final-Stitch styling. They export GIFs only.

- One round hole stays at the intersection. Vertex point reserves neighbours at $p$; half pitch reserves them at $p/2$ on every arm
- Red angles measure visible junction thread against each arm's inward guide direction: $11.24^\circ$ for Vertex point and $27.52^\circ$ for half pitch. The caption gives the separate angle between the upper arms
- Pitch $3\,\mathrm{mm}$, slit length $1.5\,\mathrm{mm}$, lean $40^\circ$, slit width $0.2\,\mathrm{mm}$, hole diameter $0.5\,\mathrm{mm}$ and clearance margin $0.2\,\mathrm{mm}$. Arms extend $18.4\,\mathrm{mm}$ from the vertex
- `ILL-T-JUNCTION-STUDY` records the inputs. Full pitch motivates the accepted half-pitch rule; both are analytic constructions, not native CAD qualification

#### Five-arm junction

![Five half-pitch arms share one round hole](t-junctions/five-half.png)

- Every first slit is $p/2$ from the shared hole, independent of arm angles or count
- Each guide is $13.5\,\mathrm{mm}$ long: a $1.5\,\mathrm{mm}$ junction connection followed by four nominal $3\,\mathrm{mm}$ gaps. No spacing adjustment is needed
- Dimension one hole-to-slit centre distance; omit the repeated nominal gaps
- Keep captions outside this embedded figure. Use the shared filled round hole and route notation; place the representative dimension clear of the other arms
- `ILL-FIVE-ARM-STUDY` records the static $120^\circ$ upper-arm layout. Checks cover the single shared hole, five incident threads, half-pitch distances, fitting, clearance and framing

### Check the whole layout: A10

Two fixed arms meet at $6^\circ$. Two outer pairs pass, the next leaves only $0.04\,\mathrm{mm}$ clearance, and the nearest pair overlaps. Checks and crosses identify the result; numbers use the model's conservative clearance calculation in millimetres. Static construction view with sharp rectangular slits, no thread and no fading. With $w=0.3\,\mathrm{mm}$ and $m=0.2\,\mathrm{mm}$, the complete layout is invalid. `ILL-CLEARANCE`.

![Pairs farther from the junction pass clearance; pairs near it fail](assets/axiom-clearance.png)

## Further model examples

### No permitted fit

For a $7\,\mathrm{mm}$ span at $3\,\mathrm{mm}$ pitch, two equal gaps are too long and three are too short. Reject the span rather than move its fixed ends. `ILL-NOFIT`.

Two vertically separated rows repeat the same guide span. Dimension every centre-to-centre gap. Small red crosses identify slits too far apart ($3.50\,\mathrm{mm}$ exceeds the $3.30\,\mathrm{mm}$ maximum) or too close together ($2.33\,\mathrm{mm}$ falls below the $2.70\,\mathrm{mm}$ minimum). Static construction, without thread or fading.

![Two gaps are too long; three gaps are too short](assets/fit-rejected.png)

### Loop closure

Nominal spacing misses the reserved start on a $9.80\,\mathrm{mm}$ radius circle. A diameter supplies two opposite landmarks, L1 and L2. Reserve a nominal pair around each, then fit the two equal free arcs. Each half needs three exactly centred adjusted gaps of approximately $3.22\,\mathrm{mm}$; the blue intervals mirror across the diameter. Unnumbered red arcs show the closing mismatch before fitting; their lengths change with the unresolved residual. The upper protected pair includes the closing gap; count the start opening once. `ILL-CLOSURE`.

![Close the loop and reuse the start opening](assets/axiom-closure.gif)

### Matched guides

Solve one source, then reveal corresponding openings on its reflected copy. The copy retains the whole layout, including adjusted gaps and reflected slit axes. `ILL-MATCHED`.

![One solved layout copied to a reflected guide](assets/matched-guides.gif)

### Curved corners

The same approach along each arm applies to an arc/line pair and an arc/arc pair. Each virtual slit continues the position and orientation of its row. All three examples have three real slits per arm and two virtual slits, with identical $16.6\,\mathrm{s}$ timelines. The arc/arc illustration extends the outgoing outer end to fit its third nominal slit; its circle and corner construction stay fixed. `A03`, `A04`.

![Curved and straight arms share a corner hole](assets/corner-arc-line.gif)

![Two curved arms share a corner hole](assets/corner-arc-arc.gif)

### Shallow curved corner

The outgoing corner step increases to approximately $3.21\,\mathrm{mm}$ to bring its neighbour onto the finite arc. `J08`.

![A bounded corner adjustment keeps the neighbour on its guide](assets/corner-shallow.gif)

## Glossary close-ups

The [glossary](../../docs/GLOSSARY.md) uses four static figures with aligned labels and horizontal or vertical leaders.

![Guide, gaps, landmark and free span](assets/terms-layout.png)

`ILL-TERMS-LAYOUT`: the full `F02` layout, with nominal, adjusted and protected gaps identified.

![Slit axis, length, width, lean and tangent](assets/terms-slit.png)

`ILL-TERMS-SLIT`: magnified profile with $\ell=1.5\,\mathrm{mm}$, $w=0.15\,\mathrm{mm}$ and $\alpha=40^\circ$.

![Junction, shared round hole and three arms](assets/terms-junction.png)

`ILL-TERMS-JUNCTION`: the same T junction as `ILL-JUNCTION`, with each arm identified.

![Chord length compared with arc length between the same slit centres](assets/terms-chord.png)

`ILL-TERMS-CHORD`: a nominal $3\,\mathrm{mm}$ chord on a $3\,\mathrm{mm}$ radius. The corresponding arc length is $\pi\,\mathrm{mm}$.

## Reproduce

### T comparison and five-arm junction

[t-junctions.mjs](t-junctions.mjs) uses the shared renderer, colours and label styles. The two T-junction GIFs, static five-arm SVG/PNG and comparison page live in [t-junctions/](t-junctions/). The T comparison uses `exportStills: false`; the five-arm figure exports only SVG/PNG.

```powershell
./examples/illustrated/build.ps1 -SceneScript ./examples/illustrated/t-junctions.mjs -OutputDirectory ./examples/illustrated/t-junctions
node examples/illustrated/t-junctions.mjs check
node tests/validate-cases.mjs
```

Checks cover fitting, clearance, matching guides, thread-angle measurements, shared fade colours, reverse-frame symmetry and continuity at both turnarounds. Each GIF contains 250 frames at four centiseconds, for a ten-second loop.

### Emblem construction

[Animated preview and storyboard frames](emblem/emblem-preview.html). [GIF](emblem/emblem-construction.gif), [SVG](emblem/emblem-construction.svg), [PNG](emblem/emblem-construction.png). Used in PITCH's Model and solution section.

- Edit [emblem.storyboard.json](emblem.storyboard.json) for timing, camera targets and commentary. Times and durations are seconds. Camera moves use named views, with linear or smoothstep easing; pan and zoom run independently of construction.
- Targets are `A`, `U`, `T`, `O`, `script-S-1`, `script-t-2`, `script-i-3`, `script-t-4`, `script-c-5`, `script-h-6`, `ring-110`, `ring-95` and `ring-80`. `lettering-rest` and `rings` select groups.
- Actions are `mark-landmarks`, `reveal-fixed`, `lay-out`, `adjust`, `stitch`, `fade-openings` and `punch`. All lettering supports fixed-feature reveal and adjustment. Rings use nominal spacing and skip adjustment. `fade-openings` targets `all` after stitching, removing slit outlines, round holes and spacing marks while retaining thread. `punch` targets `i-dot` after the fade: a brief impact overshoot and glow settle to the dot's actual radius. The overview Stitch actions set `glow: false`; only the dot pulses at the finish. A layout action can set `residualDelay` and `residualFade` to pause and fade in red residual annotations before redistribution. Each stitched target follows Build, optional Adjustment, then Stitch. Unknown targets, duplicate actions, invalid phase order and overlapping camera moves fail validation.
- The 40-second sequence opens on A with "Set symmetry". Its two crown landmarks appear in sequence from 0.2 to 0.8 seconds. "Resolve fixed openings" begins at 1.5 seconds, nominal gaps at 3, redistribution at 7 and thread at 12. After layout finishes at 6 seconds, red residual annotations wait 0.35 seconds, then fade in over 0.25 seconds. The 12-second pullback begins at 14 seconds. The remaining lettering builds from 14.5 seconds, redistributes from 20 to 25 and stitches at 25.7. Rings build from 18 to 24 seconds and stitch at 25.7. Openings and spacing marks fade from 26 to 26.25 seconds. The i dot punches into the thread-only emblem at 26.3 seconds and settles at 26.75 seconds, then holds until 40 seconds. There is no full-emblem flash.
- `guides` controls visibility with `target`, `from` and `until`. Only A's guides appear, from 0 to 14 seconds. Its guides, virtual slits and detailed annotations disappear as the pullback starts. Other guides never appear. The last step label ends at 14 seconds using its commentary cue's `until`; the pullback and final hold have no text.
- `emblem.mjs` reads finished openings, thread, spacing marks and virtual slits from the committed native SVG. It reads the lettering's literal stroke definitions and transforms from `emblem.lsp`; ring guides follow circular connections between native openings. The covered dot-fill decoration is omitted. No temporary export or CAD session is needed to render.
- All lettering and rings use $2.7\,\mathrm{mm}$ nominal pitch. The A has two crown-apex landmarks, one per contour, with mirrored crown stations and fixed nominal gaps across the apices. Initial lettering positions use nominal advances within each free run. Shared round holes and landmark pairs split the runs; their boundary slits remain fixed during interpolation to the exported layout. The A close-up measures the two outer-crown free spans beside its landmark. Other spans retain blue adjustment identification without dimensions. Blue guide highlights and slit marks follow the current opening positions during adjustment, including the overview. The other letters move at their actual geometric scale during the pullback. Motion is explanatory, not physical cutting order or the native solver's execution trace. Native regeneration and save/reopen checks passed on 2026-11-10; see [the demo recipe](../demo.md).
- `ILL-EMBLEM-STORYBOARD` checks exported coordinates for all 1,077 openings including the dot. Thread adjacency identifies the three branching holes: the two script t crossings have four neighbours each, and the h has three. Every neighbour stays fixed at a $1.35\,\mathrm{mm}$ chord from its hole. Checks also cover crown symmetry and fixed landmark pairs, redistribution on every letter independently of camera motion, guide isolation, annotation cutoff, thread-only finish, camera continuity, phase order, random-access frame evaluation and GIF timing. Source precision is limited by the committed SVG export.
- The canvas remains $600\times750$ px. This emblem tour permits camera movement; comparison figures retain their shared fixed camera. Short step labels inside the GIF use the shared `termLabel` and `displayElements` styling at one fixed position below the drawing. Edit each commentary cue's `text` in the storyboard; `phase` records Build, Adjustment or Stitch without adding a second heading. Theme colours, glow and fonts come from `colors.json`.
- The A close-up uses the pitch's notation and dimension helpers: `s` for the two closed contour starts, `j` at the eight corner holes, `L1` and `L2` for the two crown landmarks, brackets labelled "Free span", numeric adjusted-gap dimensions, red residuals and blue adjusted gaps. Dimension and residual-value annotations are limited to the two outer-crown spans of A. Build labels those free spans and residuals; Adjustment replaces the span labels with one representative dimension per current contiguous equal-adjustment block. Every adjusted gap stays highlighted, including unmeasured spans. Adjusted dimensions fade during Stitch. Detailed dimensions leave the view as the camera pulls out. Finishing touches remove the remaining construction marks; the finished artwork has no measurements or adjustment marks.

```powershell
./examples/illustrated/build.ps1 -SceneScript ./examples/illustrated/emblem.mjs -OutputDirectory ./examples/illustrated/emblem -FrameTimes 0,6,9,12.5,19,22.5,27
node tests/validate-emblem-storyboard.mjs
node tests/validate-cases.mjs
```

`-FrameTimes` saves review PNGs in the build's unique `output/scratch/` folder and retains it for review; the renderer prints its path. The GIF, final SVG/PNG and HTML preview are rebuilt together. Repeated holds are encoded as longer frame delays; every moving frame is evaluated directly from its timestamp. Use the same renderer and fonts for repeatable raster output.

### Existing pitch figures

From the repository root, using Node and Windows PowerShell with built-in `System.Drawing` and WPF. No packages or CAD session are needed.

```powershell
./examples/illustrated/build.ps1
node tests/validate-illustrated.mjs
node tests/validate-cases.mjs
```

- `scenes.mjs`: catalog inputs, analytic constructions, diagram elements and reveal timing.
- `build.ps1`: renders those elements and encodes the frames. A unique `output/scratch/` folder holds intermediates and is deleted after successful export checks. Failures, `-KeepScratch` and explicit `-FrameTimes` requests retain it and print its path. Remove retained scratch after review; see [cleanup rules](../../docs/REPO-CLEANUP.md).
- `assets/<name>.animated.svg`: self-contained looping vector illustration used in `PITCH_authored.md`. The normal build also writes GIF/MP4 versions. Matching `.svg` and `.png` files contain the final state; static figures do not get animated SVGs.
- Rebuild only the animated SVGs with `node examples/illustrated/scenes.mjs animated-svg examples/illustrated/assets`. Use the corresponding scene script and output directory for `t-junctions`, `emblem` and `counter_examples`. Check all exports and pitch links with `node tests/validate-animated-svg.mjs`.
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

The builder reads catalog inputs and analytic JavaScript scene recipes. It does not load the production LISP solver. Its thread connections follow `ast:cad-write-thread`: positive slit tip to the next negative tip, or the centre of a round hole. Native artwork regeneration uses [the demo commands](../demo.md).

## Figure rules

- Fixed $600\times750$ px canvas and framing throughout each loop.
- Geometry on a plain background. No headings, scorecards, counters, banners or duplicate prose inside the image.
- Only local dimensions and feature labels needed to follow the current step.
- Follow the [animation phases](#animation-phases); show only the construction and adjustment needed for the example.
- Keep comparison geometry and tool profile identical. Do not exaggerate small pitch changes.
- Use movement to explain construction and decisions; do not merely fade in a finished infographic.
- Animation is the primary example. Keep a still fallback and editable vector elements.
- Use light rectangular slit outlines and heavier thread. Clearance examples retain the specified physical slit width.
