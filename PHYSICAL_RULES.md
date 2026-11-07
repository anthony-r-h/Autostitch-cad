# Physical rules and practical limits

Decisions for the next version; no leather samples were measured or stitched during this review. Placement mathematics lives in [STITCH_MODEL.md](STITCH_MODEL.md).

## Correction placement and symmetry

Use the fewest changed gaps; put them together near the middle of each free span. Among equal-count solutions, prefer an exactly centred block, then less fractional pitch change. Features split spans: corrections cannot be centred across a fixed landmark by moving its reserved holes.

| At pitch 3 mm | Decision | Why |
| --- | --- | --- |
| 30.5 mm | Two central 3.25 gaps | Same minimum count as the old end block; four nominal gaps on either side. |
| 31.5 mm | Eleven intervals; five central 2.7 gaps | Symmetry is available at the same minimum correction count; old lower-count tie missed it. |
| 30.3 mm | One 3.3 gap, nearest centre | Two 3.15 gaps would be symmetric, but require another correction. No evidence warrants making that universal. |
| 6.3 mm; final gap protected | 3.3 then 3 | Mandatory symmetry would reject an otherwise valid fit. |

This is a practical preference, not proof of minimum labour or superior appearance. The current gallery still shows end corrections. Compare both placements on stitched samples before revising the default again.

**Symmetry around an obstruction is a separate constraint.** Independent spans can have different residuals. Do not alter the opposite side by guessing a mirror partner. A later explicit pairing can solve one reflected centre/gap pattern, verify the other side's anchors, and reject incompatible pairs. Symmetry of centres does not imply reflected slit axes: reflection changes handedness. No general symmetry/obstruction planner is required for the first release.

## What chisels can reproduce

- A measured rigid iron can match a nominal straight run exactly.
- Adjacent nominal teeth cannot straddle a changed gap. Start the nominal runs independently; place intervening openings individually as needed.
- `K` corrected gaps is **not** `K` manual punches. A block has `K-1` interior centres; adjacent nominal runs can supply its boundary centres.
- On a circle, consecutive slit axes rotate by `A=2 asin(p/(2R))`. Even two parallel teeth cannot match both tangent-aligned slit axes exactly. Three collinear teeth cannot match three circular centres.

At `R=10 mm,p=3 mm`, adjacent desired axes differ by **17.253853 degrees**. A two-tooth iron aligned to the chord has **8.626927-degree** orientation error at each tooth. Three consecutive centres have **0.45 mm** middle-point deviation from the outer-centre line. Re-entering a hole while rotating the iron can also recut it.

Therefore the tool specifies **exact opening locations/orientations**, with multi-tooth use on suitable straight runs. Curves/corrections/junctions need individual placement or a separately validated approximation. Preview highlights these regions; it does not simulate leather deformation or tool-body access.

## Finite cuts, margin, and minimum angle

Keep slit **axis length** `l`, effective **thickness** `w`, hole **diameter** `d`, and retained-material **margin** `m` distinct. Catalog tooth width often denotes the long cutting dimension, not kerf: [Rocky Mountain's own table](https://www.rmleathersupply.com/products/rocky-mountain-premium-pricking-irons) varies tooth dimensions with pitch; [Sinabroks](https://www.sinabroks.com/products/inverseprickingirons) lists tooth width separately from centre spacing. Measure the actual iron; neither source establishes our provisional 1.5 mm/40-degree profile.

Use a capsule around each finite slit axis and a disk for each round hole:

```text
slit/slit:   distance(axis1,axis2) >= (w1+w2)/2 + m
slit/round:  distance(axis,centre) >= w/2 + d/2 + m
round/round: distance(centre1,centre2) >= (d1+d2)/2 + m
```

A capsule extends half its thickness beyond the axis tips; calibrate it as a conservative envelope. These envelopes validate clearance; the emitted cut geometry remains slit lines and circles. Zero-margin contact is rejected. Check every distinct real opening pair, including non-neighbours and closure; virtual slits are excluded and intentionally reused openings count once.

The old `0.9p > l` sufficient bound is **not a necessary condition**. Once exact footprint checks exist, failing it calls for those checks, not automatic rejection. At `p=3,l=3,alpha=40 degrees`, even a 2.7 mm gap leaves parallel slit axes about 1.736 mm apart; a conservative length-only bound would wrongly exclude it.

There are two different corner limits under the chosen tip rule:

| Limit | Consequence at `p=3,l=1.5,alpha=40 degrees` |
| --- | --- |
| Shallow nonzero turn | Required real neighbour leaves its arm below **22.483429 degrees of turn**; included angle must be at most 157.516571 degrees. Zero turn instead keeps a shared slit. |
| Sharp included angle | Opposite-arm real cuts approach: axis clearance is 0.389272 mm at 20 degrees, 0.167891 at 10 degrees, 0.014223 at 1 degree. |

The shallow-turn bound is `2 atan((l/2)sin(alpha)/(p-(l/2)cos(alpha)))` for this profile regime. It is a limitation of the selected corner recipe, not a universal inability to stitch a gentle bend.

**Illustration only:** `w=.2,m=.2 mm` requires 0.4 mm axis clearance and gives a local minimum included angle about **20.434 degrees**. Those are not calibrated production defaults. Finite arm length, other openings and round-hole clearance can tighten the window. Curves use the actual finite footprints too; tangent angle alone is insufficient. Report a useful failed distance/angle, never add a universal angle slider.

A guide supplies no leather boundary. If no boundary is selected, edge clearance remains unverified even when inter-opening clearance passes. Boundary checking is a later explicit input, not inference from nearby outlines. Positive geometric margin is not a material-strength guarantee.

## Physical qualification gate

Use one 3 mm tool/process preset first; record iron, leather, thickness, thread and punching depth.

1. Measure nominal pitch, opening length/orientation and conservative thickness envelope. Choose retained-material margin deliberately.
2. Stitch 30.5 mm samples with end versus centre corrections; add the 30.3 mm one-gap/two-gap comparison and 31.5 mm symmetric solution.
3. Compare individually placed and actual two-tooth curves at R10 mm and a typical gentler production radius; inspect both faces and reused holes.
4. Punch/stitch 90-degree and progressively sharper corners using the new rule. Verify the predicted ligament and round-hole behavior; include a shallow-turn rejection example.
5. Stitch one representative complete pattern before accepting the preset for production.

Missing calibration permits **ideal geometry generation with an explicit unverified status**. It must never be reported as physically qualified. No profile/margin numbers, tool-body collision simulation or leather mechanics model are invented to remove that uncertainty.
