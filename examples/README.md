# Stitch specimen

Open [Autostitch-showcase.dwg](Autostitch-showcase.dwg). Save a copy before experimenting.

Three named views: **ROUND**, **ANGULAR**, **SQUARE**. Use BricsCAD's View Manager to switch. All use a $3\,\mathrm{mm}$ pitch: 53 guides, 30 letters, 34 stitch blocks and 30 independent sources.

![Square stitch specimen](autostitch-square.png)

The square emblem pairs arched AUTO outlines with script Stitch inside two complete circular stitch rows. The i has one separate $3\,\mathrm{mm}$ round punch. There is no underline. [Unstitched artwork](autostitch-artwork.png) is retained for comparison.

Top and bottom registration ticks align the circular badge with its backing. Each tick crosses both border rows; both rows reserve a nominal gap at that reference. The two references create four saved landmarks.

## Inspect

- `SHOWCASE_GUIDES`: editable polylines.
- `AUTOSTITCH_UI`: turn on for IDs, landmarks, junctions and spacing values.
- `SHOWCASE_REFERENCES`: nonprinting reference ticks for the banner U landmarks.
- `SHOWCASE_REGISTRATION`: printed top/bottom alignment ticks for both circular rows.
- `SHOWCASE_PATTERN`: the single round punch used for the i's dot.
- `AUTOSTITCH` and `AUTOSTITCH_STITCHES`: generated holes and thread.

The saved drawing hides editing labels. Generate turns them on again.
Landmarks store guide positions, not live links to reference objects.

| Letters | Coverage |
| --- | --- |
| A | Curved crown or pointed corner; two crossbar junctions |
| U | Straight-to-curve transitions or square corners; paired landmarks |
| T | T junction; repeated letters are matched guides in the two banners |
| O | Closed curved loop or rectangle |
| S | Reversed curvature or alternating square corners |
| I, H | Connected guides with two T junctions |
| C | Open curves or bevel corners |
| Script t / h | Connected crossbars and a sloping shoulder; tangent curve transitions |
| Double frame | Two closed circles; four registration landmarks; clearance between separate rows |

Adjusted spacing, round holes and dashed virtual slits appear where required. This drawing samples successful layouts; boundary failures, mirrored matches, ownership and Undo remain covered by focused tests in [the catalog](../tests/cases.json).

## Quick check

1. APPLOAD `AUTOSTITCH.lsp` from the repository root.
2. Load `examples/showcase.lsp`.
3. Run **ASTSHOWCASEREGEN**. Expect 30 sources and zero failures on the supplied drawing.
4. Inspect the three views. On a repeated T, **Select source** edits the shared layout; **Unlink guide** makes that T independent.

## Artwork first

In a new empty drawing, load the plugin and `showcase.lsp`, then run **ASTSHOWCASEART**. It creates the square artwork without fitting stitches. Review the guides, then **ASTSHOWCASEREGEN** fits those exact guides. **ASTSHOWCASEARTEXPORT** writes `output/native/showcase-art.jsonl` for rendering the guide proof.

## Reproduce

In an empty drawing, load the same files and run **ASTSHOWCASEBUILD**. It creates the editable guides, landmark references and stitches. Save as a new DWG. The checked-in DWG also includes named views and hidden editing labels.

Run **ASTSHOWCASEEXPORT**, then from the repository root:

```powershell
./examples/render-showcase.ps1
```

The renderer reads actual generated CAD entities, producing SVG and PNG files for each view. The square PNG is 600 × 600. Build/export reports use `output/native/`; create that folder first in a fresh checkout. The renderer uses Windows .NET, with no added packages.
