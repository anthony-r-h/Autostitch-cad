# Autostitch

Autostitch is a BricsCAD V22 / OpenDCL plugin for laying out stitch openings on leatherwork pattern guides. It is implemented in AutoLISP, with an OpenDCL palette and a small C# bridge for native CAD editing events.

The intent is to turn a drawn seam path into discrete, oriented openings that account for pricking-iron pitch, endpoints, corners, junctions and landmarks. The fitting model keeps nominal gaps where possible and identifies adjusted gaps where the constraints require them.

Source guides and their saved settings define the stitching. Generated openings, thread display and annotations are replaceable drawing output. Guides remain editable with native CAD tools; regeneration is explicit. Connected guides form one stitch line, and matched guides on other pattern pieces receive the source layout.

Choose **Obverse** or **Reverse** under **Stitch lean** in the palette, then use **Generate stitches**. The choice applies to every guide in a connected stitch line; matched copies inherit it from their source. **Face** selects the material face shown, and **Reverse travel** changes guide traversal. Existing drawings default to obverse. Older connected output is marked for regeneration to apply the half-pitch junction rule; its geometry remains intact until generation succeeds.

The current runtime requires Windows, BricsCAD V22 with .NET support and OpenDCL 10.1.2.2. Supported geometry and unresolved rules are documented in [Limits](docs/LIMITS.md).

## Code and runtime files

| Path | Purpose |
| --- | --- |
| [AUTOSTITCH.lsp](AUTOSTITCH.lsp) | Loader and command registration. |
| [source/autostitch-geometry.lsp](source/autostitch-geometry.lsp) | Single-guide geometry and pitch fitting, without drawing writes. |
| [source/autostitch-network.lsp](source/autostitch-network.lsp) | Connected guides, shared openings and clearance. |
| [source/autostitch-match-geometry.lsp](source/autostitch-match-geometry.lsp) | Exact guide matching and rigid or reflected layout transfer. |
| [source/autostitch-matching.lsp](source/autostitch-matching.lsp) | Matched-guide relationships and generation of the source and its copies together. |
| [source/autostitch-cad.lsp](source/autostitch-cad.lsp) | Drawing metadata, output blocks, units and undoable transactions. |
| [source/autostitch-markers.lsp](source/autostitch-markers.lsp) | Editing markers and synchronization with native edits. |
| [source/autostitch-ui.lsp](source/autostitch-ui.lsp) | Palette state, picking and user messages. |
| [source/AUTOSTITCH.odcl.json](source/AUTOSTITCH.odcl.json), [source/Autostitch.Events.cs](source/Autostitch.Events.cs) | Editable palette definition and native command-event bridge. |
| [AUTOSTITCH.odcl](AUTOSTITCH.odcl), [Autostitch.Events.dll](Autostitch.Events.dll) | Built runtime assets; rebuilt by [build-plugin.ps1](build-plugin.ps1). |
| [source/install-ribbon.ps1](source/install-ribbon.ps1), [AUTOSTITCH.bmp](AUTOSTITCH.bmp) | Ribbon launcher installation and icon. |
| [package.ps1](package.ps1) | Packages a clean Git revision into `output/release/Autostitch-V22.zip`. |

## Documentation

| Path | Contents |
| --- | --- |
| [docs/GLOSSARY.md](docs/GLOSSARY.md) | Domain terms used throughout the project. |
| [docs/AXIOMS.md](docs/AXIOMS.md) | Geometric requirements and their motivation. |
| [docs/MODEL.md](docs/MODEL.md) | Fitting mathematics and implementation choices. |
| [docs/JUNCTIONS.md](docs/JUNCTIONS.md) | Corner and junction construction. |
| [docs/LIMITS.md](docs/LIMITS.md) | Geometric limits, unresolved rules and runtime dependencies. |
| [docs/FILLS.md](docs/FILLS.md) | Fill generation and solving. |
| [docs/REPO-CLEANUP.md](docs/REPO-CLEANUP.md) | Artifact locations, build cleanup and retention rules. |
| [docs/WHY-THIS-EXISTS.md](docs/WHY-THIS-EXISTS.md) | Broader problem statement and project rationale. |
| [docs/PITCH_skeleton.md](docs/PITCH_skeleton.md), [docs/PITCH_authored.md](docs/PITCH_authored.md) | Long-form explanation outline and prose. |

## Examples and tests

- [examples/README.md](examples/README.md) maps the example sources and their dependencies. [examples/demo.md](examples/demo.md) records drawing status and reproduction/export commands.
- `examples/demos/` contains the canonical demo drawings and artwork previews; `examples/fills/` contains fill previews. The native recipes and export scripts are in `examples/`.
- [examples/illustrated/](examples/illustrated/README.md) contains explanatory diagrams, storyboards, generators and rendered assets.
- [tests/cases.json](tests/cases.json) is the canonical test catalog and source of reusable example geometry. `tests/` contains executable checks, an independent fitting oracle, fixtures and runners.
- [tests/QUALIFICATION.md](tests/QUALIFICATION.md) documents validation commands and evidence requirements; [tests/AXIOM_AUDIT.md](tests/AXIOM_AUDIT.md) maps axiom coverage.
- `output/` holds ignored local artifacts: disposable build scratch, native test evidence, recovery files, backups and releases. Follow the [cleanup rules](docs/REPO-CLEANUP.md); diagram builds remove their scratch on success.

Repository working instructions are in [AGENTS.md](AGENTS.md).
