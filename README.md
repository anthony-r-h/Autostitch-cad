# Autostitch: design review and implementation plan

A BricsCAD tool that turns an editable stitch guide into a contained, regenerable set of openings.

**Status:** the repository contains a working geometry laboratory, not a CAD plugin. The documents below specify the next version. Existing JavaScript, saved results and gallery still implement the original rules; they have not been silently updated to the new decisions.

## Read in this order

| Document | Decision it owns |
| --- | --- |
| [STITCH_MODEL.md](STITCH_MODEL.md) | Parameters, features, fitting, junction construction, supported geometry and failure meanings. |
| [PHYSICAL_RULES.md](PHYSICAL_RULES.md) | Correction preferences, symmetry, real chisel limits, clearance and physical calibration. |
| [BRICSCAD_PLAN.md](BRICSCAD_PLAN.md) | Concrete V22/OpenDCL implementation, UI, editing, persistence and delivery gates. |
| [REVIEW.md](REVIEW.md) | Findings, challenged decisions, evidence and what remains unverified. |

## Decisions that change the old plan

- Keep the direct straight/chord fits. Centre corrections within each free span; prefer exact symmetry when it costs no additional changed gaps.
- Validate actual finite openings. Minimum corner angle follows from tool dimensions and clearance; it is not a universal slider.
- Use one slit-tip construction for sharp line/arc joins. Preserve each arm's ordinary display-thread behavior; curved thread turn need not equal guide turn.
- Treat the result as exact opening positions. A rigid multi-tooth iron cannot reproduce every corrected or curved run exactly.
- Keep user-drawn guides authoritative. Default endpoints and derived junctions remove unnecessary annotation clicks; landmarks remain deliberate.
- Implement with the **running BricsCAD V22 / existing OpenDCL** stack. One block per seam, explicit Generate, predictable Undo.

See the [visual comparison of the decisions](review/design-comparison.svg).

## Run and inspect

No package installation is needed. Node.js 18+ runs the existing laboratory:

```sh
node run-tests.mjs
node build.mjs
node test-viewer.mjs
```

Open [stitch-geometry-lab.html](stitch-geometry-lab.html) for the original 22 examples. A03/A04 are superseded curved-junction experiments; their exact spacing is not approval of their construction.

The new design has separate, deliberately limited evidence probes:

```sh
node review/model-evidence.mjs
node review/correction-evidence.mjs
```

These are mathematical review artifacts, not a general route planner or production solver. The product will not depend on Node or this viewer.

The first implementation target is the LINE workflow in [BRICSCAD_PLAN.md](BRICSCAD_PLAN.md): select, generate, edit length, regenerate, save/reopen, Undo/Redo. Do not port the fixture builders as the route planner.
