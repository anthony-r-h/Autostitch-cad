# Junctions

A junction is where stitch arms meet. Count the incident arms, not the number of CAD entities. A polyline corner and two connected lines use the same rule.

| Geometry | Opening rule |
| --- | --- |
| Collinear or co-circular continuation, equal pitch | One normalized run; the source boundary does not force a hole. |
| Smooth change of curvature | One shared tangent-aligned slit. |
| Sharp two-arm corner | Round hole where the selected virtual slit tips meet. |
| Three or more arms: T, X, branch | Round hole at the guide intersection. Each arm's first neighbour is one nominal pitch away. |

Separate guides share openings only after **Connect stitch lines**. All crossings inside that connected set must be coordinated. An unrelated nearby line has no effect. Each source retains its own traversal; the tool does not choose a sewing itinerary.

## Sharp corners, straight or curved

Let `h=l/2`, virtual slit centres be `Ci,Co`, and their unit axes be `ui,uo`. The hole centre `J` satisfies:

```text
J = Ci - h ui = Co + h uo
```

Emit the real incoming neighbour one nominal step before `Ci`, and the outgoing neighbour one step after `Co`. Replace both virtual slits with the round hole. Show the virtual slits dashed.

1. Intersect the incoming minus-tip and outgoing plus-tip loci. A straight arm gives a parallel line; a circular arm gives a concentric circle.
2. Choose the intersection nearest the guide vertex before testing feasibility. Equally near distinct roots fail.
3. Recover virtual stations on the principal branch nearest the vertex. Antipodal ties fail.
4. Require both real neighbours to lie on their finite arms. Check local clearance and existing reservations, then whole-set clearance.
5. If that construction fails, reject it. Do not try the farther root or another revolution.

For a circular arm with radius `R`, winding `sigma`, radial/tangential basis `er,ephi`, and signed lean `alpha`:

```text
u = sigma(-sin(alpha) er + cos(alpha) ephi)
tip locus = C(s) + epsilon h u(s), epsilon in {-1,+1}
locus radius = sqrt(R^2 + h^2 - 2 epsilon R h sigma sin(alpha))
nominal station step b = 2R asin(p/(2R))
```

Relative to the vertex, virtual stations must lie in `[-L+b,b]` on the incoming arm and `[-b,L-b]` on the outgoing arm. On a straight arm, `b=p`. Virtual centres can lie on extensions; real neighbours cannot.

The tip rule preserves each straight arm's ordinary tip-to-tip thread continuation. Curved arms use their own tangents; the displayed thread turn need not equal the guide turn. A03/A04 deliberately differ from the original guide-centred round holes.

## Branches

For a branch at `P`, reserve one round hole and a neighbour on each arm:

```text
line:   station advance p
circle: angular advance 2 asin(p/(2R))
```

The circle neighbour is exactly one chord pitch from `P`; advancing arc length by `p` would be wrong. Adjacent round-hole distances here are protected nominal gaps. Sharp two-arm hole distances instead come from the tip construction.

If two branch nodes are one nominal step apart, retain just the two holes and their protected gap. At two steps, reuse one middle slit. Fit the remaining spans with the ordinary solver.

| Example at p=3 mm | Result |
| --- | --- |
| 24 mm through-line plus 12 mm endpoint arm | T: one round hole and 12 slits. |
| Two 24 mm lines crossing at their midpoints | X: one round hole and 16 slits. |
| Branch nodes joined by 3 mm | Two holes; no intermediate slit. |
| Branch nodes joined by 6 mm | Two holes and one shared slit. |
| Branch nodes joined by 7 mm | Reject: protected end gaps leave an unfittable 1 mm span. |

## Angle limits

There is no universal minimum junction angle. The construction must fit finite arms and pass actual opening-clearance checks. Curvature matters as well as the tangent angle.

For straight arms at `p=3 mm`, `l=1.5 mm`, `alpha=40 degrees`, the selected-tip recipe also excludes small nonzero turns below about `22.483429 degrees`:

```text
minimum turn = 2 atan((l/2)sin(alpha) / (p-(l/2)cos(alpha)))
```

This bound applies to that profile regime. A zero turn uses the smooth rule. It describes this corner recipe, not whether leather can be stitched through a gentle bend. Physical qualification and sample work are recorded in [limits](LIMITS.md).
