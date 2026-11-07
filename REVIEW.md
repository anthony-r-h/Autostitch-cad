# Review record - 2026-11-06

Historical foundation review. The resulting plugin and connected-line workflow are implemented; see [current qualification](tests/QUALIFICATION.md) for completed checks and remaining limits.

**Conclusion:** retain the small geometry core; replace fixture-specific assumptions with one route/feature model and actual-opening validation. Implement the editing loop in the existing V22/OpenDCL stack. The foundation is specified for a bounded line/arc domain; physical qualification and CAD integration are separate acceptance gates.

## What the review changed

| Finding | Decision |
| --- | --- |
| Passing fixtures were being treated as a general solver | Keep fixtures as evidence; build normalized primitives, reservations and one span planner. |
| Latest-end corrections crowd features | Centre the minimum correction block; choose exact symmetry on equal-count ties. |
| Mandatory symmetry can reject practical fits | Keep it a preference. 31.5 mm gains symmetry for free; 6.3 mm with a protected final gap retains a valid asymmetric solution. |
| Corner limits confused turn with included angle | Report both. Validate finite footprints; do not hard-code a universal angle cutoff. |
| The spacing guard was sufficient, not necessary | Use exact finite separation for acceptance; a failed length-only bound is not proof of collision. |
| Curved joins used a different, unresolved recipe | Adopt local analytic slit-tip loci and each arm's ordinary-vector continuity. Never substitute a distant root after local failure. |
| Smooth composite curves hid a phase assumption | Reserve a shared slit at each genuine curvature join. Free-phase mixed spans remain explicitly unsupported. |
| More powerful UI frameworks were speculative | Reuse verified V22/OpenDCL; test data lifecycle before adding a stack. |
| Mandatory manual corner markers duplicate the guide | Derive junctions; users supply landmarks and optional endpoint overrides. |
| Blocks were assumed to eliminate geometric complexity | They contain the entities and define replacement boundaries; they do not reduce the number of cuts. |

See the [visual comparison](review/design-comparison.svg) for correction placement and curved-junction geometry. Regenerate it with `node review/render-evidence.mjs`.

These decisions supersede corresponding prescriptions in the initial documents. The JavaScript laboratory is deliberately unchanged so old evidence remains distinguishable from the next design. The review did not establish a universal best-looking correction policy or a physically safe margin.

## Independent challenge and evidence

Three Astra-high investigations covered model/limits, tooling/adjustments, and CAD/workflow. A fresh reviewer challenged their conclusions. Material objections were incorporated: symmetry-aware count ties, conservative-bound false rejection, mixed-span support limits, common guide/output transformation handling, and a remote curved-junction root that could skip most of a valid guide. The final rule fixes the local root and principal inverse stations before feasibility checks; both counterexamples now reject. A final fresh review found no remaining blocking issues.

| Validation | Result and scope |
| --- | --- |
| `node run-tests.mjs` | 30 core tests, 22 reference cases, 1,637 invariants across 88 runs passed; original rules. |
| `node build.mjs` and `node test-viewer.mjs` | Existing offline gallery rebuild and saved/interactive viewer checks. |
| `node review/model-evidence.mjs` | 78 passing review checks for analytic junction construction and finite-cut counterexamples. |
| `node review/correction-evidence.mjs` | 8,215 proposed selections matched an exhaustive interval-count/correction-block oracle. |
| Independent circular-fit oracle | 1,680 additional cases, no minimum-correction mismatch; supports retaining the existing circular mathematics. |
| Browser inspection | Opened the real viewer and inspected R01 rectangle and A04 curved join. Confirmed end corrections/curved-angle caveat. The new SVG sheet was also captured and inspected; its navigation reported a timeout, but the screenshot rendered completely. Captures remain under `output/playwright/`. |
| Host/reference inspection | Running V22.2.02, loaded OpenDCL 10.1.2.2, local Csvlabel and its GitHub project, official V22/OpenDCL documentation. |

Review probes are deliberately specialized: fixed illustrative profiles, small geometries, limited input validation and review tolerances. They are not production geometry implementations and must not be copied wholesale into the plugin. Baseline tests cover many arithmetic boundaries; the new probes do not replace those checks.

## Delivery gates still open

1. **CAD:** stage 1 in [BRICSCAD_PLAN.md](BRICSCAD_PLAN.md), especially failed-write rollback, Undo/Redo, metadata restoration and editable copies. No plugin was loaded or drawing changed in this review.
2. **Physical:** measure the selected tool and choose/test a material margin using the coupons in [PHYSICAL_RULES.md](PHYSICAL_RULES.md). Illustrative widths/margins are not approved settings.
3. **Generality:** implement and test the planner before claiming arbitrary admitted line/arc routes. Sharp loci alone do not prove whole-route feasibility; unsupported topology remains explicit.
4. **Later capabilities:** paired symmetry, free-phase mixed spans, material outlines and reflected imprints have defined boundaries; they are not prerequisites for the first useful tool.

No production behavior was changed because this task exposed substantive foundational decisions. The next action is a concrete LINE vertical slice, not another architecture investigation.

## History

The initial model/formulas/gallery remain available in commit `4c3cda7`. Independent investigation snapshots were committed on `design/foundation-review`; their working documents were then consolidated into the three authoritative specifications. Local review artifacts are ignored; no dependency was added or package installed.
