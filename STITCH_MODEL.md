# Stitch model: accepted next-version design

This specifies the next implementation. `geometry.mjs` and the gallery still implement the original baseline. Physical qualification is separate: [PHYSICAL_RULES.md](PHYSICAL_RULES.md). CAD behavior: [BRICSCAD_PLAN.md](BRICSCAD_PLAN.md).

## Concepts and parameters

| Concept | Meaning |
| --- | --- |
| Guide | User-owned, ordered planar line/arc geometry; authoritative location of ordinary opening centres. Explicit start, direction and open/closed state. |
| Landmark | A deliberately centred **nominal gap**, with no opening at its station. A pocket-edge crossing is this kind of constraint. |
| Junction | A transition within the ordered guide. Derived from its tangents/curvatures, not from nearby drawing intersections. |
| Opening | One real slit or round hole. Virtual slits are construction geometry only. A corner hole may lie off the guide. |
| Reservation | Fixed entry/exit openings and protected gaps supplied by a feature. |
| Span | Remaining guide between consecutive reserved ordinary centres; fitted without moving either anchor. |

Normal inputs are guide, pitch and landmark picks. Endpoints/direction have visible defaults; genuine junctions are derived. Do not expose correction count or minimum-angle sliders.

| Parameter | Ownership and default |
| --- | --- |
| Pitch `p` | Per seam, in mm; remember last choice. The lab's 2.7/3/3.38/3.85 values are examples. |
| Slit axis length `l`, lean `alpha`, handedness | Named tool profile. Lab: 1.5 mm, 40 degrees; uncalibrated. |
| Effective slit thickness `w` | Measured tool/opening envelope; initially unknown, never inferred from pitch. |
| Round-hole diameter `d` | Process setting; current simplified choice 0.5 mm. |
| Retained-material margin `m` | Process/material setting; deliberately chosen after physical checks, initially unknown. |
| Maximum ordinary correction | Fixed at +/-10%; no correction-count cap. |
| Arithmetic tolerance | Internal numerical error allowance; never additional manufacturing clearance or pitch deviation. |

Changing pitch never scales the other dimensions. Revalidate the selected profile for a different iron. Preserve the rule/profile values used by each saved seam; changing a global preset cannot silently alter old work.

## Rules and supported domain

1. Ordinary pitch is direct centre distance: linear distance on a line, **chord** distance on a circle. Each slit follows its own local tangent.
2. Reserve all feature anchors before fitting the intervening spans. Keep reserved gaps nominal; equal reservations reuse the same opening only when type, position and axis agree. Other overlap fails.
3. Minimize changed ordinary gaps under those reservations. Then prefer exact centred placement, smaller fractional change, and smaller interval count, in that order.
4. Keep changes in one contiguous equal-adjustment block per span. If exact centring is unavailable, use the nearest permitted block; half-index ties go toward the end.
5. Junction-to-round-hole distances are derived geometry, not ordinary pitch corrections.
6. Within one generation, committed anchors remain fixed. An explicit later Generate recomputes the whole seam from current inputs; there is no hidden permanently locked prefix.
7. Closure reuses the original opening identity. A fresh closed circle fits its full sweep; the lab's arbitrary committed-prefix examples are not a required workflow.
8. Validate all distinct emitted opening pairs. A fitted span alone does not establish an acceptable whole route.
9. Use direct formulas and bounded analytic candidate selection. No phase search, iterative optimizer, relaxed constraints or substitution of another corner recipe after failure.

Admit planar, nonbranching LINE/ARC/CIRCLE and line/arc polylines, with at most one revolution per circular primitive. Reject nonfinite data, zero-length primitives, disconnected segments and ambiguous traversal before construction. Normalize adjoining collinear or co-circular subdivisions; inserting a redundant CAD vertex must not change the layout.

At a genuine smooth change of curvature, reserve one shared slit at the join. This is a deliberate phase constraint. Every free span then lies on one normalized line or circle. A landmark whose required gap straddles such a join needs a mixed-primitive construction and is **unsupported initially**. Overlap with a prescribed slit is a constraint conflict, not permission to move it.

Branches, shared openings between independent seams, self-crossing routes, splines, ellipses, nonplanar geometry, and free-phase mixed-primitive spans are outside this first domain. Reject them explicitly; do not approximate them with little straight segments. Same-drawing placement alone does not prove two separate seams belong to the same piece of material.

## Span fitting and centred placement

Retain the existing direct feasibility/minimum-count mathematics in `fitSpan` and `fitCircularSpan`, including zero spans, disabled corrections, signed sweeps and boundary tolerances. Their current latest-end placement and count tie-break are superseded below.

For a line of length `D`, let `delta=.1p`, `q=qStart+qEnd`:

```text
low  = max(1, q, ceil((D + q delta)/(p + delta)))
high = floor((D - q delta)/(p - delta))
n0   = nearest D/p clamped to [low, high]
r    = D - n0 p
K    = ceil(abs(r)/delta)                 (zero residual => K=0)
```

An empty count range fails. The existing floating-point boundary handling remains essential. With `K>0`, every count attaining this minimum lies in:

```text
[ceil((D-K delta)/p), floor((D+K delta)/p)] intersect [low, high]
```

For a circle, let `S=abs(sweep)`, `A=2 asin(p/(2R))`, `Amin=2 asin(.9p/(2R))`, and `Amax=2 asin(min(1,1.1p/(2R)))`. Reject `p>2R`; all steps use the minor branch. The existing weighted count formula yields minimum `K`, with extension capacity `e=Amax-A` and contraction capacity `c=A-Amin`. Its same-`K` range is:

```text
[ceil((S-K e)/A), floor((S+K c)/A)] intersect the circular feasible range
```

Prefer counts in this range satisfying `n-K` even and `(n-K)/2 >= max(qStart,qEnd)`; those permit an exactly centred block. If none exist, keep the full range. Compare its nearest counts below/above the ideal count, respecting parity when restricted; choose the smaller actual fractional pitch change, then smaller `n`. This is bounded arithmetic, not a count search.

For the chosen count:

```text
blockStart = nearestInteger((n-K)/2), half ties toward the end
blockStart = clamp(blockStart, qStart, n-qEnd-K)
line changed gap = p + (D-np)/K
arc changed angle = A + (S-nA)/K
arc changed chord = 2R sin(changed angle/2)
```

When `K=0`, emit nominal gaps only. Use negative angular advances for negative sweep. Corrections on a circle are centred in angular station, not at a chord midpoint.

Examples at 3 mm: `30.5 -> n10,K2,3.25 gaps at indices 4-5`; `31.5 -> n11,K5,2.7 gaps at 3-7`; `30.3 -> n10,K1,3.3 gap at 5`. The last case is deliberately only approximately centred. With a protected final gap, `6.3 -> [3.3,3]` remains valid.

## Features

**Open endpoints:** default to slit centres at both guide endpoints. User start/end overrides shorten the traversed range; no automatic endpoint drift. Closed routes require an explicit start/phase pick and direction.

**Landmark:** on a line at station `s`, reserve centres `s-p/2` and `s+p/2`. On a circle at angle `phi`, reserve `phi-A/2` and `phi+A/2`. Preserve their nominal gap. Station/angle symmetry does not put the chord midpoint on the circle. Reservations must fit within the traversed guide and not conflict with other features.

**Smooth join:** one shared slit, unless normalization removed an artificial subdivision. Same type/position/axis means one opening, not two coincident cuts.

**Sharp junction:** use the same selected-tip construction on all admitted line/arc pairs:

```text
h = l/2
J = Ci - h ui = Co + h uo
```

Here `Ci,Co` are virtual centres, `ui,uo` their slit-axis directions, and `J` the emitted round-hole centre. Emit the real incoming neighbour one nominal line/chord step before `Ci`, and the real outgoing neighbour one step after `Co`. Virtual slits are replaced by the hole.

Intersect the incoming minus-tip locus and outgoing plus-tip locus. A line gives a parallel line. For a circle with radius `R`, winding sign `sigma`, and radial/tangential basis `er,ephi`, the slit direction is `u=sigma(sin(alpha)er+cos(alpha)ephi)` and the two locus radii are:

```text
sqrt(R^2 + h^2 +/- 2 R h sigma sin(alpha))
```

Line/line, line/circle or circle/circle intersection yields at most two isolated points. Select the point nearest the guide vertex before testing feasibility; equally near distinct roots make the local construction ambiguous and are rejected. Recover its virtual centres analytically on the principal station branch nearest the junction; reject antipodal station ties and never add a revolution to rescue a candidate. If the nominal arc station step is `b=2R asin(p/(2R))` (or `p` on a line), incoming virtual station must be in `[-L+b,b]` and outgoing in `[-b,L-b]`, measured from the junction. Thus the **real** neighbours remain on their finite arms even when virtual centres lie on extensions.

Validate that selected candidate for finite stations, nondegenerate virtual-tip contact, correct feature order, local opening clearance and existing reservations. Failure rejects the junction; never substitute the farther root or another winding. Coincident loci and exact reversal have no unique sharp-corner construction and are rejected; a true smooth join uses its own shared-slit rule. Whole-route clearance is checked afterward, without backtracking.

This preserves each arm's own ordinary tip-to-tip display vector. For straight arms the vector is `p t-l u`; curved arms need not produce a display turn equal to the guide turn. In the A03 geometry the new candidate gives `J=(.482091,.476961)` and display turn `92.703660 degrees`, replacing the old endpoint-centred recipe. This is a geometric decision, not physical stitching validation.

## Planner contract and failures

Use one small pipeline: **normalize -> derive reservations -> fit spans -> emit/reuse openings -> validate -> result**. Start with simple records for analytic primitives, user features, reservations, openings and intervals. Keep `ordinary`, `corrected` and `junction` interval kinds distinct. Do not port one `case-suite.mjs` builder per shape.

| Result | Meaning |
| --- | --- |
| Exact / adjusted | Ordinary spacing classification; meaningful only alongside validation status. |
| Infeasible span | No admitted interval count under the fixed constraints; identify the two bounding features. |
| Rejected construction | Chosen junction/clearance rule fails; alternatives are not thereby proven impossible. |
| Unsupported input | The geometry or requested constraint has no implemented rule. |
| Physical clearance unverified | Geometry fits, but profile/margin or material-boundary evidence is absent. |

Example: a 7 mm free span at 3 mm pitch cannot use two gaps (maximum 6.6) or three (minimum 8.1). Redesign is a legitimate outcome. A failed route may show a diagnostic prefix, but CAD Generate must preserve the previous complete result.

The existing core uses screen coordinates (`+y` down, positive turns clockwise). Port that convention explicitly or transform all points, tangents and slit axes together (`xCAD=xCore`, `yCAD=-yCore` in a local XY frame). Reflection/face parity is separate from reversing traversal.
