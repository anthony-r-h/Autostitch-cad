# Repository guide

Autostitch is a BricsCAD V22 / OpenDCL plugin. The source drawing guides are authoritative; generated stitching is replaceable output.

## Structure

| Path | Purpose |
| --- | --- |
| `AUTOSTITCH.lsp` | Loader and command registration |
| `source/autostitch-geometry.lsp` | Single-route geometry and pitch fitting; no drawing writes |
| `source/autostitch-network.lsp` | Connections, shared openings and clearance |
| `source/autostitch-cad.lsp` | DWG metadata, blocks, units and undoable transactions |
| `source/autostitch-markers.lsp` | Editing markers and native-edit synchronization |
| `source/autostitch-ui.lsp` | Palette state, picking and user messages |
| `source/AUTOSTITCH.odcl.json` | Editable palette definition |
| `source/Autostitch.Events.cs` | Small native command-event bridge |
| `AUTOSTITCH.odcl`, `Autostitch.Events.dll` | Distributed runtime assets; rebuild with `build-plugin.ps1` |
| `package.ps1` | Package a clean Git revision into `output/release/Autostitch-V22.zip` |
| `docs/` | Axioms, mathematics, junctions, limitations and README outline |
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
- Put uncertainties and unsupported behavior in `docs/LIMITS.md`; link there instead of repeating them.
- Update `tests/cases.json` when adding or changing a test scenario. Keep existing IDs stable.

## Process

1. Identify the narrowest files and functions. State material assumptions.
2. Run the smallest relevant check, then the affected native suites. Use `tests/QUALIFICATION.md` for commands.
3. Report failed commands plainly. Do not invent causes or count historical evidence as a new run.
4. Review documentation for concise, neutral language and consistency with the implementation.
5. Summarize changes, validation, risks and anything unverified.

## Native validation

- Only one agent or process may drive BricsCAD at a time.
- Use the existing visible instance and a disposable drawing under `output/native/`.
- Check for an active command or point pick before switching drawings or sending input. Never cancel user input to run tests.
- Do not test in, overwrite, close or save a user's working drawing.
- Drawings and recovery files under `output/` may contain user work. They are not disposable merely because Git ignores them.
- A successful script dispatch is not a test pass. Inspect the completion marker and failures in the report.
