# Autostitch for BricsCAD

Lay out stitch holes from editable pattern lines. Set pitch, mark pattern landmarks, and connect lines where they share stitching. Regenerate after editing the pattern; the source lines remain the source of truth.

## Use

1. Install the [dependencies](docs/LIMITS.md#dependencies). Keep `AUTOSTITCH.lsp`, `AUTOSTITCH.odcl`, `Autostitch.Events.dll` and `source/` together.
2. **APPLOAD** `AUTOSTITCH.lsp`, then run **AUTOSTITCH**.
3. **Select stitch line**, enter **Stitch pitch**, then **Generate stitches**.
4. Edit the guide with normal CAD tools. Select its guide, editing marker or generated block to reopen it, then Generate again.

Guides may be LINE, ARC, CIRCLE or LWPOLYLINE, in WCS XY at elevation $z=0$ with a positive Z normal. Pitch and tool dimensions are millimetres. Drawing units come from `INSUNITS`; unitless drawings ask for millimetres or inches.

| Control | Action |
| --- | --- |
| Set start / Set end | Pick where stitching begins and stops along an open guide. `Default` restores that endpoint; `WholeLine` restores both. |
| Reverse direction | Reverse traversal. For a closed guide, Set start chooses its beginning; Set end is disabled. |
| Add landmark | Snap to a pattern reference. Reserve one nominal gap centred around its position on the guide, with no hole at the reference. |
| Remove landmark | Remove the landmark chosen in the list. To move one, remove it and add it again. |
| Connect stitch lines | Select another guide. Corners and T/X junctions in the connected set share openings. Multiple intersections offer `ConnectAll`. |
| Disconnect line | Separate the selected member and regenerate the resulting sets. |
| Generate stitches | Save pitch and replace the complete output in one Undo step. Failure preserves the previous output. Independently moved output returns to its guides. |

Corners within a polyline are automatic. Separate entities need Connect stitch lines; nearby pattern geometry does not connect itself.

Each connected set has one output block. Members keep their own pitch, direction, endpoints and landmarks. Selecting a member shows its inputs; Generate recomputes the whole set. The stitch ID is shared by the set, appears in the palette and a small box opposite `S`, and stays the same across regenerations. At a shared start junction, the box sits slightly along the main guide. IDs are local to the drawing.

## Read the drawing

| Mark | Meaning |
| --- | --- |
| Slit or filled circle | Physical opening. |
| Thin connecting line | Thread display. |
| Capital `I` at a slit | Spacing beside this slit differs from nominal pitch; place that spacing individually. |
| Dashed virtual slits | Construction for a sharp corner's round hole. |
| `S`, `E`, arrow | Start, end and direction. |
| `J` / `L#` | Junction / landmark. |
| Boxed ID | Stitch block identity; one label per connected set. |

Slits and `I` marks use $0.30\,\mathrm{mm}$ strokes; thread and construction use $0.09\,\mathrm{mm}$. Round holes print black. Generate includes these displays and enables their layers. Editing labels, including boxed IDs, are on nonprinting `AUTOSTITCH_UI`.

## Edit and repair

- Markers follow native MOVE, STRETCH and ERASE with Undo/Redo. Generate updates the stitches. Properties and automation edits refresh markers on selection.
- A landmark stores a position along its guide, not a live link to the snapped pattern object. If that reference moves independently, remove and add the landmark.
- If an edit invalidates attachments, replace start/end picks or use `WholeLine`; remove affected landmarks (`ClearAll` is available); disconnect and reconnect affected junctions.
- If a source was deleted, select a surviving member or old output and choose **Remove missing lines**. Failed repair preserves the old output.
- Copy the complete set of sources and output together to retain editability. Output copied alone is static. Partial copies cannot regenerate the originals.
- After switching drawings, select a guide before generating.

## Reference

- [Glossary](docs/GLOSSARY.md)
- [Axioms and their motivation](docs/AXIOMS.md)
- [Model and fitting mathematics](docs/MODEL.md)
- [Junction construction](docs/JUNCTIONS.md)
- [Geometric limits and dependencies](docs/LIMITS.md)
- [Reusable test catalog](tests/cases.json), [qualification](tests/QUALIFICATION.md), [axiom coverage](tests/AXIOM_AUDIT.md)
- [Long-form README outline](docs/README_OUTLINE.md)
- [Repository and development instructions](AGENTS.md)
