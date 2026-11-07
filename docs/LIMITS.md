# Limits

## Junction angle

The minimum effective angle is a geometric result of pitch $p$, slit length $\ell$, width $w$, lean $\alpha$, hole diameter $d$ and clearance margin $m$.

For two straight arms, the [angle equations](JUNCTIONS.md#angle-limits) give a closed-form limit when the stated contact geometry applies, and an exact distance test otherwise. Curved arms also require their radii, windings and available lengths.

Width and margin are required inputs to a finite-width result. They are currently unset by default, which evaluates $w=m=0$. This does not produce a finite-width angle limit.

## Unresolved geometric rules

- A landmark gap spanning a change of curvature needs a mixed-curve construction. The current landmark rule applies within one straight or circular segment.
- There is no symmetry constraint linking corrections in separate free spans.

## Outside the model

No automatic stitch regeneration, sewing itinerary, leather deformation model or tool-body collision check.

## Dependencies

- Windows.
- BricsCAD V22 with its bundled .NET support.
- OpenDCL 10.1.2.2.
