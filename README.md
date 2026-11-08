# Autostitch for BricsCAD

Lay out stitch holes from editable pattern guides. Connect guides to define a stitch line, set pitch and landmarks, then generate its stitches. Regenerate after editing the pattern; the source guides remain the source of truth.

## Use

1. Install the [dependencies](docs/LIMITS.md#dependencies). Keep `AUTOSTITCH.lsp`, `AUTOSTITCH.odcl`, `Autostitch.Events.dll` and `source/` together.
2. **APPLOAD** `AUTOSTITCH.lsp`, then run **AUTOSTITCH**.
3. **Select guide**. Use **Connect guides** to include other guides in the same stitch line, if needed.
4. Enter **Stitch pitch**, set endpoints or landmarks, then **Generate stitches**.
5. Edit guides with normal CAD tools. Select a guide, editing marker or generated block to reopen it, then Generate again.

To add the yellow **Autostitch** ribbon button beside Csvlabel in **Home → Annotations**, run this from the installation folder with BricsCAD open and no command active:

```powershell
powershell -ExecutionPolicy Bypass -File .\source\install-ribbon.ps1
```

The installer backs up the current CUI under `output/ribbon-backups/`. Rerunning it updates the same button. Keep the installation folder in place; rerun the installer if you move it or reset BricsCAD's interface.

Guides may be LINE, ARC, CIRCLE or LWPOLYLINE, in WCS XY at elevation $z=0$ with a positive Z normal. Pitch and tool dimensions are millimetres. Drawing units come from `INSUNITS`; unitless drawings ask for millimetres or inches.

| Control | Action |
| --- | --- |
| Set start / Set end | Pick where stitching begins and stops along an open guide. `Default` restores that endpoint; `WholeLine` restores both. |
| Reverse | Reverse traversal. For a closed guide, Set start chooses its beginning; Set end is disabled. |
| Front face / Back face | Identify the face shown by the drawn guide. On the source, this sets slit lean. On a matched guide, it selects the corresponding view of the source layout. |
| Add landmark | Snap to a pattern reference. Reserve one nominal gap centred around its position on the guide, with no hole at the reference. |
| Remove landmark | Remove the landmark chosen in the list. To move one, remove it and add it again. |
| Connect guides | Include another guide in this stitch line and save its junctions. Creates no stitches; Generate lays out the connected guides together. Multiple intersections offer `ConnectAll`. |
| Disconnect guide | Separate the selected guide. Generate each resulting stitch line to update its stitches. |
| Match guide | Match this source stitch line to guides on another pattern piece. Select near the corresponding stitch start and choose the face shown. Loops request an exact snapped start point. |
| Select source / Unlink guide | Return to the source to edit its layout, or make this guide independent. |
| Generate stitches | Save pitch and replace the complete output in one Undo step. Failure preserves the previous output. Independently moved output returns to its guides. |

Corners within a polyline are automatic. Separate guides need Connect guides; nearby pattern geometry does not connect itself.

One stitch line can contain several connected guides and has one generated output block. Each guide keeps its pitch, direction, endpoints and landmarks; the palette shows the selected guide's inputs and length. Generate recomputes the whole stitch line. Connecting or disconnecting guides saves their relationships without regenerating; previous output remains until Generate succeeds.

Stitch IDs are `ST-1`, `ST-2`, and so on, local to the drawing. The generated block has the same name. The set shares one ID, shown in the palette and a small box opposite `S`; regeneration keeps that ID. At a shared start junction, the box sits slightly along the main guide. Existing drawings receive the new labels when selected; Generate updates their old output block names.

## Matched guides

Draw matching guides on each piece. They must have the same shape and size; their position, rotation and face may differ. Connect any junctions within each piece first, then select the source and **Match guide**. Matched guides use the source ID with letter suffixes: `ST-10-A`, `ST-10-B`, through `Z`, then `AA`, `AB` and onward. Removing a copy does not renumber the others. Generate updates existing linked names and their blocks.

The source owns pitch, endpoints and landmarks. **Generate stitches** updates the source and its matched guides together. Copies receive the complete layout, including junction holes and adjusted spacing, without fitting again. A failed match preserves all previous output. Unlink guides before changing their guide connections. If a copy was deleted, select the source and use **Remove missing**.

On a child, pitch, endpoints and landmarks are read-only. Moving its complete guide set is allowed; a shape change must still match the source before generation can replace output. Native COPY of a child alone creates an independent stitch line. After native REVERSE or rebuilding a guide in the opposite direction, unlink and match it again to confirm the corresponding start.

Front/Back describes the face represented by the supplied guides; it does not mirror CAD geometry. Changing the source face changes its slit profile and requires regeneration. A matched guide on the opposite face must match a reflection of the source guides. **Reverse** still means travel direction.

## Read the drawing

| Mark | Meaning |
| --- | --- |
| Slit or filled circle | Physical opening. |
| Thin connecting line | Thread display. |
| Capital `I` at a slit | An adjacent gap or its corner construction step differs from nominal pitch; place it individually. |
| Small spacing number | Actual adjusted spacing in millimetres, rounded to two decimal places and centred on the guide, on nonprinting `AUTOSTITCH_UI`. At an adjusted corner, this measures the virtual-to-real step. |
| Dashed virtual slits | Construction for a sharp corner's round hole. |
| `S`, `E`, arrow | Start, end and direction. |
| `J` / `L#` | Junction / landmark. |
| Boxed ID | Stitch block identity; one label per connected set. |

Slits and `I` marks use $0.30\,\mathrm{mm}$ strokes; thread and construction use $0.09\,\mathrm{mm}$. Round holes print black. Generate includes these displays and enables their layers. Editing labels, including boxed IDs, are on nonprinting `AUTOSTITCH_UI`.

| Layer | Contents | Prints |
| --- | --- | --- |
| `AUTOSTITCH` | Slits, filled round holes, spacing `I` marks and dashed virtual slits | Yes |
| `AUTOSTITCH_STITCHES` | Thread connections | Yes |
| `AUTOSTITCH_UI` | Start/end, direction, junctions, landmarks, boxed IDs and adjusted spacing values | No |

Generate updates older output to these layers. In existing drawings, merge `AUTOSTITCH_NOTES` and `AUTOSTITCH_CONSTRUCTION` into `AUTOSTITCH` to remove the old layers, including their use in retained block definitions.

## Edit and repair

- Markers follow native MOVE, STRETCH and ERASE with Undo/Redo. Generate updates the stitches. Properties and automation edits refresh markers on selection.
- A landmark stores a position along its guide, not a live link to the snapped pattern object. If that reference moves independently, remove and add the landmark.
- If an edit invalidates attachments, replace start/end picks or use `WholeLine`; remove affected landmarks (`ClearAll` is available); disconnect and reconnect affected junctions.
- If a source was deleted, select a surviving member or old output and choose **Remove missing lines**. Failed repair preserves the old output.
- Copy the complete set of sources and output together to retain editability. Output copied alone is static. Partial copies cannot regenerate the originals.
- After switching drawings, select a guide before generating.

## Try it

Open the [lettering specimen](examples/Autostitch-showcase.dwg): rounded and angular AUTOSTITCH, plus a square AUTO / STITCH composition. It includes curves, corners, junctions, landmarks and matched guides. [View instructions and exports](examples/README.md).

Use this fixed drawing for routine visual checks, then run the automated tests affected by a change. The full catalog remains available for solver and lifecycle regression checks.

## Reference

- [Glossary](docs/GLOSSARY.md)
- [Axioms and their motivation](docs/AXIOMS.md)
- [Model and fitting mathematics](docs/MODEL.md)
- [Junction construction](docs/JUNCTIONS.md)
- [Geometric limits and dependencies](docs/LIMITS.md)
- [Reusable test catalog](tests/cases.json), [qualification](tests/QUALIFICATION.md), [axiom coverage](tests/AXIOM_AUDIT.md)
- [Long-form README outline](docs/README_OUTLINE.md)
- [Repository and development instructions](AGENTS.md)
- [Why this exists](docs/WHY-THIS-EXISTS.md)
