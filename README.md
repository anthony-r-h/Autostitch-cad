# Leather stitch lines for BricsCAD

This package is the geometry investigation and implementation handoff for a BricsCAD stitching plugin.

The user workflow is:

1. Draw the stitch guide in CAD.
2. Select it in the stitch tool.
3. Use the tool to mark Start, End, Landmarks and Intersections on that guide with visible symbols.
4. Choose pitch in the tool.
5. Generate the slit lines, round holes and correction marks.
6. Keep each seam's generated result contained in one block on AUTOSTITCH.

The original guide remains an editable input. Reopening the tool restores its annotations and pitch. Generate replaces that seam's output rather than adding duplicate holes. Imprints on other pattern pieces retain correspondence to the successfully generated master.

**The HTML viewer is only an inspection tool. No BricsCAD plugin is included yet.**

## Start here

| File | What it contains |
| --- | --- |
| [STITCH_MODEL.md](STITCH_MODEL.md) | Parameters, concise axioms, direct formulas, corner construction, correction rules, all 22 examples, and unresolved geometry. |
| [BRICSCAD_PLAN.md](BRICSCAD_PLAN.md) | Extension choices, supported input scope, block and metadata design, CAD workflow, copies/mirroring/imprints, implementation order, and official API references. |
| [geometry.mjs](geometry.mjs) | The current independent geometry calculations. |
| [case-suite.mjs](case-suite.mjs) | Fixed examples and their ordered construction. This is not yet a general CAD route planner. |
| [test-core.mjs](test-core.mjs) | Numerical and geometric regressions for the chosen rules. |
| [results.json](results.json) | Full saved outcomes and checks at the four pitches. |
| [stitch-geometry-lab.html](stitch-geometry-lab.html) | Offline drawings for inspecting the consequences of the rules. |

Read the model before treating an exact test result as an approved physical construction. A03/A04 are exploratory curved-junction alternatives. A05 has free outer ends. The real centre distances beside a round corner hole are distinct from ordinary slit pitch.

The recommended output container is an ordinary block per seam on AUTOSTITCH, linked to the user-drawn guide, its annotations and selected pitch. The extension language depends on the actual BricsCAD installation and existing extension. The plan distinguishes these recommendations from requirements already established by the user.

## Handoff to Codex

Use this task with the package and the existing CAD extension project:

> Build the BricsCAD stitch-line tool described in STITCH_MODEL.md and BRICSCAD_PLAN.md. Follow the target repository's instructions. First identify the installed BricsCAD version, edition and OS, and inspect the existing extension rather than assuming its technology.
>
> Keep the geometry core independent of CAD. Preserve the direct fitting rules, finite-slit corner construction, centred nominal landmark gaps, correction limits, construction order and explicit failures. Do not turn numerical test-oracle searches into production solvers.
>
> The input workflow is mandatory: the user draws the guide, selects it in the tool, uses the tool to place visible Start/End/Landmark/Intersection annotations, chooses pitch, and generates one contained stitch result on AUTOSTITCH. The guide remains an editable CAD input. The first usable build should complete this flow for a straight guide with Start/End markers, restore the inputs after reopening, replace output on Generate, and support predictable Undo. Then add Landmark and Intersection annotation actions with the admitted line/arc rules and closure. General route assembly, CAD persistence and imprint lineage still need implementation.
>
> Do not treat the HTML UI as the product or spend effort extending it unless a specific geometric question needs a new example. Do not silently resolve the open corner, curve or mirror questions by changing the rules. Use the supplied examples as regression evidence and verify actual CAD operations in the target host.

If host information or extension files are missing, identify precisely what is needed. The plan can be read and the independent core worked on before those details are available; a compatible CAD binary cannot be promised without them.

## Run the geometry checks

Node.js 18 or later. No package installation is required.

```bash
node run-tests.mjs
```

This writes results.json. The current reference snapshot contains 30 core tests, 22 reference examples at 3 mm, and 1,637 checks across 88 runs. The other pitches use the same drawing dimensions, so an example may correctly change from valid to invalid.

Changing a rule requires updating the reasoning and the expected results deliberately. Do not change an expectation merely to make a failed check pass.

## Inspect or rebuild the viewer

Open stitch-geometry-lab.html, choose pitch and example, and inspect the drawing. Drawing options and measurements start collapsed. Saved drawings remain available if the file preview does not run the interactive controls.

After a model change:

```bash
node run-tests.mjs
node build.mjs
node test-viewer.mjs
```

The viewer checks cover saved HTML, interactive control logic and startup recovery. They are not a full browser rendering test or BricsCAD validation.

An optional local server can be started from this folder with `python3 -m http.server 8000`, or `py -m http.server 8000` on Windows. Open http://localhost:8000/stitch-geometry-lab.html.

The remaining files support that inspection tool: render-svg.mjs, render-static.mjs, presentation.mjs, viewer-template.html, viewer.js, build.mjs and test-viewer.mjs. They do not need to be ported to CAD.
