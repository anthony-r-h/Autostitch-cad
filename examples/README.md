# Stitch specimen

Open [Autostitch-showcase.dwg](Autostitch-showcase.dwg). Save a copy before experimenting.

Three named views: **ROUND**, **ANGULAR**, **SQUARE**. Use BricsCAD's View Manager to switch. All use a $3\,\mathrm{mm}$ pitch: 54 guides, 30 letters, 32 stitch blocks and 27 independent sources.

![Square stitch specimen](autostitch-square.png)

The square badge uses double-row AUTO outlines, a slanted serif I and a bevelled C. Its circle crosses the S and H at three saved landmarks. Each crossing falls in a reserved nominal gap. The circle is pattern geometry, not another stitch line.

## Inspect

- `SHOWCASE_GUIDES`: editable polylines.
- `AUTOSTITCH_UI`: turn on for IDs, landmarks, junctions and spacing values.
- `SHOWCASE_REFERENCES`: turn on for the U's landmark reference ticks.
- `SHOWCASE_PATTERN`: the badge circle; prints with the stitching.
- `AUTOSTITCH` and `AUTOSTITCH_STITCHES`: generated holes and thread.

The saved drawing hides editing labels. Generate turns them on again.
If you move the circle, remove and re-add its landmarks at the new intersections; landmarks store positions, not live object links.

| Letters | Coverage |
| --- | --- |
| A | Curved crown or pointed corner; two crossbar junctions |
| U | Straight-to-curve transitions or square corners; paired landmarks |
| T | T junction; repeated single-row letters are matched guides within each view |
| O | Closed curved loop or rectangle |
| S | Reversed curvature or alternating square corners |
| I, H | Connected guides with two T junctions |
| C | Open curves or bevel corners |

Adjusted spacing, round holes and dashed virtual slits appear where required. This drawing samples successful layouts; boundary failures, mirrored matches, ownership and Undo remain covered by focused tests in [the catalog](../tests/cases.json).

## Quick check

1. APPLOAD `AUTOSTITCH.lsp` from the repository root.
2. Load `examples/showcase.lsp`.
3. Run **ASTSHOWCASEREGEN**. Expect 27 sources and zero failures on the supplied drawing.
4. Inspect the three views. On a repeated T, **Select source** edits the shared layout; **Unlink guide** makes that T independent.

## Reproduce

In an empty drawing, load the same files and run **ASTSHOWCASEBUILD**. It creates the editable guides, landmark references and stitches. Save as a new DWG. The checked-in DWG also includes named views and hidden editing labels.

Run **ASTSHOWCASEEXPORT**, then from the repository root:

```powershell
./examples/render-showcase.ps1
```

The renderer reads actual generated CAD entities, producing SVG and PNG files for each view. The square PNG is 600 × 600. Build/export reports use `output/native/`; create that folder first in a fresh checkout. The renderer uses Windows .NET, with no added packages.
