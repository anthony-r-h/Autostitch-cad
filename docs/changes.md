# Changes

## 2026-11-16: Automatic fitting within Start/End

- Removed the Continuous stitching button, repeated guide pick, WholeGuide/AddStretch/Clear prompts, extra confirmation and `C` markers. Generate fits across curve segments within the existing Start/End extent.
- Removed saved stretch boundaries, their edit-repair requirements and separate matching transforms. Old stretch settings are ignored and removed when inputs are saved. Older output stays visible and is marked stale until Generate succeeds.
- Replaced the fixed 30-degree cutoff with the existing shallow-turn bound derived from pitch, slit length, lean and the permitted corner step. Corners retain their existing construction, fixed neighbours and clearance checks.
- Remove landmark deletes only the selected item. Landmarks on unchanged polyline segments remain valid; unresolved attachments keep their original baseline until repaired.
- Rebuilt the palette. Reload `AUTOSTITCH.lsp` and Generate to apply the new fitting rules.

These changes replace the separate continuous-stretch workflow described in the earlier entries below. Validation passed 2,146 checks across 23 native suites, 70 native event checks and five save/reopen checks. The palette was visually inspected. See [qualification](../tests/QUALIFICATION.md#automatic-fitting-within-startend-2026-11-16).

## 2026-11-16: Protected corners within continuous stitching

- WholeGuide and picked stretches now retain corner holes and their neighbours at turns of 30 degrees or more. Spacing adjusts within the intervening free spans. Smaller intentional corners should remain outside selected stretches.
- Fixed floating-point comparisons that could include a vertex picked exactly as a stretch boundary.
- The reported ST-68 guide now solves with both 90-degree corners retained. Reload `AUTOSTITCH.lsp` and Generate to replace previously generated output.

Validation passed 20 focused geometry checks and 2,143 checks across 23 native suites. The working drawing was inspected read-only. See [qualification](../tests/QUALIFICATION.md#continuous-stitching-corner-protection-2026-11-16).

## 2026-11-16: Continuous polyline stitching

- Added **Continuous stitching...** with WholeGuide, AddStretch and Clear. Selected intermediate vertices no longer force openings or restart spacing. Picked limits select joins and do not create hole constraints; green `C` labels show those limits.
- Direct pitch, spacing allowance, landmarks and clearance remain enforced. Unselected corners and guide connections retain their treatment. Branch neighbours can cross short continuous facets while preserving the half-pitch chord.
- Settings survive removal, regeneration, matching and Undo/Redo. Whole-guide treatment follows edits; ambiguous picked stretches require reselection. Generation remains manual and failed changes preserve valid output.
- Native spline support remains out of scope. The numerical fitter can reject difficult curves without proving that every possible layout is infeasible.

Validation passed 2,138 checks across 23 native suites, 70 native event checks, five save/reopen checks and the scripted selection workflow. The rebuilt palette and an 80-facet curved side were visually checked. See [qualification](../tests/QUALIFICATION.md#continuous-polyline-stitching-2026-11-16).

## 2026-11-16: Remove stitches

- Added **Remove stitches** to the palette. Guides, editing markers, settings, stitch IDs and connections are preserved.
- For connected guides, the button reads **Remove connected stitches** and removes the whole set's generated output, including output retained from earlier connection changes. Individual branch suppression remains outside this action's scope.
- Removing a matched piece's output preserves its matching links and the other pieces' output. Generation recreates the matched family's stitches.
- Removal supports Undo/Redo. Locked layers prevent removal, and a failed removal restores the complete previous output and metadata. Static copies keep their geometry.
- **Generate stitches** recreates removed output. The removal button is disabled when the selected stitch line has no output.

Validation passed 15 targeted checks and 2,111 checks across 20 native suites. The palette was rebuilt and the removal control visually checked. See [qualification](../tests/QUALIFICATION.md#remove-generated-stitches-2026-11-16).

## 2026-11-16: Edit performance and guide layers

- Native edits now use changed objects and saved ownership links to identify affected stitch lines. Editing an unrelated line skips Autostitch guide reads, marker updates and stitch-content scans.
- Connected guides share refresh work. Each affected member is read and refreshed once, junctions are resolved once per set, and unchanged stitch fingerprints are reused.
- Added **Move guides to dedicated layer** to the palette. The action moves the selected stitch line's guides to `AUTOSTITCH_GUIDES`, created as a nonplotting layer. Layer organization is optional; guides remain linked and tracked on any layer.
- Moving guides to the dedicated layer preserves settings, connections and output ownership. Undo restores their original layers. Stitch generation remains manual.
- Rebuilt the palette and event DLL. Save your work and restart BricsCAD after updating so it loads the rebuilt event bridge.

Validation passed 2,096 checks across 19 native suites and 70 event checks. A fixture with 1,000 unrelated lines confirmed zero Autostitch guide reads, marker updates and stitch-content scans for an unrelated MOVE. The new palette control was visually checked. Timings in a user's complex pattern drawing remain unmeasured. See [qualification](../tests/QUALIFICATION.md#targeted-native-edit-updates-2026-11-16) for evidence and validation limits.
