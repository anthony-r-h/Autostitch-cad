# Limits

## Junction angle

The minimum effective angle is a geometric result of pitch $p$, slit length $\ell$, width $w$, lean $\alpha$, hole diameter $d$ and clearance margin $m$.

For two straight arms, the [angle equations](JUNCTIONS.md#angle-limits) give a closed-form limit when the stated contact geometry applies, and an exact distance test otherwise. Curved arms also require their radii, windings and available lengths.

Branching junctions fix every first slit at half-pitch chord distance from the shared hole. Their angle limits come from clearance between all resulting openings, not the two-arm formula. The rule has no visual angle cutoff; a collision rejects the layout.

Width and margin are required inputs to a finite-width result. They are currently unset by default, which evaluates $w=m=0$. This does not produce a finite-width angle limit.

## Unresolved geometric rules

- A landmark gap may cross continuing segment joins within one guide. Protected corners and junctions bound that gap.
- Continuous fitting searches centrally placed equal-adjustment blocks numerically. Failure does not prove that every allowed layout is infeasible. Coarse faceting remains visible in slit orientations. Protected corners retain the finite-arm limits of their existing construction. Straight turns below the profile-dependent shallow-turn bound continue as facets; a polyline does not encode whether the author intended such a turn as a corner.
- Native spline guides are unsupported.
- There is no symmetry constraint linking adjustments in separate free spans.
- Corner adjustment chooses the step nearest nominal that fits the finite arm. It does not search other step combinations to rescue a later clearance or span-fit failure.

## Outside the model

No automatic stitch regeneration, sewing itinerary, leather deformation model or tool-body collision check.

## Dependencies

- Windows.
- BricsCAD V22 with its bundled .NET support.
- OpenDCL 10.1.2.2.
