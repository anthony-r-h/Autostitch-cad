# Repository cleanup

`output/` holds local working artifacts. Nothing needed to reproduce the plugin or published examples may exist only there.

## Where files belong

| Files | Location | Retention |
| --- | --- | --- |
| Plugin sources and shipped runtime assets | Root and `source/` | Commit together |
| Documentation and design notes | `docs/` | Commit when ready |
| Example recipes, source photos, canonical DWGs and published figures | `examples/` | Commit sources and current outputs together; use Git for revisions |
| Test code and reusable cases | `tests/` | Commit |
| Render intermediates, review frames and temporary probes | `output/scratch/<task-or-build-id>/` | Delete after successful validation; retain failed runs or explicitly requested diagnostics |
| Native test drawings, exports and reports | `output/native/` | Keep drawings and referenced evidence; remove only known disposable files from your own run |
| Recovered drawings and preserved snapshots | `output/recovery/` | Never bulk-delete |
| Ribbon configuration backups | `output/ribbon-backups/` | Keep for rollback |
| Packaged releases | `output/release/` | Keep the current package |

## Unifying illustrated examples

Target layout for the example cleanup:

- Use `examples/illustrated/<group>/scenes.mjs` for each related example or comparison group, with its current exports in `assets/` and reproduction notes in `README.md`. Keep comparison variants together.
- Split the scene recipes out of the oversized `examples/illustrated/scenes.mjs` by subject. Keep any central entry point limited to selecting and assembling groups.
- Put reusable geometry, annotation, display and export helpers in small shared modules organized by responsibility. Shared helpers must not depend on individual scene recipes.
- Scene recipes define their geometry, comparison choices and animation sequence. They use the common renderer and shared settings for colours, typography, label backgrounds, fading and canvas conventions; do not copy those settings into each recipe.
- Keep animation behaviour aligned with the canonical [phase rules](../examples/illustrated/README.md#animation-phases): Build, Adjustment, Stitch and optional Finishing touches. Preserve phase boundaries and display rules when splitting or moving scene recipes.
- Keep colours and typography in `examples/illustrated/colors.json` and scenario inputs in `tests/cases.json`. Keep example-specific timing and camera choices explicit; related comparisons share one set of inputs and settings.
- Use the same build and validation workflow for every group. When moving recipes or assets, preserve catalog IDs, update imports and document links, check the rendered result and remove superseded copies.

## Diagram builds

- The shared renderer creates a unique folder under `output/scratch/` for each build. Concurrent builds do not share intermediates.
- Successful export checks remove that folder. Finished SVG/PNG/GIF files remain at the requested output destination in `examples/`.
- Generate and retain PNG/SVG exports only when used as published figures, still fallbacks or editable masters. For animation-only examples, set `exportStills: false` in the recipe and catalog, remove unused static exports and update their references and checks. Keep temporary review frames in scratch and delete them after review.
- A failed build retains its scratch folder and prints the path. Retention does not mean the published files passed validation.
- Use `-KeepScratch` to retain intermediates for debugging. `-FrameTimes` also retains scratch because its review frames were explicitly requested.
- Run the figure's documented validation command and inspect the result. If a later check fails, rebuild with `-KeepScratch` to investigate.
- Delete retained scratch after review. Keep useful recipes in `examples/` and reusable checks in `tests/` before deleting their temporary drafts.

```powershell
./examples/illustrated/build.ps1 -KeepScratch
node tests/validate-illustrated.mjs
```

Check the renderer's cleanup and failure handling with `./tests/validate-diagram-build.ps1`. It uses a tiny fixture and removes its own test files on success.

## Before creating an artifact

1. Choose its purpose and destination from the table. Do not create loose files or new categories directly under `output/`.
2. Check ignore behaviour with `git check-ignore -v -- <path>`. Scratch must be ignored; source and published assets must be visible to Git.
3. Use a unique scratch folder for your task. Do not reuse another agent's folder or overwrite its diagnostics.
4. Keep one canonical published filename. Rebuild it from source; use Git rather than revision suffixes or copied folders.

## Cleaning up

- Inspect `git status --short` and file contents first. Untracked files are not necessarily junk.
- Remove your successful run's intermediates. Check the resolved path stays inside its intended scratch directory before recursive deletion; do not follow filesystem links.
- Preserve active builds, user drawings, recovery files, backups and reports cited as evidence. An ignored path is not permission to delete its contents.
- Delete crash dumps and obsolete conflict copies. `.gitignore` excludes them; adding an ignore rule does not untrack an existing file.
- Do not run a blanket `git clean -fdx` or delete all of `output/`.
- Before committing cleanup, check local document links and the affected validators. Stage only your own changes.
