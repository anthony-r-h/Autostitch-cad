# Documentation instructions

## PITCH.md

- The frontmatter between the opening `---` delimiters is the skeleton: the raw meaning and outline of the pitch.
- Keep the skeleton as concise headings, bullets and notes that capture intent, arguments, examples and open questions. Keep polished prose in the `# Authored` section.
- Develop the authored prose from the skeleton. Preserve its meaning while turning the outline into readable words.
- Keep the skeleton up to date as the pitch evolves. When an authored edit adds, removes or changes meaning, update the skeleton in the same edit. Wording-only edits need no skeleton change.
- When the skeleton changes, update any affected authored prose to match. Preserve unresolved points as explicit notes rather than inventing answers.
- Position the pitch around bringing specialized tools into industry-standard, enterprise CAD. Identify BricsCAD as the current implementation when relevant; describe additional ports as planned.

## Illustrated pitch demos

- Keep illustration guidelines and demo scripts in [examples/illustrated/README.md](../examples/illustrated/README.md). Link to them from the pitch instead of duplicating the production scripts in documentation.
- Use a 600 × 375 px landscape canvas (16:10) for illustrated examples, including every animation frame. Compose and check label readability at 600 px wide.
- Compose examples from independent diagram elements. Use automatically looping GIF/silent WebM animations with SVG masters and PNG still fallbacks, with no playback controls or interactive UI. Generate frames from the elements rather than recording CAD or the screen.
- Use small, direct examples, each showing one geometric problem or decision. Keep comparison inputs identical and make their different placement policies explicit.
- Record setup, progressive reveal, conflict, response, final state, captions and source case/rule references. Animation is the primary example; keep a final-state still fallback. Keep titles, counters and prose outside the figure.
- Distinguish explanatory reveal order from solver order and physical execution. Show changing positions as planning revisions; keep deliberate failures distinct from valid Autostitch output.
- Follow the glossary, axioms, model and junction construction. Reuse catalog IDs where possible; identify unresolved geometry or native verification explicitly rather than inventing evidence.
- Keep pitch claims and illustration scripts aligned. If an edit changes a demonstrated point, update the affected script and pitch skeleton together, plus authored prose where present.
- Keep text-only planning in text. Do not open or drive CAD, render assets or run native suites for a script-only edit; later native work must follow the repository's CAD ownership rules.
