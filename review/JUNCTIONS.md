# A shared hole is a physical opening

Design decision, 2026-11-07, revised after comparative numerical review and implemented in `source/autostitch-network.lsp`. Native and physical qualification remain separate; see [verification results](../tests/QUALIFICATION.md).

The selected-tip intersection rule preserves a schematic thread vector. It is not a necessary condition for making or stitching a hole. Three or more independent tip loci generally have no common point, so imposing that rule on a T or X would exclude connected patterns for an artificial reason. The documented shallow-turn exclusion is likewise a recipe limitation, not a physical impossibility.

**Decision: retain the intentional tip-locus treatment for sharp two-arm corners; use one round hole at the declared guide intersection for three-or-more-arm joins, with nominal first centre gaps.** Keep one tangent-aligned slit at a genuinely smooth two-arm join; normalize redundant subdivisions first. Classify physical incident arms, not CAD entity boundaries. Two separate LINEs meeting at a corner must give exactly the same treatment as a polyline corner.

The initially proposed universal guide-centred hole is geometrically simple but loses a real aesthetic invariant. At pitch 3, slit length 1.5, lean 40 degrees, it changes the two adjacent straight display segments from 2.087 to 2.473 mm and introduces 16.274-degree slope changes at their neighbouring slits. The tip-locus construction keeps those straight-run segments uniform. Both recipes preserve the straight corner's turn angle, so testing that angle alone misses the difference. No practical evidence justifies discarding the established preference at two-arm corners merely because branches require another treatment. See [same-scale comparison](junction-comparison.svg), [measurements](junction-comparison.json), and [independent checks](junction-comparison.mjs).

Nigel Armitage's own [beginner tuition catalog](https://secretsfromtheworkshop.com/online-leatherwork-tuition-beginners/) describes his use of round corner holes. That supports the practical choice of a round opening, but supplies no universal spacing formula, tip-contact requirement, or T/X qualification. The branch nominal-pitch construction below is our explicit design choice. Thread capacity, stitched appearance, and material strength still require samples.

## Declaration and meaning

- A shared hole means one emitted opening identity, used by every participating path. Never punch overlapping differently oriented slits to represent that identity.
- The user selects paths to **stitch together with shared holes at their intersections**. This operation explicitly declares a common workpiece and permits detecting intersections inside that selection. Selecting several drawing objects, proximity, or drawing-wide coincidence alone does not establish it.
- No CAD Join operation or single traversal is required. Preserve each source path's identity and station order. A physical opening graph does not prescribe a sewing itinerary.
- **Select landmark** selects an existing pattern reference. It requires two ordinary centres symmetric in station about the pick, exactly one nominal chord/line pitch apart, with no opening at the pick. It does not connect another stitch line. If the requirement applies to several connected paths, derive their reservations separately and validate all openings together.
- Different faces/layers remain separate declarations. Within one declaration validate clearance across all emitted paths, not merely inside each path.

## Analytic construction

1. Normalize connected collinear/co-circular subdivisions, preserving source stations. Find finite line/line, line/circle and circle/circle intersections. Split source primitives logically at every declared node; do not modify the user's entities. Merge the same computed point into one node, retaining all incidences, including an endpoint meeting another primitive's interior. Never merge distinct nearby intersections using a manufacturing-distance tolerance.
2. For a two-arm sharp node use the existing selected-tip construction after choosing equivalent incoming/outgoing orientation; traversal reversal preserves its physical geometry. For a branch node `P`, emit one round opening at the guide intersection with the chosen process diameter. For every incident branch arm, define the first nominal centre at distance `p` from `P`: line station advance `p`; circular station advance `b = 2 R asin(p/(2R))`, on that arm's signed minor-chord branch. Reject `p > 2R`. At that centre use the existing local tangent slit axis.
3. Reserve those centres and node-to-neighbour nominal gaps. A finite arm must reach its neighbour. If it meets another reserved node at exactly one nominal step, the two round holes are directly adjacent: reuse that one protected gap, with no artificial intermediate slit. At two nominal steps, the two end reservations reuse one slit.
4. Fit the remaining intervals using existing `ast:g-fit-line`, `ast:g-fit-arc`, and primitive landmark logic. No node displacement, phase optimization, far-root substitution, or repeated trial is needed. A feature whose required gap straddles a genuine mixed-primitive join remains unsupported until that specific construction exists.
5. Reuse only intentional equal opening identities and compatible equal reservations. Equal slits compare undirected axes. Validate every distinct real opening pair with the existing finite slit capsule/round disk checks, including pairs belonging to different source paths. A same-position incompatible reservation is a conflict, not permission to overcut it.

For a circle node with radial unit vector `er` and outgoing traversal sign `sigma`, the first neighbour is `C + R[cos(A) er + sigma sin(A) left(er)]`, where `A = 2 asin(p/(2R))`. This is an exact direct-distance construction; advancing arc length by `p` would be wrong.

At branches, nominal gap means direct centre distance even when one or both openings are round. The displayed tip-to-hole thread segment need not equal the ordinary displayed tip-to-tip segment. Keep those measurements distinct. Protected round-adjacent gaps are geometry constraints, not changed ordinary gaps. Two-arm tip-locus corner gaps retain their existing derived distances.

## Admitted and rejected cases

Admit finite planar LINE/ARC/CIRCLE and line/arc polylines in an explicitly connected group. Degree two can be an endpoint pair, T is endpoint/interior, and X is interior/interior. The same formulas cover line/arc and arc/arc. An explicit group can also contain a self-crossing source: the node has two incidences on that source and still emits one hole. Circle source storage needs a deterministic station zero, but a closed circular component with declared nodes takes its physical phase from those nodes.

Reject overlapping/coincident runs of positive length as ambiguous duplicated stitch paths; exact reversal retracing is included. Isolated tangency is not a blanket rejection: construct the shared hole and test actual neighbours, which may fail clearance. Reject conflicting hole/gap requests, insufficient finite arm length, incompatible coincident anchors, unreachable circle chord pitch, infeasible free spans, and footprint collisions. Reject unimplemented splines/ellipses/nonplanarity explicitly. Do not report construction failure as proof that the leather cannot be sewn.

Current attachment limitation: connection candidates and saved primitive identities use the original source guides. Two overlapping source entities cannot be connected merely by giving them disjoint Start/End ranges, even if those active ranges touch at one endpoint. Trim the source geometry first. Supporting that case requires range-aware intersection attachments with original primitive/station correspondence; changing only the candidate filter would leave regeneration incorrect.

A degree-two split on one smooth circle/line must not change the result. Two independent collinear endpoint pieces declared together should likewise normalize to the same run. A genuine smooth curvature change has the existing shared-slit phase constraint. An undeclared drawing crossing does not acquire a hole or move either seam.

## Acceptance fixtures

Use `p=3`, slit length `1.5`, lean `40 degrees`, hole diameter `.5`. For clearance examples only, use deliberate fixture values `w=.2,m=.2`; these are not production calibration.

| Fixture | Required outcome |
| --- | --- |
| Two orthogonal endpoint arms | Existing tip-locus corner; same output for joined polyline and separate declared LINEs. In reference SVG coordinates, hole is `(0.482091,0.482091)` at the default profile. |
| 24 mm horizontal line through origin, 12 mm vertical endpoint arm | T: one centre hole, 12 ordinary slits, 13 unique openings; no manual Join. |
| Two 24 mm orthogonal lines crossing at their midpoints | X: one centre hole and 16 ordinary slits, 17 unique openings. |
| Same X in two independent declarations | No shared opening identity and no implicit phase edit. |
| Two endpoint arms whose traversal turn is 5 degrees | Existing selected-tip recipe rejects; report construction limitation, never a physical inability to sew. Comparison B admits it but visibly changes adjacent thread vectors. |
| Two 12 mm rays separated by 1 degree | Fail finite-cut clearance near their first neighbours; do not move the hole. |
| Line/arc T, circle radius 10 | Arc first-neighbour angle is `2 asin(3/20)`, chord exactly 3; source and split representation agree. |
| Arc/arc X with distinct finite support-circle intersections | One hole at each declared finite intersection; no remote tip-locus root selection. |
| Two branch nodes joined by a 3 mm line | Exactly two holes and one nominal protected gap; no slit or false two-protection conflict. |
| Two branch nodes joined by a 6 mm line | Exactly two holes plus one shared midpoint slit. |
| Two branch nodes joined by a 7 mm line | Fail: nominal first/last gaps leave a 1 mm free span. No arbitrary anchor drift. |
| Hole request and centred-gap request at the same station | Clear conflict diagnostic, no output replacement. |
| Duplicate overlapping line selection | Reject ambiguity, do not produce duplicate cuts. |
| An unrelated nearby non-neighbour slit in the same group | Whole-group finite-footprint validation detects collision. |

## Minimal kernel contract

`ast:g-solve-set(paths, connections)` returns the existing opening/interval result plus opening identities and source references. A path retains `{id, route, settings, landmarks}`. A resolved connection contains `{id, point, incidences:[{pathId, primitiveIndex, station}]}`; it is derived only within the explicit group and checked against the source geometry. Each incidence expands into its actual finite half-arms. Persistent connections store source/primitive attachments and the selected intersection branch; recompute the actual intersection after an edit. A frozen world point must not silently become detached from its sources. If branch identity becomes ambiguous, report that the intersection needs repicking. Member pitch may differ; the physical opening profile must agree.

Internally only add node preparation, finite primitive splitting, local protected-gap reservations, and whole-group opening reuse. Existing independent span fitting remains the numerical engine. Return per-path ordered opening IDs for display and source references for diagnostics. Do not require an Euler traversal, global ordering, sewing schedule, optimization engine, or new manufacturing sliders.
