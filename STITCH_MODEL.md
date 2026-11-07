# Stitch geometry

The intended product is a BricsCAD plugin for placing leather stitching holes. The HTML viewer is a way to inspect the geometry while deciding the rules. It is not the product or a general CAD path editor.

This document records the current model and its limits. The calculations are in [geometry.mjs](geometry.mjs), the examples and their construction order in [case-suite.mjs](case-suite.mjs), and the independent regression checks in [test-core.mjs](test-core.mjs). Passing these checks establishes consistency with the chosen rules, not approval of every construction for leatherwork.

## Inputs from the CAD workflow

The user draws the stitch guide, selects it in the tool, places Start, End, Landmark and Intersection annotations on it, and chooses pitch. The tool turns those inputs into the ordered geometric construction described here. The canonical profile and other established rules supply the remaining parameters.

Input symbols identify guide features; they are not physical openings. The original guide remains an editable input. The generated slits, round holes and correction marks form one contained result on AUTOSTITCH. The complete interaction and input/output association are described in [BRICSCAD_PLAN.md](BRICSCAD_PLAN.md).

## Parameters and what is settled

| Item | Current value or rule | Status |
| --- | --- | --- |
| Geometry | Planar, in millimetres; straight lines and circular arcs | Initial scope |
| Ordinary slit | Finite segment, 1.5 mm long | Provisional canonical length, not a measured tool specification |
| Slit lean | 40° relative to the local tangent | Canonical example; fixed while pitch changes |
| Pitch | 2.7, 3, 3.38 or 3.85 mm in the viewer | Test options, not a verified catalogue of tool sizes |
| Round hole | 0.5 mm diameter | User-selected simplification |
| Ordinary spacing | Direct distance between consecutive slit centres | Current model; chord distance on a circle |
| Centred crossing | One nominal gap, symmetric along the guide about the landmark | User-confirmed: both nominal and centred |
| Corrections | Fewest necessary changed intervals, each within ±10% | User requirement; no independent correction-count cap |
| Correction placement | Equal changes in the latest eligible intervals of each span | Current deterministic choice |
| Straight corner | Align one specified tip from each virtual slit; replace their meeting point with a round hole | Construction under investigation |
| Sharp curved corner | Put both virtual centres at the shared guide endpoint | Exploratory alternative; does not preserve the straight-corner angle result |

Pitch changes must not rescale slit length, slit lean or hole diameter. Thread is only a display line. Thickness, tension, entry into the leather and stitch mechanics are not modelled.

## Axioms

1. A route has an ordered sequence of segments, a start, a travel direction, and an explicit open or closed state. Coincident start and end coordinates alone do not define a full loop.
2. An ordinary opening is a finite slit with the canonical length and lean at its own local tangent. A round opening is a separate opening type.
3. Consecutive ordinary slit centres use nominal pitch unless that interval is explicitly marked as corrected. Corner-to-slit distances are derived junction geometry and are reported separately.
4. A centred landmark lies between two slit centres. Their gap remains nominal, and their distances along the guide to the landmark are equal. There is no hole at the landmark.
5. A feature can reserve incoming and outgoing anchors and intervals that must stay unchanged. Establish those targets before fitting the approach.
6. Minimize corrections subject to those fixed anchors, protected intervals and construction order. There is no fixed limit such as one, two or three corrections for a whole route.
7. Each corrected ordinary gap stays between 0.9 and 1.1 times nominal pitch. Protected ordinary gaps stay exactly nominal. Corrections do not move an already committed feature.
8. Solve the next span, commit its feature, and continue from its exit. Accepted earlier openings remain fixed. Closing a route targets its existing starting geometry and reuses its opening.
9. A span is decided by direct formulas and explicit conditions. No numerical search, repeated trial placement, convergence or backtracking chooses a solution.
10. If the selected construction cannot fit, report the failed condition. Do not silently extend the guide, relax a landmark, alter earlier holes or substitute another corner rule.

These are geometric rules. Whole-tool placement, clearance from a material boundary, leather thickness and deformation are outside this model. A pocket edge is represented only by its crossing landmark.

Ordered passes through segments and loops that emit calculated holes are allowed. The restriction concerns searching for placement, not generating the resulting geometry.

## Direction and coordinates

The prototype uses screen coordinates: x increases rightward, y downward, and positive turns are clockwise. `geometry.mjs` uses radians except `solveCorner(turnDeg, ...)`, which takes degrees.

For tangent angle `t`, the slit axis is `t - 40°`. With slit length `l`, centre `C`, and unit slit direction `u`, its endpoints are:

```text
a = C - (l/2) u
b = C + (l/2) u
```

The display thread runs from one slit's `b` tip to the next slit's `a` tip. At a round hole it uses the hole centre. This tip convention is part of the current corner construction.

The signed turn is the change from the incoming to outgoing travel tangent. The displayed included corner angle is `180° - abs(turn)`. Thus J03's 135° corner uses a 45° turn; J04's 45° corner uses a 135° turn.

The CAD adapter must convert coordinates consistently. Reversing travel changes construction order and the location of the latest eligible corrections. It is not the same operation as reflecting a pattern. Reflection also reverses slit handedness: transforming existing slit endpoints is different from regenerating a fixed 40° profile on a reflected guide. The intended treatment of a mirrored punching face must be explicit in the plugin.

## What features fix

On a straight line, a landmark at station `c` reserves centres at `c - p/2` and `c + p/2`. Fit to the first, retain their nominal gap, then continue from the second.

On a circle of radius `R`, nominal pitch subtends `A = 2 asin(p/(2R))`. A landmark at angular station `phi` reserves centres at `phi - A/2` and `phi + A/2`. Symmetry is measured along the arc. The midpoint of the straight chord lies inside the circle and is not the landmark. A02 draws both points to make that distinction inspectable.

A corner reserves the last ordinary incoming centre, the shared opening, and the first outgoing centre. The next ordinary fit starts or ends at those real centres. It does not use the guide vertex as an interchangeable substitute.

If two consecutive reservations name the same slit, reuse it. A zero remaining span with no protected intervals needs no additional hole or gap. Overlapping reservations fail. A small positive remaining span also fails if no allowed interval count fits; it must not become an invented tiny gap.

The user initially described corrections at beginnings or ends. Here, an interior feature creates local span boundaries. The implemented policy puts corrections at the end of each newly solved span, before its protected suffix. Beginning-only and split-between-ends policies are not implemented.

Minimality is conditional on the prescribed anchors and order. It is not global optimization over starting phases, feature definitions, corner constructions or alternative orders.

## Direct fits

### Straight span

`fitSpan(D, p, options)` fits a nonnegative distance `D` between ordinary slit-centre anchors. Let `qStart` and `qEnd` be protected interval counts, `q = qStart + qEnd`, and `delta = 0.1 p`.

For `D > 0`, the feasible integer counts are:

```text
low  = max(1, q, ceil((D + q delta) / (p + delta)))
high = floor((D - q delta) / (p - delta))
```

If `low > high`, reject the span. Otherwise choose `n`, the nearest integer to `D/p`, clamped to `[low, high]`. Equal-distance ties use the smaller count.

```text
r = D - n p
k = 0                         if r = 0
k = ceil(abs(r) / delta)       otherwise
changed gap = p + r/k          when k > 0
```

Reject if `k > n - q`. With zero-based interval indices, change the last `k` eligible intervals:

```text
n - qEnd - k, ..., n - qEnd - 1
```

Every other interval remains nominal. Each changed gap can absorb at most `delta`, so `k` is a lower bound; equal changes attain it. The nearest feasible count minimizes the required residual capacity and therefore the correction count.

Example: 31 mm at 3 mm pitch needs six 3 mm gaps and four 3.25 mm gaps. Four corrections are valid. For a 30.3 mm span with one protected final gap, the 3.3 mm correction is second-last and the final gap remains 3 mm.

With corrections disabled, only an exact nominal fit is admitted. Zero distance returns no intervals unless protected intervals were requested, which is invalid.

### Circular span

`fitCircularSpan(R, sweep, p, options)` fits signed angular advance, with `abs(sweep) <= 2 pi`. Centres remain on the actual circle. It does not divide arc length by pitch.

Let `S = abs(sweep)`. Reject `p > 2R`. All individual steps use the minor-arc branch:

```text
A    = 2 asin(p / (2R))
Amin = 2 asin(min(1, 0.9p / (2R)))
Amax = 2 asin(min(1, 1.1p / (2R)))
e = Amax - A
c = A - Amin

low  = max(1, q, ceil((S + q e) / Amax))
high = floor((S - q c) / Amin)
```

Reject an empty range. An exact feasible integer `S/A` needs no correction. Otherwise set `x = S/A`, `m = floor(x)`, and `f = x - m`:

```text
preferred = m       if f <= e / (e + c)
preferred = m + 1   otherwise
n = clamp(preferred, low, high)
r = S - n A
capacity = e if r > 0, otherwise c
k = ceil(abs(r) / capacity)
adjusted angle = A + r/k
adjusted chord = 2R sin(adjusted angle / 2)
```

The zero-residual case has `k = 0`. Reject unavailable correction capacity or more corrections than eligible intervals. Apply the same latest-eligible placement as the straight fit, and multiply angular steps by the original sweep sign.

Extension and contraction have different angular capacities. Ordinary rounding of `S/A` can choose more corrections; the weighted threshold above avoids that. Equal raw-capacity ties choose the smaller count. The result minimizes correction count, with this deterministic choice among ties.

The source handles disabled corrections, zero sweep and floating-point boundary comparisons explicitly. Preserve those branches when porting. Arithmetic tolerances absorb rounding error; they do not grant additional pitch deviation. Small count searches in `test-core.mjs` are independent test oracles and must not be copied into production fitting.

## Straight corners at different angles

### Which virtual cuts can merge

`classifySlits` compares finite segments, not infinitely extended lines:

| Finite relationship | Result |
| --- | --- |
| The complete segments coincide, including reversed endpoint order | Keep one slit |
| Non-collinear segments meet, including tip contact | Use one 0.5 mm round hole at the meeting point |
| Partial collinear overlap, including collinear endpoint contact | Reject this junction construction |
| Disjoint finite segments | Reject this junction construction |

The last two are defensive conditions, not extra useful junction types to offer the user. An intersection of extended axes outside the finite cuts does not create a valid hole.

Ordinary spacing has a separate sufficient guard: `0.9p > l`. It prevents adjacent ordinary slits from touching in any orientation. It is conservative and does not check nonadjacent openings, whole-route self-crossings, material clearance or a physical multi-tooth tool.

### The current direct construction

Put the guide vertex at `G = (0,0)`, incoming tangent `ti = (1,0)`, outgoing tangent `to = (cos(theta), sin(theta))`, slit lean `alpha = -40°`, and half-length `h = l/2`.

Let `ui` and `uo` be unit directions at `alpha` and `theta + alpha`. Choose virtual centres `Ci`, `Co` on the two supporting guide lines so that one specific tip from each slit shares `J`:

```text
J  = Ci - h ui = Co + h uo
J  = -h sin(alpha) (cot(theta/2), 1)
Ci = J + h ui
Co = J - h uo
I  = Ci - p ti
O  = Co + p to
```

`I` and `O` are the real neighbouring slit centres. The virtual slits are construction geometry and are replaced by the round hole at `J`. Their centres may be on guide extensions; the required real neighbours must fit the actual finite arms:

```text
-incomingLength <= dot(I, ti) <= 0
0 <= dot(O, to) <= outgoingLength
```

The incoming display vector is `p ti - l ui`. The outgoing vector is `p to - l uo`. They have equal length and are rotated versions of one another, preserving the same thread angle relative to each straight run. This derives the 90° symmetry and generalizes it to other admitted turns.

The real corner-centre distances are not nominal pitch. At 3 mm pitch and a 90° turn:

```text
J = (0.482091, 0.482091)
I = (-1.943376, 0)
O = (0, 2.907557)
distance(I, J) = distance(J, O) = 2.472913 mm
```

These are derived junction distances, not ordinary pitch corrections. Enforcing 3 mm centre distance to the round hole would define a different corner. Physical acceptance of this construction must consider that distinction.

Zero turn is handled separately by one shared slit. Exact reversal at ±180° is unsupported by this rule. Other turns can fail because the neighbours leave their arms. For the current profile and 3 mm pitch, even infinite arms need approximately `abs(turn) >= 22.4834°` for this tip convention; finite lengths may be more restrictive. There is no arbitrary angle cutoff or automatic fallback to a hole at the guide vertex.

## Curved joins and closure

Each ordinary slit on an arc uses the tangent at its own centre. For a smooth line-to-arc or arc-to-arc join, coincident virtual slits can remain one real slit. A05 fixes that shared slit and leaves both outer margins free, so its exact result does not mean both guide endpoints contain holes.

A03 and A04 are different: both virtual centres are fixed at the actual sharp guide junction. They preserve nominal centre distances but do not establish the straight-corner angle result. At 3 mm pitch their 90° guide turns produce display-line turns of about 97.202° and 105.633°. They remain examples to evaluate, not approved general curved-corner solutions.

L01 and L02 commit whole nominal chords up to the supplied construction limit, then fit only the remaining circle. The last chord is protected, and closure reuses the original opening. R01 reserves all four corners and fits the sides in order, with its final connection returning to the original round hole. None of these searches backwards for a better phase.

J06 additionally protects the ordinary gap before the incoming corner neighbour. That is a selected example policy, not a requirement derived from every corner. The corresponding final-gap protection in S04 and the circle cases must also remain explicit in route data.

## Test inventory

The gallery intentionally excludes S03, S05 and F04 as redundant. Relevant numerical boundary checks remain in the core suite. J02 through J04 are angle variants of one construction.

| Case | Geometry or behaviour being checked | At 3 mm pitch |
| --- | --- | --- |
| S01 | 30 mm straight, fixed endpoint centres | Exact |
| S02 | 30.5 mm straight, minimum end corrections | Adjusted: 2 gaps |
| S04 | 30.3 mm straight, final gap protected | Adjusted: second-last gap |
| F01 | 30 mm line, centred crossing at 16.5 mm | Exact |
| F02 | Same line, crossing shifted to 16.25 mm | Adjusted: 2 gaps |
| F03 | 45 mm line, crossings at 16.25 and 31.75 mm | Adjusted: 4 gaps |
| F05 | 30 mm line, crossings at 10 and 20 mm | Invalid middle span; accepted prefix retained |
| J01 | Straight continuation, one shared slit, free outer margins | Exact |
| J02 | 90° included corner, 10 mm arms, free outer margins | Exact under the corner rule |
| J03 | 135° included corner, same arm lengths | Exact under the corner rule |
| J04 | 45° included corner, same arm lengths | Exact under the corner rule |
| J05 | 90° corner, incoming arm only 1 mm | Invalid; required neighbour does not fit |
| J06 | Corner between fixed outer centres, 30 mm arms; protected approach gap | Adjusted: 5 gaps |
| N01 | Pocket edge 6.5 mm before corner; 26 mm approach and 12 mm departure | Adjusted: 2 gaps |
| A01 | Radius 10 mm, 90° arc, fixed endpoint centres | Adjusted: 3 chords |
| A02 | Same arc, nominal centred crossing at 45° | Adjusted: 4 chords |
| A03 | Radius 10 mm arc to line, sharp 90° guide turn | Exact spacing; corner rule unresolved |
| A04 | Radius 10 and 8 mm arcs, sharp 90° guide turn | Exact spacing; corner rule unresolved |
| A05 | 18 mm line into radius 10 mm quarter-circle; shared slit, free outer ends | Exact |
| L01 | Circle radius `3 / (2 sin(pi/20))`; committed prefix | Exact: 20 openings |
| L02 | Radius 10 mm circle; committed prefix and protected final chord | Adjusted: 2 chords |
| R01 | 31.5 × 22.5 mm rectangle, four corners and ordered closure | Adjusted: 8 gaps; 38 openings |

The dimensions stay fixed when pitch changes. Outcomes may change; N01 is valid at 3 mm and invalid at the other three available pitches. An expected rejection is a passing test. `exact` means no ordinary spacing corrections under the selected construction, not that every original design question has been solved.

The current snapshot has 30 core tests, 22 matching reference outcomes at 3 mm, and 1,637 checks across 88 case-and-pitch runs. [results.json](results.json) holds the computed results. Core checks include signed corners, correction limits without a count cap, independent circular-count comparisons, shared versus overlapping reservations, actual line/circle coordinates and reuse of the first opening on closure.

## What Codex must preserve and what remains open

The pure fitting functions can be ported independently of CAD and the viewer. Preserve measured coordinates, interval classifications, correction flags, construction order and rejection reasons. Call `validateSpacing` before constructing a route; the span fits do not inspect the slit profile. Keep an interval's `junction` flag distinct from an ordinary correction. Case-local slit IDs are not persistent seam or imprint identities.

`case-suite.mjs` assembles fixed examples; it is not a general route planner. Its sampled `guides` arrays serve SVG drawing. Use analytic line, radius and sweep definitions for CAD calculations, not those display samples.

The following are still unimplemented or unresolved:

- A general ordered route representation connecting arbitrary admitted line/arc spans and user-defined features.
- Free-phase sharp curved junctions satisfying the original corner appearance criterion. A03/A04 do not solve this.
- General splines, arbitrary self-crossings, branches, T-junctions and multiple seams sharing an opening.
- Policies for beginning-only or split-end corrections, or a user request to revise previously committed geometry.
- Mirrored punching-face treatment and persistent correspondence between master seams and underlayer imprints.
- Whole-tool placement, physical clearances, leather behaviour and validation of the provisional slit profile against the intended tool.

For an unimplemented input class, the plugin should report unsupported. For an implemented construction whose stated conditions fail, report invalid. The current fixed-case wrapper is not yet a general input classifier. Do not make either case pass by quietly changing the rule.
