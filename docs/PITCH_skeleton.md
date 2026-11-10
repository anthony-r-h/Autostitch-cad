# Introduction

## From design to execution

- Design sets the seam path and its intended appearance; making it requires discrete, oriented openings
- Geometric layout is a constrained placement problem: choose opening positions, orientations and gap counts while preserving the intended seam
- Physical execution produces those openings; craft judgement connects the design, geometric layout and tool use

## Pricking irons and nominal pitch

- Round holes are rotationally symmetric; slits have length, width and orientation that shape the visible thread
- A multi-tooth iron fixes the spacing between openings, but seam lengths rarely divide into whole nominal gaps
- Where and how much spacing changes affects both appearance and tool use
- Adjusted gaps can require individual placement with an awl or single tooth

## From manual judgement to explicit rules

- Digital arrays create many objects; fitting and revising the seam requires manual edits
- Physical layout relies on judgement developed through practice, repeated for each pattern
- Encode that judgement in repeatable placement instructions: preserve nominal spacing where possible and identify every adjustment
- Reject layouts that cannot satisfy the rules so the design can be revised
- Ground the axioms in manufacturability with the intended tools, visual balance through consistent lean and deliberate adjustments, and precision through explicit constraints and reproducible geometry

# Terms

- **Guide and stitch line:** the guide carries the slit centres; one stitch line can follow several connected guides
- **Slit and lean:** a slit has length, width and an axis between its tips. Lean is the angle of that axis to the guide's local tangent
- **Gap and pitch:** a gap is the direct distance between consecutive opening centres; pitch $p$ is the target. On a curve, the gap is a chord, while arc length follows the guide
- **Nominal, adjusted and protected gaps:** nominal gaps equal $p$; adjusted gaps depart from $p$ within the fitting bounds; protected gaps stay nominal
- **Landmark and free span:** a landmark fixes a nominally spaced pair of slits around a reference position, with no opening at the reference itself. Endpoints, landmarks and junctions bound the free spans where the remaining openings are fitted
- **Junction and arms:** a junction is where stitch lines meet. Each direction away from it is an arm: two at a corner, three at a T, four at an X. A through-line contributes two arms
- **Virtual slit:** an unpunched construction slit toward which an arm is laid out. In an Autostitch corner, the terminal virtual slit tips meet at the shared hole
- **Clearance:** the shortest edge-to-edge distance between separate openings, accounting for slit width and hole diameter. The margin is the minimum allowed clearance
- **Residual and adjustment:** residual is the length left over or missing before fitting; adjustment is the change made to a gap. Absolute adjustment sums gap changes, counting compression and extension positively. On curves, residual uses arc length and adjustment uses chord length
- **Absolute stitch-length deviation:** total absolute difference between visible thread lengths and nominal straight-row stitches. It captures changes from spacing, curvature and corner treatment; it does not measure thread direction

![Guide, slit, gaps, landmark and free span](../examples/illustrated/assets/terms-layout.png)

# Two layout problems

- Spacing: fit a seam whose length is not a whole number of nominal gaps
- Corners: join rows of oriented slits while controlling the opening and thread at the turn
- Compare how each solution uses the iron, where adjustments occur, and what changes in the visible stitching

## The spacing problem

- Six slits on a $15.3\,\mathrm{mm}$ guide, at $3\,\mathrm{mm}$ nominal pitch
- Both endpoints must be met; the nominal row leaves a $0.30\,\mathrm{mm}$ residual
- Red segments and numbers show the residual; bracketed dimensions show gap lengths

### Even spacing

![Even spacing distributes the residual across all five gaps](../examples/illustrated/assets/pitch-spread.gif)

- Five equal $3.06\,\mathrm{mm}$ gaps
- A fit-to-length CAD pattern: divide the line equally between the chosen openings
- Each stitch line gets its own pitch, determined by its length and gap count
- Spacing is uniform within each line; different lines generally have different pitches
- The chosen iron cannot place those runs at their new pitches; every gap needs individual placement

### End adjustment

![End adjustment absorbs the residual in the last gap](../examples/illustrated/assets/pitch-end.gif)

- Four nominal gaps; one $3.30\,\mathrm{mm}$ gap at the end
- The last stitch takes the entire residual, making it longer or shorter than the rest
- Sharing the residual across more gaps makes each change smaller and easier to blend into the run, at the cost of more individual placements

### Autostitch

![Autostitch absorbs the residual between nominal runs](../examples/illustrated/assets/pitch-autostitch.gif)

- Four nominal gaps; one $3.30\,\mathrm{mm}$ gap in the centre
- Formalizes those decisions: bound each pitch change, use the fewest adjusted gaps needed, and centre them within the available span
- Share the residual equally across those gaps; keep the remaining runs at the tool pitch

### Spacing tradeoffs

- Even spacing solves the visual pattern; it gives up the common tool pitch across stitch lines
- End adjustment preserves the tool pitch through most of the line, but leaves one visibly longer or shorter stitch at the endpoint
- Autostitch borrows equal spacing for a selected adjustment block. The remaining runs keep the tool pitch; the correction sits away from fixed features

## The corner problem

- At a corner, two rows of angled slits must join into one continuous seam
- How those rows meet determines where the thread turns, whether slit lean stays consistent, and the length and angle of the adjoining stitches
- Red angles measure the entering and leaving thread against their respective guides, showing how each stitch approaches or leaves the corner

### Vertex point

![Nominal rows joined by a round hole at the vertex](../examples/illustrated/assets/problem-corner-vertex-point.png)

- Keep the round hole at the vertex and move the vertical run to balance the adjoining stitches
- Both angles are $14.3^\circ$; both visible stitch lengths are $1.96\,\mathrm{mm}$
- Arm spacing stays nominal; the far endpoint moves with the vertical run
- The two final gaps into the hole absorb the spacing change

### Bridge

![Bridge varies from 2 to 3 mm of visible thread while the corner angles change](../examples/illustrated/assets/problem-corner-bridge.gif)

- Thread bridges the last slit on each arm, bypassing the vertex
- Move the vertical run to vary the visible bridge stitch from $2.00$ to $3.00\,\mathrm{mm}$; the red angles change with it
- Both positions retain nominal arm spacing; the far endpoint moves with the row
- The table uses the $2.00\,\mathrm{mm}$ position

### Shared diagonal slit with mirrored lean

![A shared diagonal slit joins the top row to a row with mirrored lean](../examples/illustrated/assets/problem-corner-mirrored.gif)

- Refines Bridge: carry the turn through a shared diagonal slit at the vertex and mirror the vertical row
- Mirroring brings the outgoing corner stitch closer to the ordinary thread direction along that row
- Arm spacing stays nominal; the final gaps into the shared slit absorb the residual
- Length brackets show the two visible corner stitches; red angles show how they meet the arms

### Autostitch

![Autostitch aligns virtual slit tips and fits the remaining arm spans](../examples/illustrated/assets/problem-corner-autostitch.gif)

- Place the incoming row's pitch adjustments so its terminal virtual slit lands at the required offset past the vertical guide
- Slit length, lean and guide directions determine that offset; the selected tips of both virtual slits meet at one round hole
- The vertical guide fixes the outgoing arm's direction. With nominal corner steps, the entering and leaving thread both meet their guides at $27.5^\circ$
- Keep slit lean consistent and absorb the residual within the arm spans; the shared hole sits off the guide vertex

| Treatment | Number of adjusted gaps | Absolute adjustment ($\mathrm{mm}$) | Absolute stitch-length deviation ($\mathrm{mm}$) |
| --- | ---: | ---: | ---: |
| Vertex point | $2$ | $1.057$ | $0.259$ |
| Bridge | $1$ | $0.106$ | $0.087$ |
| Shared diagonal slit with mirrored lean | $2$ | $0.575$ | $0.407$ |
| Autostitch | $3$ | $0.575$ | $0.516$ |

- Totals include out-of-bound gaps in the vertex treatments

### Corner tradeoffs

- Keeping the opening at the vertex, keeping slit lean consistent and keeping the arm gaps nominal lead to different corner treatments
- Shared diagonal slit with mirrored lean gives less visible thread-length deviation here; Autostitch keeps consistent lean and bounded gaps, with an offset corner hole
- Autostitch ties the diagonal slit on total adjustment but changes more gaps. The choice depends on which geometric and manufacturing rules the pattern must preserve

# Why CAD

## Keep the pattern in its design environment

- Exact curves, dimensions, snaps and references define where the stitching belongs
- Retain existing drafting tools, libraries, constraints and production drawings
- Pattern guides and generated openings stay in the same drawing; source guides remain editable

## What arrays and linetypes leave unresolved

- Arrays repeat geometry; the user still resolves competing spacing and corner requirements
- Linetypes show a repeated pattern without specifying every opening's position
- Stitch layout needs tool geometry, protected features and fitting rules alongside the CAD geometry

## Specialized leathercraft CAD

- Comparison scope: Stitch Hero, Leathercraft CAD, LeatherCAD and EasyPatt
- Compare hole generation, pitch fitting, corner treatment, closure, slit profiles and matching holes across pieces
- Check each application's support for those features and its native CAD integration
- Separate design environments add project files and DXF/SVG transfers; editing continuity and retained CAD relationships matter

## The plugin approach

- Add stitch-placement rules to the CAD tools already used for the pattern
- Keep generated openings in manageable blocks on dedicated layers
- BricsCAD implementation; a potential AutoCAD port requires checking API compatibility
- Compare native drafting, stitch placement, tool profiles, file transfers and execution instructions across general CAD, specialized CAD and the plugin

# Axioms

## Guide, slit and pitch

- Real slit centres lie on the guide
- Slit length, width and lean remain fixed relative to the local tangent
- Pitch is direct centre-to-centre distance; on a circle, it is a chord

![A1 to A3: fixed slit geometry follows the guide; pitch is a chord](../examples/illustrated/assets/axiom-curve.gif)

## Fixed features

- Chosen endpoints, landmark pairs and junction neighbours stay fixed during fitting
- A landmark sits midway between a nominally spaced pair of slits
- The landmark gap is protected from adjustment
- Absorb each free span's residual in its unprotected gaps, within $0.9p\leq g\leq1.1p$
- Centre the adjustments within each span; the two sides can require different corrections
- Example: five slits on each side, with two central $3.25\,\mathrm{mm}$ gaps per span; the landmark pair stays $3\,\mathrm{mm}$ apart

![A4, A5 and A7: keep the landmark pair fixed while distributing bounded adjustments within each free span](../examples/illustrated/assets/axiom-landmark.gif)

## Shared openings

- A smooth change of curvature shares one slit at the common tangent
- Connected portions reuse a shared opening with the same centre, type and axis

![A8: a straight and curved portion share one compatible slit](../examples/illustrated/assets/axiom-smooth.gif)

- A closed loop reuses its start opening; the closing gap must fit

![A8: close the loop without duplicating its start opening](../examples/illustrated/assets/axiom-closure.gif)

## Two-arm corners

- Stitch along each arm towards the corner; the virtual slit is the terminal slit of that row
- Its position and orientation continue the approaching row
- The two terminal virtual slits meet tip-to-tip at one shared round hole
- Real neighbours lie on their arms, one corner step from the virtual centres
- Corner steps satisfy $0.9p\leq q\leq1.1p$; real neighbours stay on their finite guides

![A6: stitching approaches the corner along each arm, ending at virtual slits whose tips share one hole](../examples/illustrated/assets/axiom-corner.gif)

- The same construction applies to straight and circular arms

![A6: the selected tips meet at an arc-to-line corner](../examples/illustrated/assets/corner-arc-line.gif)

![A6: the selected tips meet between two curved arms](../examples/illustrated/assets/corner-arc-arc.gif)

## Branching junctions

- A through-line contributes two arms; a T has three and an X four
- Three or more arms share one round hole at the guide intersection
- Each arm's first neighbour is one nominal pitch from that hole

![A9: a T junction reserves one hole and its nominal neighbours](../examples/illustrated/assets/axiom-junction.gif)

### X junction with a curved arm

- One round hole shared by four arms, including a circular arm
- Nominal chord gap from the hole to each neighbouring slit
- Fixed endpoints and neighbours; bounded corrections within the remaining spans

![Autostitch X junction with a curved arm](../examples/illustrated/assets/axiom-junction-curved.gif)

## Clearance

- Distinct openings must remain disjoint and retain the required edge-to-edge margin
- Check all openings together, including separate guides and closure
- Acute junction: the nearest pair overlaps; the next pair misses the required margin; farther pairs pass
- Example: included angle $6^\circ$, slit width $w=0.3\,\mathrm{mm}$, margin $m=0.2\,\mathrm{mm}$

![A10: clearance fails near the acute junction and passes farther along its arms](../examples/illustrated/assets/axiom-clearance.gif)

# Model and solution

- Resolve the continuous guide into ordered openings with fixed tool geometry
- Satisfy the geometric constraints, minimize nonstandard gaps and specify their positions

## Fit the free spans

- Fit between the fixed openings at endpoints, landmarks and junctions
- Prefer nominal corner steps; adjust only as needed to keep a neighbour on its finite arm
- Minimize adjusted gaps; then prefer exact centring, smaller pitch change and fewer gaps
- Use equal spacing within one adjustment block per free span
- Place the block as centrally as protected gaps allow; half-index ties go toward the end
- On circles, convert chord spacing to angular advance
- A shallow turn can require an adjusted corner step: approximately $3.21\,\mathrm{mm}$ here
- Usable angles depend on pitch, slit geometry, hole diameter, clearance and available arm geometry

![A6: bounded corner adjustment brings a shallow curved neighbour onto its finite guide](../examples/illustrated/assets/corner-shallow.gif)

## Reject impossible fits

- Straight span, fixed endpoints, no protected gaps: a fit requires $0.9np\leq L\leq1.1np$ for an integer gap count $n\geq1$
- Shortest possible fit: $0.9p$. Every length $L\geq4.5p$ fits the spacing bounds; shorter lengths have gaps between feasible ranges
- Clearance remains a separate check
- At $p=3\,\mathrm{mm}$, every length from $13.5\,\mathrm{mm}$ fits; $7\,\mathrm{mm}$ fails because $2(3.3)<7<3(2.7)$
- Change the guide or its fixed features

![A5 and A7: no permitted gap count fits the fixed span](../examples/illustrated/assets/fit-rejected.gif)

# Even Big Fashion Gets It Wrong

Research note: Anthony to find stitching examples from:

- Hermès
- Louis Vuitton
- Loewe
- Delvaux
- Berluti
- Valextra
- Gucci
- Bottega Veneta



























# Pattern workflow

## Design intent

- Draw the seam with native CAD tools; connect guides belonging to one stitch line
- Set pitch, extent, direction, landmarks and junctions

## Geometric layout

- Resolve the position and orientation of every opening, including shared openings and closure
- Generate stitch blocks with opening geometry, adjustment marks and gap measurements
- Edit the source guides and regenerate

## Physical execution

- Follow the resolved positions and local spacing instructions
- Punching accuracy and stitching technique remain physical skills
- Variable-pitch equipment provides placement freedom; the layout still has to determine where that freedom is used
- Explicit geometry communicates those decisions between designer and maker, and across production runs

# Can you really?

- Curved lettering, clipped fills, shared junctions and controlled spacing in one pattern
- The same rules apply throughout the artwork

![Stitched emblem with interrupted concentric rings](../examples/demos/emblem.png)

![Can YOU really banner with stitched lettering, flow fill and diamond background](../examples/demos/can-you-really.png)

# Who it helps

## Craft and pattern design

- Make spacing and corner judgement available as reusable instructions
- Reduce layout effort while keeping control of the pattern
- More consistent layout across makers; physical execution still depends on skill

| Experience | Main benefit |
| --- | --- |
| Beginner | Usable geometric layouts with less prior layout experience |
| Intermediate | More precise, consistent placement decisions |
| Advanced | Fewer manual adjustments and easier revision |
| Expert | Efficiency, repeatability and standardization |

## Manufacturing

- Identify, quantify and locate nonstandard gaps before production
- Manual and semi-automated work: fewer spacing decisions left to the operator; clearer instructions for controlled placement
- Repeated production: the same design carries the same placement decisions across operators and runs
- CNC planning: resolved openings can supply placement geometry; variable spacing may add little execution effort when the equipment supports it
- Equipment integration and achievable tolerances depend on the production process

## Value by application

- Additional precision matters when stitch appearance or opening placement affects the product

| Context | Expected value |
| --- | --- |
| Ordinary industrial textiles | Limited where existing processes already meet placement tolerances |
| Precision leather goods | Control of visible regularity, symmetry and consistency |
| Small-batch luxury production | Repeatability with less manual layout effort |
| Bespoke leathercraft | Control over irregular geometry and individual pieces |
| Fully automated production | Explicit placement geometry for manufacturing planning, subject to equipment integration |
| Footwear and technical textiles | Useful where visible stitching or perforation placement needs tight control |

# Reference

- [Glossary](GLOSSARY.md), [axioms](AXIOMS.md), [mathematical model](MODEL.md), [junction construction](JUNCTIONS.md)
- [Demo drawings](../examples/demo.md), [figure sources](../examples/illustrated/README.md)
