# Practical stitch rules: investigation and proposed decisions

This is a proposal for the next model, not a report of physical validation.
The current code implements the old end-correction policy; no source code was changed here.
The useful kernel is fixed features, mostly nominal spacing, a small correction block, and explicit failure.

## Decisions

1. Keep nominal centre pitch, the existing ±10% bound, and the minimum necessary number of changed gaps.
2. Centre one contiguous correction block in each remaining anchored span, away from its two features.
3. Preserve reserved geometry first. A landmark splits the fitting problem; it is not an obstacle to dodge afterward.
4. Prefer exact single-opening geometry over an unverified promise that a multi-tooth iron can reproduce every opening.
5. Reject intersecting or inadequately separated real openings. Keep dimensional clearance separate from arithmetic tolerance.
6. Treat the canonical slit and round hole as provisional until measured and stitched in representative leather.

This is enough for the first practical tool. It does not require a global optimizer, tool-motion planner, automatic feature detection, or a family of correction-placement options.

## Where corrections go

Changing the location of corrections does not change how many are necessary.
For a straight span of length D, pitch p, chosen interval count n and residual r:

```text
r = D - n p
k = ceil(abs(r)/(0.1 p))       when r != 0; otherwise k = 0
changed gap = p + r/k
```

Keep the existing feasible-count calculation and equal correction sizes.
For k > 0, with protected prefix/suffix counts qStart and qEnd, choose:

```text
ideal block start = (n-k)/2
admissible start range = [qStart, n-qEnd-k]
i = nearest integer to ideal, clamped to that range
half-integer tie: choose the later interval
changed interval indices = i, ..., i+k-1
```

The block midpoint is `i p + (k p+r)/2`; the span midpoint is `(n p+r)/2`.
Their difference is `p (i-(n-k)/2)`, so this centres the block geometrically, not merely by eye.
The same index rule centres a circular block in angular station: substitute nominal angle A and angular residual for p and r.
This does not mean centring the straight chord midpoint on the circular guide.

At p = 3 mm, zero-based indices give:

| Span | n, k | Old latest indices | Proposed indices | Changed pitch |
| --- | --- | --- | --- | --- |
| 30.5 mm | 10, 2 | 8, 9 | 4, 5 | 3.25 mm |
| 30.3 mm | 10, 1 | 9 | 5 | 3.30 mm |
| 31 mm | 10, 4 | 6–9 | 3–6 | 3.25 mm |
| 30.3 mm, final gap protected | 10, 1 | 8 | 5 | 3.30 mm |

The 30.5 mm example preserves four nominal intervals beside each endpoint.
The old placement preserves eight on one side and none on the other.
Both meet the same numerical minimum; middle placement better serves the requested emphasis on junctions.
It may split one long nominal tool run into two. That is a real tradeoff, not proof of excessive work.
There is no evidence yet that either placement universally looks better after stitching.

## Symmetry and obstructions

Centre placement means nearest possible centre, not guaranteed reflection symmetry.
For 30.3 mm with ten intervals and one correction, indices 4 and 5 are equally close to centre.
Changing either one breaks exact reflection symmetry. Two central 3.15 mm gaps restore symmetry but change two gaps instead of the minimum one.
Keep the minimum-one result by default; do not silently add a correction to hide this discrete limitation.
The tie rule also means reversing route order can select the opposite gap.

A centred crossing is already a protected nominal gap with fixed anchors on both sides.
Solve the two resulting spans independently and centre their own correction blocks.
Equal-looking corrections on opposite sides are possible only when their lengths, anchors, and residual capacities permit them.
An asymmetric obstruction does not imply a symmetric solution exists.
Explicitly paired geometry may require symmetry; incompatible fixed anchors then legitimately fail.

After the baseline, support explicitly requested symmetry through a selected reflection axis and mapped feature pairs.
Require the guide and reservations to map onto themselves; solve one of each paired span and reflect its centre layout.
For a self-mapped straight span with symmetric protections, use the following constrained minimum at a fixed n:

```text
kSym = 2 ceil(k/2)     if n is even
kSym = k              if n is odd
```

Use mirrored pairs with equal changes; odd kSym includes the central interval. When n is odd and kSym even, leave the central interval nominal between the two correction halves.
Compare the nearest feasible even n and nearest feasible odd n to minimize kSym across counts; their parity can change the winner.
Thus the 30.3 mm example legitimately uses two 3.15 mm corrections under symmetry, rather than pretending the unrestricted minimum still applies.
For circles, compare the lower/upper feasible counts of each parity using the existing asymmetric angular capacities; this is a bounded direct calculation.
Constrain centres and spacing by default: reflecting actual slit axes reverses handedness, so regenerate the selected local lean unless inverse tooling is intended.
Recommend this explicit operation after the baseline, not an automatic symmetry guess or a bare toggle without an axis and feature mapping.

Do not invent an obstruction planner that slides gaps across landmarks or moves committed holes.
If a reserved feature consumes the available span, the fit either reuses the shared opening or fails.
Physical interference of a tool body with raised material is a different problem from a fixed stitch landmark.

## What a rigid chisel can reproduce

A straight iron has fixed tooth-centre spacing and fixed relative tooth orientations.
Nominal straight runs with one constant slit orientation can match it exactly, subject to the measured tool profile.
A corrected gap cannot be crossed by adjacent teeth of that nominal-pitch iron without departing from the prescribed centres.
The maker can position the nominal runs independently and place intervening openings individually as required.

Correction count is not a punch count. One changed gap can separate two independently placed nominal runs without an isolated single-tooth opening.
A block of k changed gaps has k-1 interior centres; its boundary centres can belong to the adjacent nominal runs.
Actual effort also depends on available tooth counts, overlap practice, access, and punching depth.
Keep minimum k as a simple geometric objective, not a claim of minimum labour or best appearance.

For a circular guide with chord pitch p and radius R:

```text
A = 2 asin(p/(2R))
adjacent desired slit orientations differ by A
```

Two teeth can match the two centres, but their parallel slit axes cannot both match the two tangent-relative slit directions.
Aligning the iron with the chord gives orientation errors of A/2 on each side.
Three consecutive circular centres are noncollinear, so three straight-array teeth cannot exactly match them either.
At R = 10 mm and p = 3 mm, A = 17.253853 degrees; the two-tooth orientation errors are 8.626927 degrees.
The middle of three consecutive centres lies 0.45 mm away from the line through the outer centres.
Reusing a hole while rotating an iron can also recut its slit in a different direction.

Therefore keep the exact tangent-relative curve model as an individually placed opening layout.
Do not declare two-tooth curve punching exact, or invent a universal maximum radius/error threshold.
A later measured approximation could permit it; it must explicitly change the reproduction claim.

## Width, material margin, and corners

Use distinct quantities: slit axis length l, effective opening thickness w, round-hole diameter d, and retained material margin m.
A catalogue's tooth “width” commonly describes the long cutting dimension represented here by l; it is not evidence for w.
For example, [Rocky Mountain's own iron table](https://www.rmleathersupply.com/products/rocky-mountain-premium-pricking-irons) lists 1.5–1.8 mm tooth widths for 3 mm pitch and 1.7–2.0 mm for 3.85 mm pitch.
[Sinabroks' own specification](https://www.sinabroks.com/products/inverseprickingirons) distinguishes 2.2 mm tooth width from centre-to-centre spacing and offers multiple tooth counts.
These sources support measuring the selected tool, not a universal 1.5 mm slit or 40-degree angle.

A capsule around each finite slit axis is a small, conservative clearance model:

```text
slit/slit: dist(axis1, axis2) >= (w1+w2)/2 + m
slit/round: dist(axis, centre) >= w/2 + d/2 + m
round/round: dist(centre1, centre2) >= (d1+d2)/2 + m
```

Reject contact when the required clearance is zero; positive-margin equality is the specified limit.
Check distinct real openings, including opposite arms and non-neighbouring openings near crossings.
Exclude virtual construction slits; a deliberately reused opening is one opening, not a collision pair.
The current `0.9 p > l` guard is sufficient only for adjacent zero-width slit separation.
It does not establish round-hole clearance, narrow-corner clearance, or material strength.

If a material boundary is supplied, require the entire opening inside the material and its distance to the boundary at least m.
A stitch guide alone cannot prove that condition. Do not guess the leather outline from the guide.
There is no justified universal numerical w or m from this investigation.
Keep measured w in the tool profile and deliberately selected m in the material/process setup; zero-width/zero-margin output remains ideal geometry with physical clearance unverified.
Do not present a dimensional example as a tested production default.

The straight tip-based corner preserves schematic thread vectors, not a demonstrated stitch or material response.
Its small-turn failures are real failures of that construction; near reversals additionally require opposite-arm clearance checks.
At 3 mm pitch, the nearest opposite-slit axis gaps are 0.389272 mm for a 20-degree included corner and 0.167891 mm for 10 degrees, for either turn sign.
An angle cutoff is unnecessary when the actual finite geometry can be tested.

Adopt the analytic tip-locus extension as the proposed geometric treatment of sharp curved joins; it is not implemented in the current source.
An incoming virtual a-tip moves on a parallel line or a concentric circle; so does an outgoing virtual b-tip.
Intersect those two loci, invert each tip to its virtual centre, and step one nominal chord backward/forward to the real neighbours.
There are at most two ordinary finite intersection candidates. Filter by actual finite-arm fit and real-opening clearance, then choose the feasible J nearest the guide vertex.
Resolve exact distance ties by lexicographic incoming/outgoing virtual stations. This is an explicit locality policy, not a physical theorem.
Coincident loci need separate handling; they do not define one isolated intersection candidate.
Because J replaces the exact virtual tip, each leg preserves its own nominal tip-to-tip display vector.
Curvature changes that reference vector: equality between guide turn and display turn is not an invariant.
For the radius-10 incoming arc and 90-degree outgoing line at p = 3, independent calculation gives J = (0.482091, 0.476961) and display turn 92.703660 degrees.
This establishes a geometric construction, pending the same finite clearance and physical checks as straight corners.

## Small validation needed next

1. At the usual 3 mm pitch, measure the intended iron's actual pitch, slit length, angle and effective opening thickness at representative penetration depth; retain a photograph with a scale.
2. Stitch 30.5 mm samples with the same two 3.25 mm corrections at the end and at the centre. Add the 30.3 mm single-correction case to inspect the unavoidable half-index asymmetry.
3. Punch a radius-10 arc using individually placed slits and a two-tooth iron; inspect both faces, orientation differences and recut holes before and after stitching.
4. Compare a 90-degree corner, a 20-degree included corner, and the radius-10 arc/line join above using the proposed 0.5 mm round hole. Check actual nearest cuts, retained material and stitched appearance.
5. Use the intended leather, thickness, thread and punching process throughout; record the selected clearance margin and whether each sample passes the maker's appearance and material criteria. A failed coupon can reject the provisional rule or tool profile.

Numerical validation performed: existing `node test-core.mjs` passed 30/30 tests; direct Node calculations reproduced the correction examples, circular errors, narrow-corner clearances and analytic arc/line join. The proposed straight-span symmetry count rule matched an exhaustive count oracle in 7,667 feasible cases with varying lengths and symmetric protections.
Those tests validate existing model consistency, not the proposed new placement implementation or physical workmanship.
No physical samples were measured or stitched in this investigation.
