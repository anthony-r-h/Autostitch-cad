# Repository guide

Autostitch is a BricsCAD V22 / OpenDCL plugin. The source drawing guides are authoritative; generated stitching is replaceable output.

## Structure

| Path | Purpose |
| --- | --- |
| `AUTOSTITCH.lsp` | Loader and command registration |
| `source/autostitch-geometry.lsp` | Single-route geometry and pitch fitting; no drawing writes |
| `source/autostitch-network.lsp` | Connections, shared openings and clearance |
| `source/autostitch-match-geometry.lsp` | Exact guide matching and rigid/reflected layout transfer |
| `source/autostitch-matching.lsp` | Matched guides and atomic family generation |
| `source/autostitch-cad.lsp` | DWG metadata, blocks, units and undoable transactions |
| `source/autostitch-markers.lsp` | Editing markers and native-edit synchronization |
| `source/autostitch-ui.lsp` | Palette state, picking and user messages |
| `source/AUTOSTITCH.odcl.json` | Editable palette definition |
| `source/Autostitch.Events.cs` | Small native command-event bridge |
| `source/install-ribbon.ps1`, `AUTOSTITCH.bmp` | Home / Annotations launcher and icon |
| `AUTOSTITCH.odcl`, `Autostitch.Events.dll` | Distributed runtime assets; rebuild with `build-plugin.ps1` |
| `package.ps1` | Package a clean Git revision into `output/release/Autostitch-V22.zip` |
| `docs/` | Glossary, axioms, mathematics, junctions, limitations and pitch outline |
| `examples/README.md`, `examples/demo.md` | Example inventory, dependency map and exact reproduction/export commands |
| `examples/demo.lsp`, `examples/{emblem,fills,banner}.lsp` | Native loader and complete artwork recipes |
| `examples/demo-export.lsp`, `examples/render-demos.ps1` | Actual drawing export and SVG/PNG rendering |
| `examples/demos/`, `examples/fills/` | Canonical demo DWGs and current artwork/fill previews |
| `examples/illustrated/` | Pitch storyboards, diagram generators and their SVG/PNG assets |
| `examples/fills.lsp`, `docs/FILLS.md` | Native fill generation and solving; samples in `tests/cases.json` |
| `tests/cases.json` | Canonical test catalog and reusable gallery inputs |
| `tests/` | Executable checks, independent oracle, fixtures and runners |
| `output/` | Ignored generated evidence, local drawings and release packages |

## Working defaults

- Make the smallest change that solves the task. Prefer existing code and local naming.
- No new dependencies or broad refactors without a concrete need or explicit request.
- Before installing an npm package, audit its exact version for known CVEs. Install only a clean version and pin it.
- Keep functions focused and explicit. Comment intent where the code cannot explain it.
- Preserve drawing ownership, rollback and Undo/Redo behavior. Never replace valid output with a partial solution.
- Keep technical diagnostics in code; user messages must explain the problem and a useful next action.
- Keep axioms geometric. Put solution choices in `docs/MODEL.md`, application workflow in `README.md`, and geometric limits in `docs/LIMITS.md`.
- Define domain terms in `docs/GLOSSARY.md`; use those meanings consistently instead of introducing synonyms.
- Use "nominal gap" and "adjusted gap" in documentation. Introduce protection under gaps and arms under junctions; avoid separate names for the same concept.
- Write mathematical notation in LaTeX. Keep code identifiers and commands as code.
- Update `tests/cases.json` when adding or changing a test scenario. Keep existing IDs stable.

## Process

1. Identify the narrowest files and functions. State material assumptions.
2. Run the smallest relevant check, then the affected native suites. Use the relevant canonical drawing under `examples/demos/` for routine visual review. Run the full suite when the scope warrants it; see `tests/QUALIFICATION.md` for commands.
3. Report failed commands plainly. Do not invent causes or count historical evidence as a new run.
4. Review documentation for concise, neutral language and consistency with the implementation.
5. Summarize changes, validation, risks and anything unverified.

## Examples and illustrations

- Keep artwork recipes, reproduction instructions and current assets under `examples/`. Start with its README; use `demo.lsp` to load native recipes in dependency order.
- Store one canonical DWG per demo under `examples/demos/`; no revision suffixes or abandoned variations. Preserve user working drawings. Use Git for recipe history and `output/native/` for temporary evidence.
- A native demo must regenerate from an empty drawing using committed sources. Record export bounds, dimensions and verification commands in `examples/demo.md`; update the test catalog when a scenario changes.
- Illustrated explanations use a fixed 600 by 375 px canvas, SVG masters and PNG stills. Prove the static composition before optional animation. Keep inputs identical across comparisons and distinguish feasible alternatives from invalid layouts.
- Reuse catalog geometry. Identify whether an illustration is analytic or actual native output; never present a storyboard or arithmetic check as native qualification. Keep source, command and evidence status beside the assets.
- For documentation-only changes, check references and consistency without driving CAD. For diagram changes, check geometry and inspect the rendered result at its intended size.

## Native validation

- Only one agent or process may drive BricsCAD at a time.
- Use the existing visible instance and a disposable drawing under `output/native/`.
- Keep one agent-owned test drawing open at a time. Close it after saving and verifying the result; do not accumulate test tabs.
- Check for an active command or point pick before switching drawings or sending input. Never cancel user input to run tests.
- Do not test in, overwrite, close or save a user's working drawing.
- Drawings and recovery files under `output/` may contain user work. They are not disposable merely because Git ignores them.
- A successful script dispatch is not a test pass. Inspect the completion marker and failures in the report.
