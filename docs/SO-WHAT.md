# So what?

## A rules-based refinement of Vertex point

- For a 90-degree two-arm corner, Autostitch can be understood as a rules-based refinement of Vertex point: both join two slit rows through one round hole.
- Vertex point fixes the hole at the guide vertex, then adjusts how the rows approach it.
- Autostitch continues each arm towards the corner with a virtual slit of the same lean. The selected virtual slit tips meet at the shared round hole.
- Slit lean, slit length and corner angle determine the hole's offset. At a fixed 90-degree corner, changing lean or slit length changes that offset.
- The corner step runs from the last real slit centre to the virtual slit centre. It does not measure the distance to the round hole.
- The offset follows from the chosen construction. A hole at the vertex remains an alternative whose approach stitches and spacing must be assessed under its own placement rules.

## T and greater junctions as refined Vertex point

- At junctions with three or more arms, including T and X, Autostitch keeps one round hole at the guide intersection.
- Each first slit centre is half a pitch from the hole centre, measured as a chord on curved arms.
- On straight arms, each connection has the ordinary thread direction and half its visible length. Opposite equal-pitch arms read as one ordinary stitch through the hole.
- Apply half pitch to every arm. The treatment remains consistent as the arm angles change.
- Keep the hole and its neighbours fixed. Distribute each remaining span's residual through the fewest adjusted gaps needed, within the fitting bounds, with the adjustment block centred in the span.
- Curvature changes the local thread geometry. Finite spans, gap bounds and clearance still apply.

## Obverse and reverse stitch

- Proposed terms: **obverse stitch** uses the reference slit lean relative to the guide; **reverse stitch** uses its mirrored lean.
- The terms describe slit lean independently of travel direction and material face.
- Introduce both terms in the glossary before using them in the pitch.

## Reverse corner as a refinement of Bridge

- Proposed name: **Reverse corner** replaces "Shared diagonal slit with mirrored lean" in the pitch comparison.
- Bridge carries thread directly between the last slits on the two arms, bypassing the vertex.
- Reverse corner adds a shared diagonal slit at the vertex and mirrors the outgoing row's lean, joining an obverse row to a reverse row.
- In the pitch example, mirroring brings the outgoing corner stitch closer to the ordinary thread direction along that row.
- This is a refinement of Bridge within the comparison, without implying a historical development or a universally better result.
- The comparison can read: Vertex point, Bridge, Reverse corner and Autostitch.

## What Autostitch adds

- Formalize the corner placement choice so it can be repeated and revised with the pattern.
- Combine that construction with fixed endpoints and landmark pairs, bounded spacing adjustments, shared openings and clearance checks.
- Fit the remaining spans while preserving the resolved corner construction; reject layouts that cannot satisfy the rules.
- Assess the result against the intended tools and appearance. An offset hole alone does not establish a better seam.

## Implication for the pitch

- Present the corner treatment as an explicit geometric choice with visible tradeoffs.
- Explain the broader contribution through the combined rules and the placement decisions they resolve across a pattern.
- Keep the distinction between deriving a repeatable layout and establishing that its appearance is preferable.

See the [pitch comparison](PITCH_skeleton.md#the-corner-problem), [junction construction](JUNCTIONS.md#sharp-corners) and [corner-step definition](GLOSSARY.md#gap-and-pitch).
