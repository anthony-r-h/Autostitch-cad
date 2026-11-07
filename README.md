# Autostitch for BricsCAD

A BricsCAD tool that turns an editable stitch guide into a contained, regenerable set of openings.

The repository includes a loadable AutoLISP/OpenDCL plugin, exercised in **BricsCAD V22.2 / OpenDCL 10.1.2.2**, including palette picks, Undo/Redo, copying and save/reopen. See [native verification](tests/QUALIFICATION.md). Physical tool calibration remains open.

## Start here

1. Keep `AUTOSTITCH.lsp`, `AUTOSTITCH.odcl` and the `source` folder together. No package installation is needed.
2. In BricsCAD, use **APPLOAD** to load [AUTOSTITCH.lsp](AUTOSTITCH.lsp), then run **AUTOSTITCH**.
3. Click **Select guide**, enter **Pitch** in millimetres, then **Generate**. The starting pitch is 3 mm. New guides reuse the last committed pitch; existing seams restore their saved inputs.
4. Edit the original guide using normal CAD tools, then **Generate** again. You can select either the guide or its linked output to reopen a seam.

Supported source entities are `LINE`, `ARC`, `CIRCLE` and ordered `LWPOLYLINE` guides, including bulged arc segments. They must lie in **WCS XY at Z=0**, with a positive Z normal. Invalid intersections, overlapping openings and unsupported junctions are rejected before output is replaced.

Each seam is limited to **2,000 openings**. Larger requests fail explicitly; output is never truncated.

Drawing units come from `INSUNITS`; pitch and tool dimensions are always millimetres. A unitless drawing asks whether one drawing unit means a millimetre or an inch. Saved seams retain their unit conversion.

## Editing a seam

- **Add landmark** reserves a centred nominal gap at your pick. Select a landmark in the list to **Move** or **Delete** it. Other drawing intersections do not create landmarks.
- **Start / End** trim the working range without trimming the source. Enter **Default** at the pick prompt to restore an endpoint. They follow the source's native direction; **Reverse** changes traversal afterward.
- For a closed guide, your first selection pick sets its start phase. Use **Phase** to change it.
- **Apply pitch** saves an input edit separately. **Generate** commits its current pitch and output together. Native **Undo / Redo** can reverse these operations; a failed Generate retains the previous output.
- **Refresh markers** reloads saved inputs and redraws the transient markers. It discards an uncommitted pitch draft.
- Reopening **AUTOSTITCH** also reloads saved inputs. After switching drawings, select a guide again before generating; a click cannot reuse another drawing's displayed seam.
- If output was moved, rotated or scaled independently, **Restore** explicitly regenerates it at the guide. It is enabled when that placement conflict is detected.

Each seam produces one ordinary block reference on `AUTOSTITCH`. The original guide stays separate. Markers are temporary graphics and may need Refresh after a view redraw.

Landmarks and range picks attach to a primitive at a fixed physical distance. Changed polylines with such attachments can require clearing or re-picking them because stable vertex identities are unavailable. **Delete** offers **ClearAll** when landmark correspondence is invalid; reset or re-pick affected Start/End/Phase values. An edited polyline without these attachments can regenerate normally.

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
