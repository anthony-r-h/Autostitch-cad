# Glossary

Terms used by the [axioms](AXIOMS.md), [model](MODEL.md) and [junction construction](JUNCTIONS.md).

## Guide and features

| Term | Definition |
| --- | --- |
| Guide | The path on which ordinary slit centres lie. It can contain straight and circular segments. |
| Stitch line | An oriented portion of a guide, with a chosen start and end or a closed loop. |
| Segment | One straight or circular portion of a guide. Dividing a segment does not itself introduce a stitching feature. |
| Station | Position measured by distance along the guide from a chosen origin. On a curve, this is arc length. |
| Tangent | The guide's direction at a point, following traversal. |
| Arm | One portion of a stitch line extending away from a junction. A through-line contributes two arms; a T has three and an X has four. |
| Junction | A meeting of stitch arms whose placement is handled together. Its geometry determines whether there is a shared opening or an uninterrupted continuation. |
| Sharp corner | A two-arm junction where the tangent direction changes abruptly. Its round hole is constructed from virtual slits. |
| Smooth join | A meeting with continuous tangent direction. Equal-pitch straight or co-circular continuation remains one run; a smooth change of curvature shares one slit. |
| Branch | A junction with three or more arms, such as a T or X. It has a shared round hole at the guide intersection. |
| Landmark | A reference position centred along the guide between two nominally spaced slits. It fixes that pair; there is no opening at the reference itself. |
| Reservation | Opening positions or nominal gaps fixed by an endpoint, landmark or junction before the remaining spacing is fitted. |
| Free span | The portion between fixed reservations whose intermediate openings still need to be placed. Protected gaps at its ends remain fixed. |

## Spacing

| Term | Definition |
| --- | --- |
| Pitch, $p$ | The target direct centre-to-centre spacing. On a circle it is a chord distance, not distance travelled along the curve. |
| Gap / interval | The spacing between consecutive opening centres. It does not mean an omitted stitch or the clear space between opening edges. |
| Ordinary gap (normal gap) | A slit-to-slit interval governed by the ordinary pitch rule. It may be nominal or adjusted. Use **ordinary** in these docs. |
| Nominal gap | A gap whose direct centre distance equals $p$. Being nominal does not by itself make a gap protected. |
| Adjusted gap / corrected gap | An ordinary gap whose spacing differs from $p$, within $0.9p\leq g\leq1.1p$. |
| Protected gap | A gap fixed at nominal pitch and excluded from spacing adjustments. The gap centred on a landmark is one example. |
| Junction interval | An interval with a round-hole endpoint. Sharp-corner distances follow the virtual-tip construction; branch neighbours are one nominal pitch from the hole. |
| Correction block | The contiguous group of equal adjusted gaps chosen within one free span. |
| Nominal step | The advance along a guide that produces one pitch of direct spacing. On a circle of radius $R$, its arc length is $2R\arcsin\left(p/(2R)\right)$. |

**Ordinary** identifies the spacing rule, **nominal** identifies the distance, and **protected** says whether that distance may change. A landmark is the reference that fixes a gap, not the gap itself.

## Openings and angles

| Term | Definition |
| --- | --- |
| Opening | A real slit or round hole. A shared opening is counted once even when several arms use it. |
| Slit axis | The finite centreline running from one slit tip to the other. |
| Slit length / width | Length $\ell$ runs along the slit axis; width $w$ is transverse to it. They are separate dimensions. |
| Slit lean, $\alpha$ | The signed angle between the local guide tangent and the slit axis. |
| Virtual slit | A construction-only slit whose selected tip locates a corner hole. It is not a separate opening. |
| Clearance | The shortest edge-to-edge separation of disjoint real openings, accounting for slit width and hole diameter. Touching or overlap is invalid. |
| Clearance margin, $m$ | The required minimum clearance. Touching remains forbidden when $m=0$. |
| Turn angle, $\delta$ | The signed change from the incoming tangent to the outgoing tangent. A straight continuation has zero turn. |
| Included angle, $\beta$ | The angle between the two arms pointing away from a corner: $\beta=\pi-\lvert\delta\rvert$. Small included angles describe sharp corners; small turns describe nearly straight joins. |

Construction rules and angle bounds are in [junctions](JUNCTIONS.md); fitting choices are in [model and solution](MODEL.md).
