# Porting Autostitch to other CAD programs

## Objective and scope

- Maintain one Autostitch product inside BricsCAD, AutoCAD and FreeCAD, with shared geometry and application rules and separate host integrations.
- Run inside the host application. Separate packages and builds are acceptable; a separate running application or file-based exchange is outside this target architecture.
- Keep BricsCAD V22 as the compatibility baseline unless a change is explicitly agreed.
- Choose the implementation language and runtime after proving the required drawing lifecycle in the target hosts.
- This is a migration plan. It does not establish compatibility with AutoCAD or FreeCAD, select a stack, or authorize changes to production behavior.
- Splines, 3D support, new stitch policies and a UI redesign are outside the migration.

## Preserve the product contract

Use the [workflow](../README.md), [glossary](GLOSSARY.md), [axioms](AXIOMS.md), [model](MODEL.md), [junction construction](JUNCTIONS.md), [limits](LIMITS.md) and [qualification catalog](../tests/cases.json) as the starting specification. Record discrepancies between documentation, code and tests before choosing which behavior to preserve.

- Native source guides and saved settings remain authoritative. Generated output is replaceable; regeneration remains explicit.
- Preserve supported lines, arcs, circles and polylines, including traversal, units, landmarks, connections, exact matching, pitch fitting and clearance.
- Source edits refresh editing markers without silently regenerating stitches.
- Generation of a connected set or matched family is atomic. Failure retains the previous valid output and relationships.
- Generate is one undoable operation. Preserve Undo/Redo for native edits and marker synchronization as well.
- Preserve save/reopen, complete-set copying, object references, missing-member repair and output ownership.
- Editing annotations remain visible while being excluded from intended print output.
- Unsupported geometry or unavailable host capabilities produce explicit diagnostics. Do not silently flatten geometry or weaken the contract.

## Current implementation boundaries

The existing files provide a starting map, not a ready-made separation into portable modules.

| Responsibility | Starting points | Porting concern |
| --- | --- | --- |
| Route geometry and pitch fitting | [autostitch-geometry.lsp](../source/autostitch-geometry.lsp) | Preserve numerical tolerances, selection rules and expected failures. |
| Connections, shared openings and clearance | [autostitch-network.lsp](../source/autostitch-network.lsp) | Separate geometric topology from native object identity. |
| Exact matching and layout transfer | [autostitch-match-geometry.lsp](../source/autostitch-match-geometry.lsp) | Preserve rigid/reflected mapping, traversal and face behavior. |
| Family ownership and atomic generation | [autostitch-matching.lsp](../source/autostitch-matching.lsp) | Separate application decisions from metadata and drawing writes. |
| Metadata, units, output and transactions | [autostitch-cad.lsp](../source/autostitch-cad.lsp) | Contains both application policy and host operations; classify functions before moving them. |
| Markers and native-edit synchronization | [autostitch-markers.lsp](../source/autostitch-markers.lsp), [Autostitch.Events.cs](../source/Autostitch.Events.cs) | Preserve callback timing, rollback, reentrancy guards and history behavior. |
| Palette, picking and document state | [autostitch-ui.lsp](../source/autostitch-ui.lsp), [palette definition](../source/AUTOSTITCH.odcl.json) | Share action/state rules while allowing native controls and picking. |
| Loading, builds and distribution | [AUTOSTITCH.lsp](../AUTOSTITCH.lsp), [build-plugin.ps1](../build-plugin.ps1), [package.ps1](../package.ps1) | Define host/version-specific loading, dependencies and packages. |

In particular, the current event bridge distinguishes native edits from Undo/Redo. Its history callback refreshes controls without opening a database transaction because doing so can invalidate Redo. A port must demonstrate equivalent behavior using its host's mechanisms.

## Target responsibilities

### Shared geometry engine

- Accept plain data describing geometry, traversal, tool settings, landmarks and resolved relationships.
- Solve routes, connected networks and matching without CAD objects, drawing writes, dialogs or callbacks.
- Return complete solution data and structured diagnostics, including expected geometric failures.

### Shared application layer

- Own settings semantics, guide networks, matched families, validation, generation policy, ownership and repair decisions.
- Own annotation meaning, user-facing diagnostic meaning and UI action/state rules.
- Build and validate a complete generation plan before asking the host to replace output.
- Define the atomic replacement scope and failure behavior; delegate the native transaction mechanics to the host.

### Host integration

- Select and read native geometry, pick points, resolve drawing planes and convert units.
- Resolve document-scoped object references, including copying, deletion and missing members.
- Persist settings, relationships and schema versions in the native document.
- Create and replace output, markers and annotations with the required ownership and print visibility.
- Execute transactions and undo groups, including rollback of geometry and metadata together.
- Observe edits, command completion/cancellation/failure, Undo/Redo and document switching/closing.
- Display controls and route actions to the shared application layer in the correct document context.

Investigate an AutoCAD/BricsCAD integration family and a FreeCAD integration family. Share adapter code where demonstrated, while retaining host/version-specific behavior and builds where required. A narrow responsibility does not imply a small implementation, especially for transactions and persistence.

## Shared data boundary

- Normalize geometry lengths to millimetres and angles to radians. Keep the host unit conversion and document-plane transform explicit and reversible.
- Carry stable application identifiers and opaque host references separately. Do not pass live CAD objects into the solver or treat runtime handles as portable persistent IDs.
- Inputs include supported primitives, guide order and direction, extents, settings, landmarks, connections and matching relationships.
- Solution data includes physical openings and dimensions, construction data, source associations, gap classifications and diagnostics.
- Keep derived thread display and annotation layout separate from physical openings. Document whether each derived item belongs to the engine or application layer.
- Define ordering, tolerances, failure categories and schema versions before comparing implementations. Preserve established tolerances unless a separately justified change is approved.
- Files may hold fixtures and test evidence; they are not the runtime integration boundary.

## First gate: prove the lifecycle

Use a small fixed output plan before porting the solver. Exercise the same scenario in every available host/version under consideration.

1. Select native line and arc guides; persist settings, a landmark and source/output relationships.
2. Create linked output and editing markers using the host integration.
3. Edit a source with native tools. Confirm markers refresh while generated stitches remain unchanged until Generate.
4. Regenerate in one undoable operation. Undo and redo both generation and the source edit, checking geometry, metadata, markers and UI state.
5. Save, close and reopen the document. Resolve references and regenerate again.
6. Copy a complete set with native tools. Confirm the copy is independent and its relationships resolve to copied members.
7. Inject a failure after replacement has started. Confirm old output and metadata survive, with no partial new output or dangling references.
8. Switch between two disposable documents and close one. Confirm callbacks and panel actions cannot write into the wrong document.
9. Verify editing annotations are visible during editing and absent from intended print output.

For each step, record host/version, candidate stack, expected result, actual result and evidence. Distinguish pass, fail and not tested. A successful dispatch or a picture of generated holes is insufficient.

Follow [native validation rules](../AGENTS.md#native-validation) and the [qualification process](../tests/QUALIFICATION.md). Use only disposable test documents, one CAD driver at a time, and inspect completed reports. The prototype must remain separate from the production loader and installed plugin.

## Compare implementation routes

These are candidates to investigate, not verified support claims. Check current official SDK/runtime documentation for exact host versions, licensing and distribution requirements before installing or selecting a route.

| Candidate | Question the lifecycle proof must answer |
| --- | --- |
| Python with PyRx for DWG hosts and a FreeCAD Python integration | Can the required builds run inside BricsCAD V22 and the selected AutoCAD versions, with the necessary events, transactions, persistent references and packaging? What bindings and native components are required? |
| C++ with BRX/ObjectARX integrations and a FreeCAD binding | Can one shared engine/application implementation serve the hosts through separate builds and bindings? What SDK, ABI, toolchain and distribution constraints apply to each version? |
| Existing LISP/OpenDCL implementation with an AutoCAD event bridge | Can AutoCAD parity be qualified sooner while retaining current behavior? What remains specific to the DWG hosts and therefore still needs migration for FreeCAD? |

Choose against lifecycle results, supported versions, geometry parity, debugging, packaging, licensing and ongoing maintenance. Document failures and untested combinations. Do not drop V22 or weaken undo/copy behavior to make a candidate fit. If no candidate passes, report the blocking capabilities before starting a rewrite.

## Port and qualify in stages

1. Capture input/output fixtures from the current implementation at a recorded Git revision. Include expected failures, geometry, relationships and tolerance-aware comparisons; preserve existing catalog IDs.
2. Port route geometry, network solving and exact matching. Compare against the current solver and existing independent expectations; resolve discrepancies before host integration.
3. Move application rules behind the host interface. Use a fake backend to check generation scope, ownership, repair decisions and failure paths. Native rollback still requires native tests.
4. Integrate each host and repeat the lifecycle proof with real solver output, connected sets and matched families. Extend the catalog for new host scenarios without renaming existing IDs.
5. Qualify existing DWG metadata migration in each supported DWG host. Specify FreeCAD persistence separately; decide whether cross-host document transfer is required before promising it.
6. Package and test clean installations for each declared host/version. Retire the old solver only after geometry and lifecycle parity are demonstrated.

Use the existing [qualification commands and evidence rules](../tests/QUALIFICATION.md). The current native runners target BricsCAD; reusing a scenario does not make its runner portable. Historical BricsCAD results do not qualify another host.

## Decisions still required

- Exact AutoCAD and FreeCAD versions, operating systems and available test installations.
- Runtime language, integration libraries, native bindings and supported build matrix.
- Persistent identity and copy-remapping strategy in each host.
- Mapping of output grouping, annotations and print visibility to each host.
- Metadata compatibility across releases, and whether users need document transfer between DWG hosts and FreeCAD.
- Acceptance criteria for geometry parity, lifecycle parity and supported distribution packages.

## Suggested first Codex assignment

> Inspect the repository and produce a function-level dependency/capability map, identifying host calls and application rules currently mixed together. Record available target hosts and versions. Implement only an isolated lifecycle proof using fixed output, then evaluate the Python/PyRx and C++/BRX/ObjectARX routes against it. Keep the production solver, loader and behavior unchanged. Return evidence for each lifecycle step, failed or untested combinations, unresolved risks and a recommended stack only where the evidence supports one.
