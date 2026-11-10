# Limits

## Junction angle

The minimum effective angle is a geometric result of pitch $p$, slit length $\ell$, width $w$, lean $\alpha$, hole diameter $d$ and clearance margin $m$.

For two straight arms, the [angle equations](JUNCTIONS.md#angle-limits) give a closed-form limit when the stated contact geometry applies, and an exact distance test otherwise. Curved arms also require their radii, windings and available lengths.

Branching junctions fix every first slit at half-pitch chord distance from the shared hole. Their angle limits come from clearance between all resulting openings, not the two-arm formula. The rule has no visual angle cutoff; a collision rejects the layout.

Width and margin are required inputs to a finite-width result. They are currently unset by default, which evaluates $w=m=0$. This does not produce a finite-width angle limit.

## Unresolved geometric rules

- A landmark gap spanning a change of curvature needs a mixed-curve construction. The current landmark rule applies within one straight or circular segment.
- There is no symmetry constraint linking adjustments in separate free spans.
- Corner adjustment chooses the step nearest nominal that fits the finite arm. It does not search other step combinations to rescue a later clearance or span-fit failure.

## Outside the model

No automatic stitch regeneration, sewing itinerary, leather deformation model or tool-body collision check.

## Dependencies

- Windows.
- BricsCAD V22 with its bundled .NET support.
- OpenDCL 10.1.2.2.
