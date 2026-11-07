# Model review: decisions before implementation

The straight and circular span fits are useful, small, and mathematically justified. Keep them. The missing foundation is a common feature/route model plus validation of actual openings. Passing the current tests proves the chosen recipes, not physical stitchability. This review proposes changes; it does not change executable behavior.

## Minimal concepts and inputs

- **Stitch guide:** an ordered planar route with direction, explicit open/closed state, analytic lines/arcs, and start/end treatment. It locates ordinary opening centres; it is neither the thread nor a material boundary. A generated corner hole may lie off it.
- **Landmark:** a constraint at a route station. The established crossing landmark reserves one nominal, symmetric centre gap and no opening at the landmark. An annotation named “Intersection” must specify whether it means this crossing, a guide corner, or a real branch. Those are different constraints.
- **Junction:** a local transition between incoming and outgoing guide tangents, with an explicit opening recipe. A smooth join has no tangent discontinuity; a corner does. A geometric self-crossing is not automatically permission to merge openings. True branching is outside an ordered single-route model.
- **Opening:** one emitted slit or round hole, with identity and finite footprint. Virtual slits construct a junction; they are never emitted or treated as material already cut.
- **Span:** the remaining interval between consecutive reserved opening anchors. Fit this span without moving its anchors. Shared anchors reuse one opening; incompatible overlaps fail.

Expose pitch and annotations in ordinary use. Store slit axis length, lean/handedness, and hole diameter in one measured tool profile; keep correction allowance at the requested 10%. Add effective opening width and retained-material margin to that profile/validation setup, not as unrelated tuning knobs. These two quantities cannot be inferred from pitch. Thread thickness is not a substitute for either. Avoid exposing corner angle limits, correction counts, search iteration settings, or multiple spacing metrics as design parameters.

Existing profile values 1.5 mm, 40°, and 0.5 mm are hypotheses/simplifications, not a measured tool specification ([geometry.mjs:7](geometry.mjs#L7)). Treat handedness explicitly when mirroring. A capsule formed by inflating the current axis segment extends beyond its tips; document whether a measured “length” denotes that axis or the total footprint before calibration.

## Keep the fit mathematics; change the placement preference

`fitSpan` and `fitCircularSpan` already minimize the number of changed intervals **for prescribed anchors, eligible intervals, and branch rules** ([geometry.mjs:166](geometry.mjs#L166), [geometry.mjs:226](geometry.mjs#L226)). Circular pitch correctly means chord distance. Preserve the weighted circular count selection, protection logic, and floating-point boundary handling. An integer tie-break is a policy, not another physical law.

Prefer one contiguous block of the minimum `k` equal corrections centred within each remaining anchored span. Among counts attaining the same minimum `k`, prefer a count allowing exact centring; the current smaller-count tie-break is arbitrary. For chosen `n` and protected prefix/suffix `qStart,qEnd`, choose block start `j` nearest `(n-k)/2`, constrained to `qStart <= j <= n-qEnd-k`; break half-integer ties toward the end. This maximizes the smaller nominal buffer at the two span ends. Equal corrections make centring in interval count also centre the changed block in straight distance or circular angle. The current code instead uses `j=n-qEnd-k` ([geometry.mjs:199](geometry.mjs#L199), [geometry.mjs:293](geometry.mjs#L293)).

At 30.5 mm and 3 mm pitch, ten intervals need two 3.25 mm corrections: indices 4–5 leave four nominal gaps on either side. At 31.5 mm, `n=10,k=5` cannot centre exactly but `n=11,k=5` can: choose eleven and five centred 2.7 mm gaps. At 30.3 mm, only one 3.3 mm correction is needed; index 5 wins the tie, but exact reflection symmetry is impossible with ten intervals and one changed interval. Do not silently add a second correction to claim symmetry. Landmarks split spans; centring a block globally across a fixed landmark would generally move that landmark's reserved openings.

Mandatory exact symmetry is a competing design choice, not a free improvement: it needs `n-k` even and `(n-k)/2 >= max(qStart,qEnd)`, which implicitly mirrors asymmetric protections. A 6.3 mm span with one protected final gap admits `[3.3,3]` but no exactly centred alternative. This review recommends minimum corrections first, exact centring among ties, nearest centring otherwise; if exact symmetry takes priority, explicitly accept those extra corrections/rejections.

Extra protection such as J06's preceding nominal gap is not implied by every corner. Reserve the geometry actually required, then derive eligibility from those reservations. Do not accumulate blanket protected gaps or arbitrary correction-count caps.

## Two different corner limits

The current straight tip recipe fixes `J=Ci-h ui=Co+h uo`, then real centres `I=Ci-p ti` and `O=Co+p to` ([geometry.mjs:318](geometry.mjs#L318)). With half-length `h`, positive lean magnitude `alpha`, and the present profile, ray membership requires:

```text
abs(turn) >= 2 atan(h sin(alpha) / (p - h cos(alpha)))
included angle beta = 180 degrees - abs(turn)
```

At `p=3`, `h=.75`, `alpha=40°`, the minimum nonzero **turn** is 22.483429°, hence the maximum included angle for this recipe is 157.516571°. Zero turn uses a different shared-slit recipe. This discontinuity is a limitation of the chosen tip construction, not evidence that gently bending stitch guides cannot be stitched. Finite arm lengths add further constraints.

The opposite limit, a minimum **included** angle for sharp corners, comes from real openings approaching each other. The existing guard `0.9p > slitLength` only bounds adjacent ordinary centres; it does not test the two real slits on opposite corner arms ([geometry.mjs:144](geometry.mjs#L144)). At 3 mm pitch the finite axis-segment separation is:

| Included angle | Nearest corner-neighbour slit-axis clearance |
| --- | ---: |
| 45° | 1.129170 mm |
| 30° | 0.657418 mm |
| 20° | 0.389272 mm |
| 10° | 0.167891 mm |
| 1° | 0.014223 mm |

Both turn signs give the same values for this profile. All these cases currently return `resolved`. Width `w=.2 mm` and edge margin `m=.2 mm`, **illustrative only**, would require at least `.4 mm` axis separation, giving a local minimum included angle of approximately 20.434°. Thus that illustrative local acceptance window is approximately `20.434° <= beta <= 157.517°`, before finite-arm and other-opening checks. Do not hard-code either angle as a universal validity limit.

## Finite openings and thread are separate checks

Use the measured opening shape if available; a conservative capsule around each slit axis and a disk for each round hole is a sufficient initial model. With axis segments `Si,Sj`, effective widths `wi,wj`, round centres `Hi,Hj`, diameters `di,dj`, and retained-material margin `m`, require:

```text
slit/slit:  distance(Si,Sj) >= (wi+wj)/2 + m
slit/hole:  distance(Si,Hj) >= wi/2 + dj/2 + m
hole/hole:  distance(Hi,Hj) >= (di+dj)/2 + m
```

Segment distance is zero for intersection; otherwise it is the minimum of the four endpoint-to-segment distances. Do not use distance between infinite axes or between centres as a replacement. Test every distinct actual opening pair, including nonadjacent arms, closure, and remote parts of the route. Reused identity is one opening, not a collision. For these small seams, a direct pairwise check is enough; spatial indexing can wait.

For the current 3 mm straight corner, the nearest hole-centre-to-neighbour-axis distance is 2.087007 mm for either turn sign. The `.5 mm` hole therefore leaves 1.837007 mm to the zero-width slit axis; effective width and margin must still be deducted. The hole must be checked even when the slit/slit angle test passes.

The orientation-independent ordinary precheck can be strengthened to `0.9p > l+w+m` for equal capsules built around length-`l` axes. It is sufficient, not necessary: failure must fall through to actual footprint checks, not hard-reject. Even `p=l=3` can have ample separation between parallel 40° slits. Retire the current hard rejection in the new model once footprint validation is present. Positive geometric clearance is not a calibrated material-strength guarantee. If material boundaries are supplied, require the full opening footprint inside the allowed region with the specified edge margin; without that boundary, report material-edge clearance as unverified.

Display thread connects selected slit tips and hole centres. The straight construction makes its two vectors rotated copies, `p t-l u`. That establishes a schematic angular property only. It does not establish material ligament, thread seating, tension, or strength. A round hole does not inherit the footprint of the two replaced virtual slits.

## Adopt one analytic construction for curved corners

Current A03/A04 use both virtual centres at the guide endpoint, whereas straight corners align selected virtual tips. Their 97.202°/105.633° display turns at a 90° guide turn follow from different recipes ([case-suite.mjs:441](case-suite.mjs#L441)). Supersede that fixed-centre hypothesis with the following analytic proposal; existing production examples remain unchanged until implementation.

Use the same tip-coalescence construction on every sharp line/arc pair:

1. Construct the incoming `a`-tip locus and outgoing `b`-tip locus as virtual centres move along their analytic supporting guides.
2. Intersect these loci; invert each intersection to its two virtual centres/tangents.
3. Locate the real previous/next centres one nominal chord backward/forward from those virtual centres. Filter finite guide stations, correct traversal branch, reservation order, non-collinear finite virtual-tip meeting, and actual-opening clearance against each other and already known openings.
4. Rank surviving candidates by squared distance from `J` to the guide vertex, then incoming virtual station, then outgoing virtual station. This explicit local preference is deterministic, not a physical theorem. Filter before ranking so an inadmissible nearest intersection cannot hide another admitted candidate. Deduplicate identical geometry. Coincident loci and exact reversal are separate degeneracies; a tangent join uses its shared slit before applying this sharp-corner construction. Do not revisit committed features if a later route check fails.

This is small analytic geometry. A line tip locus is a parallel line. For a circle with centre `Q`, radius `R`, radial unit `e_r`, travel sign `sigma`, and `u=sigma(sin(alpha)e_r+cos(alpha)e_phi)`, the tip `C±h u` traces a circle about `Q` of radius:

```text
sqrt(R² + h² ± 2 R h sigma sin(alpha))
```

For tip sign `epsilon=-1` incoming and `+1` outgoing, set `A=R+epsilon h sigma sin(alpha)`, `B=epsilon h sigma cos(alpha)`. Invert `v=J-Q` by `e_r=(A v-B rotate90(v))/(A²+B²)`. For each inverse angle, enumerate only the station representatives allowed by the real-neighbour range: incoming virtual station lies in `[-Lin+R anglePitch, R anglePitch]`, outgoing in `[-R anglePitch, Lout-R anglePitch]`. This is finite branch unwrapping, not phase search.

Line/line, line/circle, and circle/circle intersection give at most two isolated positions; concentric/coincident cases are explicit degeneracies. Supporting-curve extension is construction geometry only: real neighbours remain on the supplied finite guides, with no added winding to extend those guides. As `R` grows, a tip circle approaches the parallel-line locus and `R anglePitch` approaches `p`; the construction therefore recovers the straight solution.

Numerical evidence for the A03 geometry (`R=10`, `p=3`, turn 90°): the local tip-locus candidate gives `J=(.482091,.476961)`, incoming real centre `(-1.891200,.180460)`, outgoing real centre `(0,2.902428)`, and display turn **92.703660°**. Adopt preservation of each side's own ordinary curved display vector as the geometric invariant: the hole replaces the exact virtual tip that vector would have reached/left. Equal thread angles or equality with the guide turn are not general curved invariants. The construction is derived and independently checked; material behavior still requires calibration and samples.

At radii 10/8 mm, all four winding pairs with either signed 90° turn produce one admitted local candidate on 60° arms, also clearing illustrative width/margin `.2/.2 mm`. Signed display turns span 76.726°–102.146° for positive turns and -101.064°–-78.422° for negative turns. Whole-circle guide extents admit a second remote candidate, explicitly handled by the ranking rule. These are geometric results, not a claim that those varied angles are equally attractive.

## Generality and honest failure semantics

The minimal planner is: normalize guide primitives, compile explicit feature reservations, fit consecutive free spans, emit ordinary openings, reuse closure identity, then validate actual footprints. Use common feature and span records; do not copy one builder per new case. Existing case builders are fixtures, not that planner ([case-suite.mjs:590](case-suite.mjs#L590)).

Normalize collinear/co-circular subdivisions so a CAD entity split cannot change the stitch phase. For the initial product, explicitly reserve one shared slit at each genuine smooth curvature change, as A05 does. This permits homogeneous span fits but is a restrictive design policy, not a consequence of smoothness. A centred landmark gap straddling that mandatory slit conflicts with the policy and must be explained as such. If a future mode permits phase to pass through without a fixed slit, its mixed-span fitting and mixed landmark construction are unsupported until a solver exists; they are not mathematically impossible. No free mixed-span solver is needed for this initial scope. Closed routes require an explicit seam start/phase and reuse its opening; fixture `builtSweep` is not a product parameter.

Replace the absolute “no numerical search” axiom ([STITCH_MODEL.md:41](STITCH_MODEL.md#L41)) with: prefer direct formulas; permit bounded deterministic geometric candidate selection/solving; never silently move committed constraints. This avoids forbidding ordinary line/circle candidate selection or a justified mixed-span solver. No generic optimizer or global phase search is needed now. A timeout or unproved branch exclusion is not a proof of infeasibility.

Use distinct reasons for:

- **Infeasible under fixed constraints:** e.g. F05 leaves 7 mm between reserved centres, while two 3 mm intervals allow at most 6.6 mm and three require at least 8.1 mm.
- **Construction rejected:** e.g. current tip recipe leaves an arm, or its real footprints violate clearance. This does not prove every alternative corner treatment impossible.
- **Unsupported/unresolved:** e.g. branch topology, mixed-span phase requested, or zero accepted candidates without a completeness argument.
- **Physical clearance unverified:** width/margin/boundary calibration missing despite a mathematically fitted route.

“Exact” should mean no ordinary pitch correction under the selected construction. “Adjusted” should mean a bounded correction exists. Neither should imply all validation passed. Accepted prefixes may remain visible for diagnosis after a failure, but the whole requested route remains incomplete. A complete CAD generation should not label that prefix a completed seam.

## Verification and remaining decisions

Read `STITCH_MODEL.md`, `geometry.mjs`, `case-suite.mjs`, and `test-core.mjs`. Ran `node test-core.mjs`: **30 passed, 0 failed**. Reproducible proposed-geometry evidence: `node output/review/model-evidence.mjs`, **65 checks passed**, covering all winding/turn combinations, both mixed line/arc orders, tangent shared slits, no/two roots, finite-guide rejection, width clearance, and the large-radius limit. At radii 10000/8000 mm the arc/arc candidate approaches the straight `J` within `.00001 mm`; nominal chord and virtual-tip residuals for the ordinary-radius cases are below `1e-12 mm`. An independent reviewer reproduced the A03 derivation and finite slit distances. The approximate `.4 mm` clearance threshold was found separately by a `.001°` review sweep; this is evidence, not proposed production angle searching. A `package.json` read failed because this repository has no such file; no installation was needed or attempted.

Before production: calibrate the opening footprint and retained-material margin, implement the selected analytic corner rule and common planner, and settle the explicit correction-symmetry priority. Add focused checks for nonadjacent/closure collisions, tangent subdivision invariance, conflicting landmark reservations, and centered correction placement. Changes from this review are this document and its standalone evidence script; production behavior is unchanged.
