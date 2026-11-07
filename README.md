# Autostitch for BricsCAD

A BricsCAD tool that turns editable stitch lines into regenerable slit and hole layouts, including connected corners, T junctions and crossings.

The implementation is tested in **BricsCAD V22.2 / OpenDCL 10.1.2.2**. See [the original-axiom audit](tests/AXIOM_AUDIT.md) for case coverage and explicit rule changes, and [verification results](tests/QUALIFICATION.md) for native checks and limits. Physical tool calibration remains open.

## Start here

1. Keep `AUTOSTITCH.lsp`, `AUTOSTITCH.odcl`, `Autostitch.Events.dll` and the `source` folder together. The event bridge uses BricsCAD V22's built-in .NET support; no external package installation is needed.
2. In BricsCAD, use **APPLOAD** to load [AUTOSTITCH.lsp](AUTOSTITCH.lsp), then run **AUTOSTITCH**.
3. Click **Select stitch line**, enter **Stitch pitch** in millimetres, then **Generate stitches**. The starting pitch is 3 mm. New lines reuse the last committed pitch; existing work restores its saved inputs.
4. Edit the original line using normal CAD tools, then **Generate stitches** again. Select a source line, its editing markers or its linked output to reopen the work.

After opening the palette once, its commands are available in other drawings opened during that BricsCAD session.

The release ZIP includes `examples/Autostitch-practical-demo.dwg`: fourteen editable examples covering landmarks, straight and curved corners, mixed polyline/line paths, branches and crossings. Open it, run AUTOSTITCH, and select a source line to try the controls.

Supported source entities are `LINE`, `ARC`, `CIRCLE` and `LWPOLYLINE`, including bulged arc segments. They must lie in **WCS XY at Z=0**, with a positive Z normal. Separate entities can meet or cross without a CAD Join operation. Invalid constructions and overlapping stitch holes are rejected before output is replaced.

Each independent line or connected set is limited to **2,000 openings**. Larger requests fail explicitly; output is never truncated.

Drawing units come from `INSUNITS`; pitch and tool dimensions are always millimetres. A unitless drawing asks whether one drawing unit means a millimetre or an inch. Saved seams retain their unit conversion.

## Connecting stitch lines

Select one line, click **Connect stitch lines**, then select another line or its stitches. One new intersection connects directly. When several intersections need coordination, the tool reports the count and offers **ConnectAll** or Cancel. This includes intersections with the other lines already connected to either selection. Nearby unselected drawing geometry has no effect.

Connected lines share one output block on `AUTOSTITCH`. Corners, crossings and branches coordinate their shared opening. Two lines that simply continue along the same straight line or circle, with the same pitch, become one uninterrupted run; their source boundary does not force a hole. Each source keeps its own pitch, direction, landmarks and any older saved limits; the physical slit/hole profile must agree. Selecting a member edits that line's inputs, while **Generate stitches** recomputes the whole connected set. A failed operation preserves the previous complete output.

**Disconnect line** removes the selected line's connections and regenerates the resulting independent sets. If a source was deleted, select a surviving line or the old output and use **Remove missing lines**. This repairs the remaining connections without requiring Undo, including when the first selected line was deleted. Generate remains blocked until that explicit repair succeeds.

## Editing a line

- **Add landmark** picks an existing point on the pattern: snap to an endpoint, intersection or other reference point. The two neighbouring stitches retain nominal spacing, centred around that location; there is no hole at the landmark. Choose a landmark in the list and use **Remove landmark** to remove its constraint. To relocate one, remove it and add it again. Pattern geometry is unchanged.
- **Set start / Set end** choose where stitching begins and stops, including points within a guide. **Reverse direction** swaps the traversal direction. New lines default to the whole guide. At a point prompt, **Default** restores that endpoint; **WholeLine** restores both endpoints.
- For a closed line, your first selection pick chooses where stitching begins. **Set start** changes that point; **Set end** is disabled.
- **Generate stitches** commits the current pitch and output together. It also restores output moved, rotated or scaled independently back to its guides. Native **Undo / Redo** can reverse these operations.
- Reopening **AUTOSTITCH** also reloads saved inputs. After switching drawings, select a guide again before generating; a click cannot reuse another drawing's displayed seam.

The original sources remain authoritative and stay outside the stitch blocks. Editing aids are saved, nonplotting blocks on `AUTOSTITCH_UI`: compact `S` (start), `E` (end), `J` (junction), and a heavy transverse bar with `L#` (landmark). A subtle boxed stitch ID sits opposite `S`; it matches the palette and the stable ID in the generated block name. Connected guides share one ID and one box on their main guide. If that start is a junction, the box sits slightly along the guide. These IDs are local to the drawing; regeneration changes the block revision, not its ID. Point picking enables endpoint, midpoint, intersection, centre and node snaps alongside your existing snap choices, then restores your exact previous settings. Markers survive redraws and reopening, and follow ordinary MOVE, STRETCH and ERASE commands with Undo/Redo. Stitches update only when you Generate. Changes made through Properties, automation or another LISP routine refresh markers when the line is selected again.

A picked landmark is projected onto the nearest position on the stitch guide and attaches at a fixed physical distance along that segment. It is not a live link to another pattern object: if that object moves independently, remove and add the landmark again. Changed polyline topology can require rebuilding landmarks; **Remove landmark** offers **ClearAll** when correspondence is invalid. If saved limits cannot follow an edit, use **Set start / Set end** to choose replacements, or **WholeLine** in either pick prompt to reset both. For a connection whose attachment changed or disappeared, disconnect the affected line, then connect it again.

Within one drawing, copy all connected source lines and their output together to retain an editable copy. Copying output alone leaves static stitches; a partial source copy cannot edit the originals. Raw source guides must not overlap for a positive length, even when their selected ranges divide that overlap into adjacent pieces. Trim the overlapping source geometry before connecting it.

## Tool assumptions

Generated stitching always includes thread lines, changed-spacing crossbars and the virtual slits used to construct sharp corner holes. Slits and crossbars use **0.30 mm** strokes; thread and dashed virtual slits use **0.09 mm**. Round holes are filled, black on paper and white on a dark CAD background. These stroke weights control drawing appearance; the physical tool dimensions remain unchanged.

Short crossbars mark both tips of slits beside adjusted spacing, making each affected slit look like a capital `I`. Dashed virtual slits meet at the calculated round-hole centre; they are construction guides for sharp two-arm corners. T/X branch holes use their existing guide-intersection rule. Direction arrows sit on the stitch line just after `S`, following its direction.

Generate enables the thread, notation and construction layers for viewing and printing. Actual slits and circle boundaries stay on `AUTOSTITCH`, thread on `AUTOSTITCH_STITCHES`, crossbars and hole fills on `AUTOSTITCH_NOTES`, and dashed virtual slits on `AUTOSTITCH_CONSTRUCTION`. Editing labels remain nonplotting on `AUTOSTITCH_UI`. Older output needs **Generate stitches** once to receive the revised display. Nominal spacing on a curve does not guarantee a rigid multi-tooth iron will fit.

The current profile uses **1.5 mm slits, 0.5 mm hole diameter and 40° lean**. Tool width, retained-material margin and material-edge clearance are uncalibrated. Curves and adjusted gaps may require individual tool placement; the output does not guarantee a rigid multi-tooth iron will reproduce the pattern.

## Design and development

[STITCH_MODEL.md](STITCH_MODEL.md) defines geometry; [PHYSICAL_RULES.md](PHYSICAL_RULES.md) defines physical claims. [BRICSCAD_PLAN.md](BRICSCAD_PLAN.md) records implementation scope and acceptance gates. [REVIEW.md](REVIEW.md) retains the design review.

The older JavaScript laboratory and gallery remain available and contain earlier rules, including superseded A03/A04 experiments. They are not runtime dependencies of the CAD plugin. To inspect them with Node.js 18+:

```sh
node run-tests.mjs
node build.mjs
node test-viewer.mjs
node review/model-evidence.mjs
node review/correction-evidence.mjs
```
