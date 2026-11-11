---
name: draft-full-document
description: Expand a settled outline and its breakout source documents into one full prose document. Use only when explicitly invoked for a complete draft, not for ordinary documentation edits.
---

# Draft Full Document

Create the requested full document from the input documents named by the user or
the applicable `AGENTS.md` instructions.

Follow all applicable `AGENTS.md` instructions.

## Autostitch document roles

- Read the root `AGENTS.md` and `docs/AGENTS.md` for documentation rules.
- Use `<name>_skeleton.md` as the outline and `<name>_authored.md` as the
  matching prose output unless the user names another destination. For the
  pitch, these are `docs/PITCH_skeleton.md` and `docs/PITCH_authored.md`.
- Include breakout documents only when the user or outline designates them as
  source sections. An ordinary reference link is not an instruction to insert
  the complete linked document.
- Keep skeletons and other inputs unchanged during a full draft. Report source
  corrections or mismatches outside scope instead of editing those inputs.
- Preserve the distinction between analytic illustrations, native CAD evidence
  and unverified claims. Drafting does not authorize CAD runs or new analysis.

## Source roles

- Use the designated outline document as the document structure and statement
  of intent.
- Treat each other input document as a breakout section of the outline. Place
  its content at the corresponding outline heading and preserve its internal
  heading hierarchy.
- Treat drafting-status sections and section-intent callouts as drafting
  guidance. Do not reproduce them as sections or callouts in the finished
  document.
- Preserve the complete section order established by the outline, including the
  placement of breakout sections.

## Writing requirements

- Put clarity first. When editorial goals compete, choose the clearest accurate
  formulation that preserves the source meaning.
- State supported claims directly. Do not hedge them with vague qualifiers or
  repeatedly soften them after making the point.
- Do not argue against the document's own claims by inventing objections,
  anticipating hypothetical critics, or adding defensive disclaimers. Explain
  substantive tradeoffs where they belong in the argument.
- Avoid pedantic detours and unnecessary distinctions. Include qualifications
  when they change the meaning, scope or interpretation of a claim.
- Convert point-form material into connected prose.
- Let sentences build on one another, making the relationships between ideas
  clear where needed. Use paragraph structure that suits the material.
- Preserve the existing argument, heading order, and hierarchy.
- Use paragraphs of varied length. Do not mechanically create one paragraph
  for every bullet.
- Write with a natural prose cadence. Combine source bullets when their causal,
  comparative, sequential, or qualifying relationship is clearer in one
  sentence, and vary sentence length according to the idea being expressed.
- Do not translate source bullets one-for-one into short declarative sentences.
  Use short sentences for emphasis or clarity, not as the default cadence.
  "Direct" means removing filler and imprecision, not shortening every thought.
- Keep the document direct, technical, and readable in plain language.
- Explain why a construction or calculation is needed before describing its
  steps. Introduce physical meaning, intuition and context before equations.
- After key equations, explain what the result means for the subject rather
  than simply reading the symbols back in words.
- Define symbols where they first appear.
- Preserve equations, units, figures, links, citations, numerical values, and
  tables unless a source correction is explicitly requested.
- State substantive uncertainty and unresolved choices directly and specifically.
- Do not invent evidence, citations, simulation results, causal explanations,
  or design conclusions.
- Make relationships supported by the sources explicit, including those
  spread across several bullets. If the sources leave a gap in the reasoning,
  keep it visible rather than supplying an unsupported explanation.
- Do not perform new research or analysis.
- Do not add generic introductions, summaries, transitions, or conclusions
  merely to make sections appear complete.
- Present the document on its own terms. Do not compare it with earlier drafts,
  previous versions, or the source format unless that comparison is part of the
  subject matter.
- Exclude authoring and process bookkeeping, including drafting notes,
  reminders, TODOs, and statements about what the document will do later.
  Preserve substantive open questions, limitations, and proposed tests when
  they are part of the subject matter.
- In analytical sections, explain the meaning, relationships, tradeoffs, and
  implications supported by the sources. Use numbers as evidence rather than
  narrating tables or repeating results without interpretation.
- Do not extend the analysis beyond interpretations supported by the input
  documents.
- Follow the repository rules for punctuation, notation, tense, and style.

## Avoid LLM prose patterns

- Use straight quotation marks and apostrophes. Do not use curly punctuation or
  em dashes.
- State the point directly. Avoid negative contrast setups such as "not X, but
  Y," "not only X," and "more than just X."
- Remove throat-clearing and canned signposting such as "it is important to
  note," "this highlights," and "it is worth considering."
- Match emphasis to the evidence. Avoid inflated claims of importance,
  novelty, scale, or consequence when the sources do not establish them.
- Prefer the specific claim and its support over labels such as "crucial,"
  "vital," "profound," "transformative," or "landmark."
- Remove repeated summaries and conclusions that restate nearby material
  without advancing the argument.

## Whole-document editorial review

- After drafting and the source and formatting checks, read the complete
  document from beginning to end as a reader would. Review the actual prose,
  not just the heading map, excerpts or diff.
- Check whether the prose develops the ideas clearly, whether explanations
  give enough reasoning, and whether technical passages need more room.
- Remove habitual hedging, self-rebuttal and pedantic asides; retain limitations
  that materially affect the argument.
- Check that each section follows from what precedes it and prepares the ideas
  needed by later sections.
- Integrate breakout sections with the surrounding document. Check both the
  entry into each breakout section and the return to the outline that follows.
- Keep terminology, symbols, assumptions, tense, and voice consistent across
  source boundaries.
- Introduce concepts before they are used and keep cross-references accurate.
- Remove unintended repetition and surface contradictions. Do not add filler
  transitions merely to join sections.
- Revise passages that interrupt the argument or leave connections unclear,
  then read the revisions in context with the surrounding text.

## Conflicts and gaps

Use this priority when sources overlap:

1. `AGENTS.md` for rules and style
2. The outline document for document purpose and organization
3. Breakout documents for the content and detail of their corresponding
   sections

Do not silently reconcile substantive contradictions. If a conflict prevents
accurate prose, stop and ask one focused question.

If an unresolved matter does not block drafting, keep it visible in the prose.

## File safety

- Do not edit any input document.
- Create the requested output document if it does not exist.
- If it already exists, inspect its diff before changing it.
- Do not replace user-written changes unless the user explicitly requests
  regeneration.

## Workflow

1. Read all input documents completely.
2. Build the combined heading map and identify how the sections depend on and
   support one another.
3. Draft the document section by section in the order established by the
   outline.
4. Verify factual and mathematical fidelity against the sources.
5. Perform the LLM prose-pattern review.
6. Validate formatting.
7. Read the complete document and perform the whole-document editorial review
   before reporting completion. Recheck facts or formatting affected by edits
   made during that review.

## Validation

Run `git diff --check` against the output document. Scan the output for em
dashes and curly quotation marks or apostrophes, for example with `rg`.

Also verify that:

- every substantive source section is represented;
- equations and technical definitions retain their meaning;
- numbers and table values match their source documents;
- figure paths and links still resolve relative to the output document;
- no new claims or citations were introduced.

Report what was drafted, validation results, unresolved issues, and anything
left unverified.
