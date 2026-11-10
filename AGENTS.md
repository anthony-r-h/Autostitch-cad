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
| `docs/` | Glossary, axioms, mathematics, junctions, limitations, `PITCH_skeleton.md` outline and `PITCH_authored.md` prose |
| `examples/README.md`, `examples/demo.md` | Example inventory, dependency map and exact reproduction/export commands |
| `examples/demo.lsp`, `examples/{emblem,fills,banner}.lsp` | Native loader and complete artwork recipes |
| `examples/demo-export.lsp`, `examples/render-demos.ps1` | Actual drawing export and SVG/PNG rendering |
| `examples/demos/`, `examples/fills/` | Canonical demo DWGs and current artwork/fill previews |
| `examples/illustrated/` | Pitch storyboards, diagram generators and their SVG/PNG assets |
| `examples/fills.lsp`, `docs/FILLS.md` | Native fill generation and solving; samples in `tests/cases.json` |
| `tests/cases.json` | Canonical test catalog and reusable gallery inputs |
| `tests/` | Executable checks, independent oracle, fixtures and runners |
| `output/` | Ignored local artifacts with explicit lifetimes; see [repository cleanup](docs/REPO-CLEANUP.md) |

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

## Documentation editing

- Change only the requested section and preserve the existing hierarchy unless restructuring is requested.
- Keep writing short, direct and in the existing format. Add detail only when it clarifies meaning or exposes an assumption.
- For outlines and notes, use short bullets with one main idea each. Do not expand notes into finished prose, fill empty sections or append unsolicited explanations.
- Use simple language. Avoid contrastive setups such as "not X, but Y", generic LLM phrasing, filler, canned transitions and inflated claims.
- Name the subject when "this", "that" or similar words could refer to more than one earlier point. State missing evidence or required actions directly.
- Use straight quotation marks and apostrophes. Do not use em dashes or curly punctuation.
- Keep uncertainties, disagreements and missing evidence visible. Do not silently answer unresolved design questions or make sections sound settled for completeness.
- Include literature context only when it supports a model choice, definition, metric or interpretation.

### Skeletons and full drafts

- Treat `<name>_skeleton.md` as an author-facing explanation of the question, comparison choices, findings and limits. Keep agent logs, procedure diaries, file inventories and provenance records elsewhere.
- Include setup detail when it explains a comparison or affects interpretation. Leave out bookkeeping that has no bearing on the question.
- Keep agent instructions in `AGENTS.md` or skills. Include human-facing section intent and open questions in skeletons when they help the author reason.
- Use [draft-full-document](.agents/skills/draft-full-document/SKILL.md) only when explicitly asked for a complete prose draft. Ordinary documentation edits retain the existing format.
- Follow `docs/AGENTS.md` for skeleton/authored file roles. A full draft may expand the outline into prose; it must preserve its input documents and substantive unresolved questions.

### Blog editing style
- For blog edits requested in chat, return only the revised passage in a markdown code block unless explicitly asked for explanation.
- Do not add agreement, apology, praise, alternatives, or commentary unless asked.
- Keep the voice first-person, casual, and journal-like.
- Preserve the original meaning, specificity, and level of enthusiasm.
- Improve flow without adding a tidy lesson, takeaway, joke, punchline, or reader-facing advice.
- Avoid review-site, marketing, sales, or "engagement" language.
- Avoid performative skepticism and self-important framing.
- No curly punctuation - ASCII only
- Do not invent feelings, memories, motivations, intentions, or personal growth.
- Let affection come through in specific details. Avoid generic declarations like "I've always loved" or "I keep coming back to."
- Assume an informed reader. Skip definitions, obvious visual descriptions, and background that the narrative does not need.
- Connect ideas into a narrative. Do not simply turn each requested topic into a separate paragraph.
- Do not impose a lesson, takeaway, inspirational arc, or tidy conclusion.
- Avoid marketing language, exaggerated significance, clever punchlines, and sentences written to sound quotable.
- Preserve the original meaning, specificity, and level of enthusiasm.
- Use ASCII punctuation only.


### Mathematical notation

- Use `$...$` for inline math and `$$...$$` for display equations, including math in tables. Do not use `\(...\)` or `\[...\]`.
- Keep each unit inside one math expression and use upright units, such as $\mathrm{mm}$ and $\mathrm{s}^{-1}$.
- Use `\times`, never `\cdot`, for explicit multiplication, including units: $\mathrm{Pa}\times\mathrm{s}$.
- Distinguish nested brackets with outer square brackets or larger delimiters, such as `\left[...\right]` or `\bigg(...)`. Avoid same-sized nested brackets.
- Use uppercase, upright descriptive superscripts, such as $q^{\mathrm{HAND}}$. Do not add prose explaining that these labels are not exponents.
- Reuse established notation for related quantities. In prose, name the quantity before giving its symbol.
- Introduce symbols with their equations and geometric or physical meaning, grouped by concept. Interpret key equations in plain English; omit trivial rearrangements.
- Use only the repository's notation in symbol tables. Keep source citations without adding source-symbol comparison columns.
- Check delimiters and table structure after edits. Claim rendering is verified only after a visual check.

## Process

1. Identify the narrowest files and functions. State material assumptions.
2. Run the smallest relevant check, then the affected native suites. Use the relevant canonical drawing under `examples/demos/` for routine visual review. Run the full suite when the scope warrants it; see `tests/QUALIFICATION.md` for commands.
3. Report failed commands plainly. Do not invent causes or count historical evidence as a new run.
4. Review documentation for concise, neutral language and consistency with the implementation.
5. Summarize changes, validation, risks and anything unverified.

## Examples and illustrations

- Read the canonical [animation phases and display rules](examples/illustrated/README.md#animation-phases) before planning, creating or editing illustrated scenes. Use Build, Adjustment and Stitch, with optional Finishing touches. Apply the same rules during review and to static final views; keep the detailed rules in that README.
- Keep diagram colours, font and label backgrounds in `examples/illustrated/colors.json`. Scene recipes use named colour roles; the shared renderer resolves the selected theme through every phase.
- Keep artwork recipes, reproduction instructions and current assets under `examples/`. Start with its README; use `demo.lsp` to load native recipes in dependency order.
- Store one canonical DWG per demo under `examples/demos/`; no revision suffixes or abandoned variations. Preserve user working drawings. Use Git for recipe history and `output/native/` for temporary evidence.
- A native demo must regenerate from an empty drawing using committed sources. Record export bounds, dimensions and verification commands in `examples/demo.md`; update the test catalog when a scenario changes.
- Illustrated explanations are embedded, animated figures on a fixed 600 by 750 px (4:5 portrait) canvas, with SVG/PNG still fallbacks. Keep headings and explanatory prose in the surrounding document; do not turn figures into standalone infographics. Keep inputs identical across comparisons and distinguish feasible alternatives from invalid layouts.
- Reuse catalog geometry. Identify whether an illustration is analytic or actual native output; never present a storyboard or arithmetic check as native qualification. Keep source, command and evidence status beside the assets.
- For documentation-only changes, check references and consistency without driving CAD. For diagram changes, check geometry and inspect the rendered result at its intended size.

## Artifact storage and cleanup

- Follow [docs/REPO-CLEANUP.md](docs/REPO-CLEANUP.md) before creating or removing artifacts.
- Put temporary probes, intermediate renders and review captures in a unique `output/scratch/<task-or-build-id>/` folder. Do not add loose files or new top-level output categories.
- Delete successful runs' scratch after validation. Keep failed-run diagnostics or explicitly requested review frames only until they have been investigated.
- The diagram renderer cleans its own scratch on success; use `-KeepScratch` for debugging. `-FrameTimes` also retains scratch for review.
- Reusable sources belong in `source/`, `examples/` or `tests/`; documentation belongs in `docs/`. Never make a committed recipe depend on an ignored scratch file.
- Verify ignore behaviour with `git check-ignore -v -- <path>`: scratch must be ignored and canonical source/assets must not be ignored. Check `git status --short` before staging.
- Use Git for revisions. Keep one canonical asset path; remove obsolete copies and repair their references.
- Preserve other agents' active folders, native drawings, recovery files, backups and cited evidence. Never blanket-delete `output/` or run `git clean -fdx`.

## Native validation

- Only one agent or process may drive BricsCAD at a time.
- Use the existing visible instance and a disposable drawing under `output/native/`.
- Keep one agent-owned test drawing open at a time. Close it after saving and verifying the result; do not accumulate test tabs.
- Check for an active command or point pick before switching drawings or sending input. Never cancel user input to run tests.
- Do not test in, overwrite, close or save a user's working drawing.
- Drawings and recovery files under `output/` may contain user work. They are not disposable merely because Git ignores them.
- A successful script dispatch is not a test pass. Inspect the completion marker and failures in the report.
