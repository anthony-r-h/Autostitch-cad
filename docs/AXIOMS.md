# Axioms

These rules define valid stitch geometry. Terms are defined in the [glossary](GLOSSARY.md). Pitch is $p$, slit length is $\ell$, slit lean is $\alpha$, and the required clearance margin is $m$.

| ID | Rule | Motivation |
| --- | --- | --- |
| A1 | A stitch line follows one guide or connected guides, each with a direction and chosen extent. Real slit centres lie on their guides. Subdivision alone does not change the layout. | Placement depends on geometry, not how the guide is divided. |
| A2 | Each slit has fixed length $\ell$, width and signed lean $\alpha$ relative to the local tangent. | Curvature and pitch do not change the slit profile. |
| A3 | Pitch is the direct centre distance of a nominal gap: $\lVert C_{i+1}-C_i\rVert=p$. On a circle, it is a chord. Junction gaps follow A6 or A9. | Equal pitch means equal straight-line separation. |
| A4 | A landmark is midway in guide station between two nominally spaced slits. No opening lies at the landmark. | The reference falls inside a full nominal stitch. |
| A5 | Chosen endpoints, landmark pairs and junction neighbours are fixed constraints. Fitting the intervening spans cannot move them. | Feature placement takes precedence over spacing adjustment. |
| A6 | At a sharp two-arm junction, one round hole replaces two virtual slits whose selected tips meet. Each real neighbour lies on its arm, before or after its virtual slit, at a corner step $q$ with $0.9p\leq q\leq1.1p$. | Both arms use the same tip-to-tip construction, with bounded placement adjustment. |
| A7 | Unprotected slit-to-slit gaps may be adjusted within $0.9p\le g\le1.1p$. Protected gaps remain nominal. | Fitting has an explicit adjustment allowance. |
| A8 | A smooth change of curvature shares one tangent-aligned slit. Closure and connected arms reuse their shared opening once; its centre, type and slit axis must agree. | One shared location has one compatible opening. |
| A9 | Three or more incident arms share one round hole at their intersection. The first slit centre on every arm is at chord distance $p/2$ from the hole centre, using that arm's pitch. These neighbours are fixed. | On straight arms, each connection has the ordinary thread angle and half its visible length. |
| A10 | Distinct real openings must neither touch nor overlap and must retain margin $m$. All openings must satisfy this together. Virtual slits are excluded. | A valid local fit cannot create a collision elsewhere. |

No solution exists when these constraints cannot all be satisfied.

[Model and solution](MODEL.md) defines how one valid layout is selected. [Junctions](JUNCTIONS.md) gives the corner construction and angle bounds. [The audit](../tests/AXIOM_AUDIT.md) maps the rules to executable checks.
