# Axioms

These are the tool's design rules. [Model](MODEL.md) gives the mathematics; [junctions](JUNCTIONS.md) defines shared openings. Physical assumptions and unresolved questions live in [limits](LIMITS.md).

| ID | Rule | Motivation |
| --- | --- | --- |
| A1 | The user's guide defines an ordered route, start, end and direction. | Editing the pattern must remain simple. |
| A2 | Ordinary slits have a fixed shape and lean relative to the local tangent. | A tool profile should not change when pitch or curvature changes. |
| A3 | Ordinary pitch is direct centre distance; on a circle it is a chord. | Tooth spacing measures a straight distance. |
| A4 | A landmark sits halfway in station between two nominally spaced openings. No opening lies at the landmark. | Keep stitching consistent around a pattern reference. |
| A5 | Reserve endpoint, landmark and junction constraints before filling free spans. | Fitting must respect the features that define the pattern. |
| A6 | Use the fewest changed ordinary gaps. | Keep nominal runs usable with the chosen pitch. |
| A7 | Each changed ordinary gap stays within 90-110% of nominal pitch. Protected gaps stay nominal. | Bound local spacing variation. |
| A8 | Reuse one opening at closure or a declared shared junction. Keep reserved anchors fixed during a solve. | One physical hole must have one identity. |
| A9 | Use direct formulas and bounded candidate selection. | Results should be reproducible and explainable. |
| A10 | Reject an infeasible construction without relaxing its constraints or replacing prior output. | Some patterns need revision. |

## Decisions that complete the rules

- Put equal corrections in one contiguous block per free span. Among minimum-correction solutions, prefer exact centring, then smaller fractional change, then fewer intervals. If exact centring is unavailable, use the nearest permitted placement; half-index ties go toward the end.
- Normalize redundant collinear and co-circular subdivisions. A CAD vertex alone must not change stitching.
- Use one slit at a genuine smooth change of curvature; use the sharp-corner or branch rule where appropriate.
- Sharp corners use intersecting virtual slit tips. Their round holes can lie off the guide vertex. T/X junctions use a shared round hole at the intersection.
- Check every distinct real opening pair across the connected set. Passing each span separately is insufficient.
- Generate recomputes the complete set from current inputs. There is no permanently committed prefix or automatic incremental regeneration.

[The audit](../tests/AXIOM_AUDIT.md) maps these rules to executable checks.
