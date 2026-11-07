# Autostitch for BricsCAD

A BricsCAD tool that turns editable stitch lines into regenerable slit and hole layouts, including connected corners, T junctions and crossings.

The implementation is tested in **BricsCAD V22.2 / OpenDCL 10.1.2.2**. See [verification results](tests/QUALIFICATION.md) for native checks and limits. Physical tool calibration remains open.

## Start here

1. Keep `AUTOSTITCH.lsp`, `AUTOSTITCH.odcl`, `Autostitch.Events.dll` and the `source` folder together. The event bridge uses BricsCAD V22's built-in .NET support; no external package installation is needed.
2. In BricsCAD, use **APPLOAD** to load [AUTOSTITCH.lsp](AUTOSTITCH.lsp), then run **AUTOSTITCH**.
3. Click **Select stitch line**, enter **Pitch** in millimetres, then **Generate stitches**. The starting pitch is 3 mm. New lines reuse the last committed pitch; existing work restores its saved inputs.
4. Edit the original line using normal CAD tools, then **Generate stitches** again. Select a source line, its editing markers or its linked output to reopen the work.

After opening the palette once, its commands are available in other drawings opened during that BricsCAD session.

The release ZIP includes `examples/Autostitch-practical-demo.dwg`: eight editable examples covering landmarks, curves, corners, meeting lines and crossings. Open it, run AUTOSTITCH, and select a source line to try the controls.

Supported source entities are `LINE`, `ARC`, `CIRCLE` and `LWPOLYLINE`, including bulged arc segments. They must lie in **WCS XY at Z=0**, with a positive Z normal. Separate entities can meet or cross without a CAD Join operation. Invalid constructions and overlapping stitch holes are rejected before output is replaced.

Each independent line or connected set is limited to **2,000 openings**. Larger requests fail explicitly; output is never truncated.

Drawing units come from `INSUNITS`; pitch and tool dimensions are always millimetres. A unitless drawing asks whether one drawing unit means a millimetre or an inch. Saved seams retain their unit conversion.

## Connecting stitch lines

Select one line, click **Connect stitch lines**, then select another line or its stitches. One new intersection connects directly. When several intersections need coordination, the tool reports the count and offers **ConnectAll** or Cancel. This includes intersections with the other lines already connected to either selection. Nearby unselected drawing geometry has no effect.

Connected lines share one output block on `AUTOSTITCH`. Corners, crossings and branches coordinate their shared opening. Two lines that simply continue along the same straight line or circle, with the same pitch, become one uninterrupted run; their source boundary does not force a hole. Each source keeps its own pitch, range, direction and landmarks; the physical slit/hole profile must agree. Selecting a member edits that line's inputs, while **Generate stitches** recomputes the whole connected set. A failed operation preserves the previous complete output.

**Disconnect line** removes the selected line's connections and regenerates the resulting independent sets. If a source was deleted, select a surviving line or the old output and use **Remove missing lines**. This repairs the remaining connections without requiring Undo, including when the first selected line was deleted. Generate remains blocked until that explicit repair succeeds.

## Editing a line

- **Select landmark** picks an existing point on the pattern: snap to an endpoint, intersection or other reference point. The two neighbouring stitches retain nominal spacing, centred around that location; there is no hole at the landmark. Use **Re-pick** to choose a replacement point and **Remove** to remove this constraint from the stitch line. The pattern geometry is not changed.
- **Set start / Set end** trim the working range without trimming the source. The labels follow **Reverse direction**, so Set start always changes the displayed start. Enter **Default** at a pick prompt to restore that endpoint; **Reset range** restores the full line.
- For a closed line, your first selection pick sets its start phase. **Set start** changes it; Set end is disabled.
- **Save pitch** saves an input edit separately. **Generate stitches** commits its current pitch and output together. Native **Undo / Redo** can reverse these operations.
- Reopening **AUTOSTITCH** also reloads saved inputs. After switching drawings, select a guide again before generating; a click cannot reuse another drawing's displayed seam.
- If output was moved, rotated or scaled independently, **Restore position** explicitly regenerates it from its sources. It is enabled when that placement conflict is detected.

The original sources remain authoritative and stay outside the stitch blocks. Editing aids are saved, nonplotting blocks on `AUTOSTITCH_UI`: green START, red END, cyan LANDMARK and yellow JOIN. Point picking enables endpoint, midpoint, intersection, centre and node snaps alongside your existing snap choices, then restores your exact previous settings. Markers survive redraws and reopening, and follow ordinary MOVE, STRETCH and ERASE commands with Undo/Redo. Stitches update only when you Generate. Changes made through Properties, automation or another LISP routine refresh markers when the line is selected again.

A picked point is projected onto the nearest position on the stitch guide. Landmark and range picks attach there at a fixed physical distance along the source segment. This records a location, not a live link to the other pattern object: if that object moves independently, re-pick the landmark. Changed polyline topology can require clearing or re-picking them. **Remove** offers **ClearAll** when correspondence is invalid; reset or re-pick affected ranges. For a connection whose attachment changed or disappeared, disconnect the affected line, then connect it again.

Within one drawing, copy all connected source lines and their output together to retain an editable copy. Copying output alone leaves static stitches; a partial source copy cannot edit the originals. Raw source guides must not overlap for a positive length, even when their selected ranges divide that overlap into adjacent pieces. Trim the overlapping source geometry before connecting it.

## Tool assumptions

The current profile uses **1.5 mm slits, 0.5 mm hole diameter and 40° lean**. Tool width, retained-material margin and material-edge clearance are uncalibrated: **Physical clearance unverified** remains visible. Curves and adjusted gaps may require individual tool placement; the output does not guarantee a rigid multi-tooth iron will reproduce the pattern.

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
