# Documentation instructions

## Skeleton and authored files

- Keep outlines and finished writing in separate Markdown files: `<name>_skeleton.md` and `<name>_authored.md`. Do not use frontmatter delimiters or an Authored section to combine them.
- For the pitch, use `PITCH_skeleton.md` and `PITCH_authored.md`.
- Keep the skeleton as concise headings, bullets and notes that capture intent, arguments, examples and open questions. Keep polished prose in the matching `_authored.md` file.
- Embed supporting figures beside the relevant points in the skeleton; keep their production scripts in `examples/illustrated/`.
- Develop the authored prose from the skeleton. Preserve its meaning while turning the outline into readable words.
- Keep the skeleton up to date as the pitch evolves. When an authored edit adds, removes or changes meaning, update the skeleton in the same edit. Wording-only edits need no skeleton change.
- When the skeleton changes, update any affected authored prose to match. Preserve unresolved points as explicit notes rather than inventing answers.
- Preserve the introduction as a bird's-eye view of the stitching problem: design intent, tool geometry, physical execution, manual effort and the motivation for explicit rules. Do not reduce it to a product summary or a CAD justification.
- Put Why CAD after the problem and solution overview, before CAD-specific workflow or implementation.
- Remove self-rebuttal, project status, unfinished-work notes, narration instructions and filler from pitch copy. Keep production notes and evidence status in the illustration README or test catalog.

## Illustrated pitch demos

- Keep illustration guidelines and demo scripts in [examples/illustrated/README.md](../examples/illustrated/README.md). Link to them from the pitch instead of duplicating the production scripts in documentation.
- Use a 600 × 375 px landscape canvas (16:10) for illustrated examples, including every animation frame. Compose and check label readability at 600 px wide.
- Compose examples from independent diagram elements. Use automatically looping GIF/silent WebM animations with SVG masters and PNG still fallbacks, with no playback controls or interactive UI. Generate frames from the elements rather than recording CAD or the screen.
- Use small, direct examples, each showing one geometric problem or decision. Keep comparison inputs identical and make their different placement policies explicit.
- Glossary figures are static SVG/PNG diagrams. Align labels and use horizontal or vertical leaders; keep dimension lines aligned with the measured feature.
- Stitching animations finish by revealing all thread segments together, followed by a two-second hold. Use light slit outlines and heavier thread. Rejected layouts retain their rejection marks; these remain explanatory candidates.
- Record setup, progressive reveal, conflict, response, final state, captions and source case/rule references. Animation is the primary example; keep a final-state still fallback. Keep titles, counters and prose outside the figure.
- Distinguish explanatory reveal order from solver order and physical execution. Show changing positions as planning revisions; keep deliberate failures distinct from valid Autostitch output.
- Follow the glossary, axioms, model and junction construction. Reuse catalog IDs where possible; identify unresolved geometry or native verification explicitly rather than inventing evidence.
- Keep pitch claims and illustration scripts aligned. If an edit changes a demonstrated point, update the affected script and pitch skeleton together, plus authored prose where present.
- Keep text-only planning in text. Do not open or drive CAD, render assets or run native suites for a script-only edit; later native work must follow the repository's CAD ownership rules.
