# Introduction

- A seam path expresses design intent; making it requires exact positions and orientations for individual openings
- Bridge design, geometric layout and physical execution: turn spacing and junction judgement into instructions someone can follow
- Pricking-iron slits have length and orientation as well as position; diagonal slits and their transitions shape the visible stitching
- Seam lengths and required features rarely fall on exact multiples of nominal pitch
- Manual arrays create many objects and make edits tedious; manual placement depends on spacing and junction judgement
- Encode that judgement in explicit rules, repeatable output and useful rejection when no valid layout exists
- An axiomatic approach grounded in manufacturability, visual balance and precision
- Bring specialized stitch-layout tools into established CAD: pitch, landmarks, corners and shared junctions from editable pattern guides

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

# Terms

- [Glossary](GLOSSARY.md): guide, slit, gap, landmark, junction and arm

![Guide, slit, gaps, landmark and free span](../examples/illustrated/assets/terms-layout.png)

# The spacing problem

- Seam lengths and required features rarely fall on exact multiples of the tool's pitch
- Manual arrays leave endpoint, landmark and junction adjustments to the maker
- Example: six slits on a $15.3\,\mathrm{mm}$ guide, $3\,\mathrm{mm}$ pitch, fixed endpoints

![Nominal spacing leaves a remainder at the fixed end](../examples/illustrated/assets/pitch-problem.gif)

## Naive solution

- Distribute six openings evenly: five $3.06\,\mathrm{mm}$ gaps
- Every gap departs from nominal tool spacing

![Naive solution: redistribute every gap](../examples/illustrated/assets/pitch-spread.gif)

## Good enough solution

- Keep four nominal gaps; absorb the remainder in one $3.3\,\mathrm{mm}$ gap at the end

![Good enough solution: adjust the last gap](../examples/illustrated/assets/pitch-end.gif)

## Autostitch solution

- Fix required features, then fit the intervening spans
- Use the fewest permitted adjustments, centred between those features
- Mark adjusted gaps for individual placement

![Autostitch solution: absorb the residual in the central gap](../examples/illustrated/assets/pitch-centre.gif)

# Why CAD

- Exact curves, dimensions, snaps and references define where the stitching belongs
- Pattern guides and generated openings stay in the same drawing
- Blocks contain the generated geometry; source guides remain editable
- Use existing drafting tools, libraries and production drawings

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
- Here, the left span uses one $2.75\,\mathrm{mm}$ gap and the right one $3.25\,\mathrm{mm}$ gap; the landmark pair stays $3\,\mathrm{mm}$ apart

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

- A shallow turn can require an adjusted corner step: approximately $3.21\,\mathrm{mm}$ here
- Usable angles depend on pitch, slit geometry, hole diameter, clearance and available arm geometry

![A6: bounded corner adjustment brings a shallow curved neighbour onto its finite guide](../examples/illustrated/assets/corner-shallow.gif)

## Branching junctions

- A through-line contributes two arms; a T has three and an X four
- Three or more arms share one round hole at the guide intersection
- Each arm's first neighbour is one nominal pitch from that hole

![A9: a T junction reserves one hole and its nominal neighbours](../examples/illustrated/assets/axiom-junction.gif)

## Clearance

- Distinct openings must remain disjoint and retain the required edge-to-edge margin
- Check all openings together, including separate guides and closure
- Acute junction: the nearest pair overlaps; the next pair misses the required margin; farther pairs pass
- Example: included angle $6^\circ$, slit width $w=0.3\,\mathrm{mm}$, margin $m=0.2\,\mathrm{mm}$

![A10: clearance fails near the acute junction and passes farther along its arms](../examples/illustrated/assets/axiom-clearance.gif)

# Model and solution

## Fit the free spans

- Fit between the fixed openings at endpoints, landmarks and junctions
- Prefer nominal corner steps; adjust only as needed to keep a neighbour on its finite arm
- Minimize adjusted gaps; then prefer exact centring, smaller pitch change and fewer gaps
- Use equal spacing within one adjustment block per free span
- Place the block as centrally as protected gaps allow; half-index ties go toward the end
- On circles, convert chord spacing to angular advance

## Reject impossible fits

- Straight span, fixed endpoints, no protected gaps: a fit requires $0.9np\leq L\leq1.1np$ for an integer gap count $n\geq1$
- Shortest possible fit: $0.9p$. Every length $L\geq4.5p$ fits the spacing bounds; shorter lengths have gaps between feasible ranges
- Clearance remains a separate check
- At $p=3\,\mathrm{mm}$, every length from $13.5\,\mathrm{mm}$ fits; $7\,\mathrm{mm}$ fails because $2(3.3)<7<3(2.7)$
- Change the guide or its fixed features

![A5 and A7: no permitted gap count fits the fixed span](../examples/illustrated/assets/fit-rejected.gif)

# Pattern workflow

- Draw the guides; connect those belonging to one stitch line
- Set pitch, extent, direction and landmarks
- Generate contained stitch blocks with opening geometry and placement notation
- Edit the source guides and regenerate

# Can you really?

- Curved lettering, clipped fills, shared junctions and controlled spacing in one pattern
- The same rules apply throughout the artwork

![Stitched emblem with interrupted concentric rings](../examples/demos/emblem.png)

![Can YOU really banner with stitched lettering, flow fill and diamond background](../examples/demos/can-you-really.png)

# Who it helps

- Makers: explicit hole positions and spacing adjustments
- Pattern designers: reusable layouts that remain editable
- Small-batch production: repeatable placement instructions

# Reference

- [Glossary](GLOSSARY.md), [axioms](AXIOMS.md), [mathematical model](MODEL.md), [junction construction](JUNCTIONS.md)
- [Demo drawings](../examples/demo.md), [figure sources](../examples/illustrated/README.md)
