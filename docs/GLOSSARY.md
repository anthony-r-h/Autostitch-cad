# Glossary

Terms used by the [axioms](AXIOMS.md), [model](MODEL.md) and [junction construction](JUNCTIONS.md).

![Guide, slit, nominal and adjusted gaps, landmark, protected gap and free span](../examples/illustrated/assets/terms-layout.png)

Notation: `s` start, `e` end, arrow for direction, `L1` landmark. The `I` crossbars identify slits bordering adjusted gaps.

## Guide

An editable path on which real slit centres lie, made of straight or circular **segments**. A **stitch line** is the stitching defined on one guide or a connected set of guides. Each guide has a chosen extent and direction; it may be open or a closed loop. Connected guides meet at junctions and share one stitch ID.

**Station** is distance along the guide from a chosen origin; on a curve, it is arc length. The **tangent** is the guide's local direction.

**Matched guides** use one source stitch line's complete hole layout. A match can include a whole connected guide set on another pattern piece; it does not add an arm to a junction. **Front face** and **Back face** identify the material face shown in the drawing; opposite-face copies reflect the complete layout. Travel direction remains a separate choice.

## Slit

A slit is one type of **opening**; a round hole is the other. Its **axis** is the finite centreline between its tips. **Length** $\ell$ runs along that axis, **width** $w$ across it, and **lean** $\alpha$ is its signed angle to the guide tangent.

![Magnified slit showing its axis, length, width and lean relative to the tangent](../examples/illustrated/assets/terms-slit.png)

A **virtual slit** is construction only: its selected tip helps locate a corner hole. It is not a separate opening.

## Gap and pitch

A **gap** is the direct centre-to-centre spacing between consecutive openings. **Pitch** $p$ is the target spacing. On a circular guide, the gap is the **chord length**: measured straight between the centres. **Arc length** follows the guide between those same centres.

For radius $R$ and angular separation $\theta$ in radians:

$$
g=2R\sin\left(\frac{\theta}{2}\right),\qquad s_{\mathrm{arc}}=R\theta.
$$

![Chord length measured straight between slit centres, compared with arc length along the guide](../examples/illustrated/assets/terms-chord.png)

At $R=3\,\mathrm{mm}$ and $\theta=\pi/3$, the nominal chord gap is $3\,\mathrm{mm}$; the arc length is approximately $3.14\,\mathrm{mm}$.

- **Nominal gap:** equals $p$.
- **Adjusted gap:** a slit-to-slit gap changed from $p$, within $0.9p\leq g\leq1.1p$.
- **Protected gap:** fixed at $p$ and cannot be adjusted, such as the gap centred on a landmark.

Sharp-corner gaps with a round-hole endpoint follow the corner construction. A **corner step** is the centre distance from a virtual slit to its real neighbour: nominally $p$, adjustable within $0.9p\leq q\leq1.1p$ to keep that neighbour on its guide. It is not a real slit-to-slit gap. At junctions with three or more arms, each first neighbour is one nominal pitch from the shared hole.

Consecutive equal adjusted gaps form an **adjustment block** within a free span.

- **Number of adjusted gaps:** how many gaps differ from nominal pitch.
- **Absolute adjustment:** $\sum_i\lvert g_i-p\rvert$, the total change in gap lengths. Compression and extension both add to the total.
- **Absolute residual:** $\sum_j\lvert r_j\rvert$, the total length to distribute before fitting, summed over the free spans.

For a span with $n$ gaps, its residual is $r=L-np$ on a straight guide, or $r=R\left(\lvert\theta\rvert-2n\arcsin\left(p/(2R)\right)\right)$ on a circular guide of radius $R$ and sweep $\theta$ in radians. Absolute residual uses length along the guide; absolute adjustment uses chord lengths. They can differ on curves.

**Absolute stitch-length deviation:** $\sum_i\lvert t_i-t_{0,i}\rvert$, the total difference between visible thread lengths and ordinary straight-row stitches at nominal pitch. It includes changes caused by spacing, curvature and corner treatment.

For slit length $\ell$ and lean $\alpha$, the straight-row baseline is $t_0=\sqrt{p^2+\ell^2-2p\ell\cos\alpha}$. Measure $t_i$ between the thread endpoints in the diagram: slit tips or round-hole centres. This measures length variation, not thread direction or visual quality.

## Junction

A meeting with two or more **arms**: portions of stitch lines extending away from it. A through-line contributes two arms, a T has three, and an X has four.

![A T junction with one shared round hole and three arms](../examples/illustrated/assets/terms-junction.png)

- A **smooth join** keeps the tangent direction. Straight or co-circular continuation at equal pitch remains one run; a smooth change of curvature shares one slit.
- A **sharp corner** has two arms with different tangent directions. Virtual slits locate its shared round hole.
- A junction with three or more arms, such as a T or X, shares a round hole at the guide intersection.

For a two-arm corner, the **turn angle** $\delta$ is the signed change of tangent direction. The **included angle** $\beta$ is the angle between the arms pointing away from the corner:

$$
\beta=\pi-\lvert\delta\rvert.
$$

A small included angle is sharp; a small turn is nearly straight.

## Landmark

A reference position centred along the guide between two nominally spaced slits. It fixes that pair; there is no opening at the reference itself.

## Free span

The section between fixed features whose intermediate openings still need to be placed. Endpoints, landmarks and junctions fix the required opening positions and protected gaps; fitting fills the remaining space without changing them.

## Clearance

The shortest edge-to-edge separation of disjoint openings, accounting for slit width and hole diameter. The **margin** $m$ is the minimum required clearance. Touching or overlap is invalid, including when $m=0$.
