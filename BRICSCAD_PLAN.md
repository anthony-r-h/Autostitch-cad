# BricsCAD implementation path

The product is a BricsCAD tool for creating, editing and transferring leather stitch lines. The HTML viewer is a way to inspect the geometry while its rules are being settled. It is not the product, a required runtime, or the template for the CAD interface.

The model and its unresolved geometric choices are in [STITCH_MODEL.md](STITCH_MODEL.md). This document explains how that model could become a useful CAD tool. Recommendations below are proposed implementation choices, not features already built.

## The user workflow

The user supplies the path and marks what matters on it. The tool computes and draws the stitching from those inputs.

1. **Draw the stitch guide in CAD.** The user draws the line, polyline or other supported path using normal CAD tools.
2. **Select that guide in the stitch tool.** Highlight it so it is clear which line is being annotated.
3. **Annotate the selected guide with the tool.** Place or edit Start, End, Landmark and Intersection markers by picking points on the guide.
4. **Choose pitch in the tool.**
5. **Generate.** The tool uses the selected guide, annotations and pitch, together with the established profile and construction rules, to calculate the openings. A preview can show the result before it is committed.
6. **Create one contained result on AUTOSTITCH.** All generated slit lines, round holes and correction marks belong to that seam's output block.

These are the normal user inputs. The tool should not require numeric stations, manually calculated offsets, a construction-step table, or knowledge of the internal span formulas.

### Annotate the line directly

| Tool action | What the user picks | Meaning and visible feedback |
| --- | --- | --- |
| Mark Start | A point on the selected guide | Marks where traversal begins. Show a labelled symbol and a direction arrow. |
| Mark End | A point on the selected guide | Marks where traversal finishes. Show a labelled end symbol. |
| Add Landmark | A point where a centred stitch gap is required | Show a distinct landmark symbol. The solver preserves one nominal gap centred around this point. |
| Add Intersection | The relevant junction or corner on the selected route | Show a distinct intersection symbol. The solver applies the established junction rule to the adjoining route segments. |

The exact symbols are a small UI choice. Their meanings must be clear and they must be placed on the selected guide. Endpoint defaults can be proposed from the guide, but their markers must be visible and editable. On a closed route, show a shared Start/End marker and make the direction visible and reversible.

Picking, moving or removing a marker is a tool action. Annotation positions must attach to the guide, not merely be loose decorative objects. Reopening the tool restores the selected guide, its markers and pitch.

A marker describes an input. It is not itself a slit, a round hole or a manual-punch correction mark. In particular, a landmark marker does not request a hole at that point. An intersection marker identifies the guide feature; the chosen corner rule determines the actual opening geometry.

The user does not choose virtual slit positions or manually decide each junction opening. Those are consequences of the established construction. An unsupported or unsatisfied feature must be identified at its marker.

The canonical slit profile, 0.5 mm hole diameter and permitted correction policy are established defaults. They are not additional compulsory fields on every seam.

## What exists, and what remains

| Part | Current position | Work needed for the plugin |
| --- | --- | --- |
| Direct geometric calculations | Straight and circular span fitting, finite slit classification, and one straight-corner construction exist in [geometry.mjs](geometry.mjs). | Port or reuse these calculations independently of the CAD UI. Preserve their numerical decisions. |
| Route construction | [case-suite.mjs](case-suite.mjs) constructs 22 particular examples. | Build a general ordered route and feature planner. A collection of example builders is not yet a solver for any selected polyline. |
| Verification | Numerical regressions, expected outcomes and drawable results exist. | Run equivalent checks against the production core, then verify actual DWG operations in BricsCAD. |
| CAD interaction and persistence | Not implemented. | Selection, preview, block creation, stored definitions, editing, copy handling and Undo. |
| Material imprints | A user requirement, not implemented. | Registration, correspondence, provenance and explicit updating from a master. |

BricsCAD supplies the drawing and extension mechanisms. It does not supply the leather-stitch rules or decide which intersection should mean a corner, a centred crossing, or nothing at all.

## Choose the extension route from the actual installation

The user's BricsCAD version, edition, operating system and existing extension technology have not been established for this project. Inspect the existing extension and installation before choosing a project template. Do not infer that an extension mentioned in a different project is this one.

| Route | Documented availability | Recommendation |
| --- | --- | --- |
| AutoLISP with optional DCL | Lite and higher, Windows/macOS/Linux | Viable for a small command-driven tool. The direct mathematics does not require C++ or .NET. |
| C# through the .NET API | Windows, Pro and higher | Preferred if this matches the user's installation. A separate geometry library, typed stored data and ordinary DWG operations make this a practical route. |
| BRX C++ | Pro and higher, supported BricsCAD operating systems | Use if compiled support across platforms, custom entities or another concrete requirement justifies the additional build work. |
| An existing extension framework | Unknown | Reuse it when it can provide the needed selection, drawing and storage operations. Do not introduce OpenDCL or another UI framework merely because it may be installed. |

Availability comes from the Bricsys edition matrix, developer availability table and API documentation. [1][2][3][4] Ordinary DCL is modal; it is not by itself a persistent dockable palette. [19] The preferences in the right-hand column are engineering judgments.

**Match the host runtime.** V25 used .NET Framework 4.8. V26 introduced .NET 8, requiring older managed plugins to be rebuilt. The current developer portal also lists V27 resources, so V26 must not be assumed to be either the latest version or the user's version. For V26, Bricsys documents an x64 .NET 8 Desktop Runtime and a development target of `net8.0-windows`. Use the samples and references for the installed host. [3][5][6]

For a managed implementation, the required host references are `BrxMgd.dll` and `TD_Mgd.dll`, with Copy Local disabled. The installed `API/dotNet` samples are the starting reference. The BRX SDK is a separate developer download; the ordinary managed API is included with BricsCAD. No constraint-solver assembly is required by the proposed direct geometry core. [3][4][6]

This is enough to choose an initial technical direction. It does not establish that a binary will load until the actual host is known and tested.

## Start with one ordinary block per seam

Use one ordinary block reference per generated seam, containing its actual slit lines, round-hole circles and manual-adjustment marks. Put the block reference and its generated contents on AUTOSTITCH. Keep links to the input guide, annotations and settings, plus a record of the inputs used for generation.

This gives the user one object to select, move, rotate and erase. A block definition still contains entities for its individual cuts. **Blocks solve selection clutter; they do not eliminate the underlying per-hole database objects.** The block APIs explicitly distinguish the entity container from its inserted reference. [7]

| Container | What it would mean here |
| --- | --- |
| Ordinary block | Recommended first version. Normal CAD geometry, one selection, and a clear regeneration boundary. |
| Group | A weaker boundary: group selection depends on PICKSTYLE, and members remain individually editable. [8] |
| Parametric block | Provides parameter-driven size, appearance and visibility changes. It does not replace the integer-count, protected-gap and correction rules. Treat it as an optional later editing mechanism. [9] |
| Custom BRX entity | Could store a compact seam definition and draw the cuts itself. Worth considering only if ordinary blocks prove too expensive or specialist grips are needed. It adds custom-object persistence and proxy behaviour when the extension is unavailable. [4][10] |

A linetype remains unsuitable for locating physical cuts. Linetype and lineweight can still distinguish reference guides or imprints after the actual opening positions have been calculated.

### Keep the input guide and generated result distinct

The user-drawn guide remains an editable CAD input on its original layer. Generating stitches must not delete it, replace it with a stored snapshot, or silently put it inside the output block.

The selected guide, its tool annotations and chosen pitch are the current inputs. The generated block is their result. Store their association so selecting the guide again can recover its inputs and locate the output to replace. Selecting an output may also reopen its linked inputs as a convenience.

All generated stitch geometry goes on **AUTOSTITCH** so it can be hidden, selected or otherwise managed consistently. Use one output block for each seam, not one block for the entire layer. Input annotations have a separate display role and can be shown or hidden by the tool. Their internal storage or display layer is an implementation detail; do not make the user configure several layers before generating a seam.

BricsCAD provides layer visibility, locking and plotting properties. [11] Configure the block and child-entity properties so managing AUTOSTITCH manages the complete generated result. Input markers should not unintentionally appear as punching instructions when plotting the output.

The guide and generated output have separate identities. A stored copy of the last solved guide is useful for traceability and stale-result detection, but it does not replace the actual selected guide as the current input.

## Generate and edit through the same tool

The primary interaction is one tool with guide selection, annotation actions, pitch and Generate. Command names, palette versus dialog, and optional shortcuts can be decided for the chosen extension. They must preserve the workflow above.

Use normal CAD point picking and snapping for annotations. Retain the last pitch. Show the actual openings in the drawing before committing them, with a short failure reason at the relevant marker when the rules cannot be satisfied. BricsCAD exposes selection and prompting through its Editor API, and previews through jigs or transient graphics. [12]

To revise a seam, edit its source guide with normal CAD tools or change its annotations or pitch in the stitch tool, then Generate again. Replace that seam's existing output block; do not append another set of holes. If a guide edit invalidates a marker's attachment, identify that marker and require it to be repositioned rather than silently assigning it a new meaning.

The annotations provide stitching intent:

- Start and End define the selected route and its endpoint treatment under the established rules.
- A Landmark requests the nominal centred gap.
- An Intersection requests the admitted junction construction.
- Geometry crossing the route without an assigned marker does not automatically become a stitching constraint.

Do not infer a whole connected route from nearby geometry or convert every drawing intersection into a feature.

**Generation policy:** calculate and preview in memory, then commit the complete generated result. A failed generation leaves any previous valid output intact and explains the failed feature. It does not undo independent edits the user has already made to the source guide.

Cancel leaves the current output intact. One Undo after successful Generate should restore the previous generated output without deleting or replacing the source guide. Annotation-edit actions should have their own predictable undo behaviour. Transactions provide commit and rollback, but the intended Undo behaviour must be checked in CAD. [13]

## Input scope and the missing general route planner

Recommended initial input set: planar LINE, ARC, CIRCLE, and lightweight POLYLINE containing line and circular-arc segments. Extract analytic geometry through the API. Do not explode the user's source just to read it. The polyline API exposes segment types, bulges, arc segments, local plane information and curve endpoints. [14]

The adapter should produce ordered primitives and semantic features. The planner then:

1. Establishes the route's start, direction, open/closed state and endpoint policy.
2. Reserves the next feature's required entry/exit openings.
3. Computes the usable span between established anchors.
4. Applies the direct span formula, emits its cuts, commits the feature, and continues.
5. For closure, targets the already reserved starting geometry without duplicating it.
6. Returns either a valid result or a specific failure under the selected rule.

Each span uses a direct count decision. Walking the route and emitting its openings are ordinary bounded processing loops. Candidate-count search, convergence loops, numerical optimization and backtracking are excluded by the agreed computational requirement.

Reading a polyline made of supported primitives does not make every combination supported. Each join needs an admitted construction. For example, A05 establishes a shared slit at a smooth line/arc join with free outer margins; it does not prove that an arbitrary incoming phase can flow through any smooth join without an additional rule.

| Situation | Initial treatment |
| --- | --- |
| Straight runs and circular spans | Use the existing direct fit rules. |
| Centred landmarks on a line or one circular arc | Preserve their nominal gap and fit the surrounding spans. |
| Straight-to-straight corners | Use the documented slit-tip rule only where its finite-arm conditions hold. |
| Smooth line/arc join | Support the explicit shared-slit construction. Make endpoint treatment explicit. |
| Sharp joins involving curves | A03/A04 remain exploratory. Do not ship them as satisfying the original corner-angle requirement without resolving that choice. |
| Closed routes | Preserve start, winding and closing feature. The rectangle and circle are precedents, not proof of every composite closed route. |
| T/X seam networks or ambiguous branches | Outside the initial ordered-route model. |
| Splines, ellipses and nonplanar paths | Outside the initial supported construction set. |
| Features that overlap or leave no admissible intervening span | Reject under the stated rule; do not invent a smaller gap or silently alter pitch. |

BricsCAD can represent splines and evaluate curves. That capability does not supply an approved search-free stitching construction. In particular, `GetPointAtDist` evaluates distance along a curve, while the model uses direct centre-to-centre distance. Circular arcs need the chord formula. Do not silently substitute arc-length pitch or approximate an unsupported curve with line segments. [14][15]

### Coordinates, units and direction

Store geometry in a seam-local plane and convert drawing units explicitly to millimetres. Do not assume a drawing's numeric coordinates are millimetres or infer physical scale from the viewport. For unitless drawings, obtain the unit choice before generating physical cuts.

The reference core uses screen coordinates: positive Y downward and positive turn clockwise. BricsCAD's normal XY presentation uses a different convention. Choose and document one adapter mapping, transforming slit vectors, tangent directions, winding and reflection parity together. Flipping point coordinates while independently reapplying a positive 40-degree lean can mirror the cut orientation incorrectly.

A full circle needs an explicit closed flag and sweep/direction. Equal start and end coordinates alone do not distinguish a zero-length span from a completed loop.

## Store enough information to edit the seam

Store the input annotations and pitch against the selected guide or an associated seam record, and keep the output block linked to that record. Use versioned data, preferably extension dictionaries with Xrecords. Xrecords attach arbitrary data to database objects; XData has a documented 16 kB limit and is better used for a small identifying tag. [16]

Suggested data, to refine when implementing:

| Data | Why it is needed |
| --- | --- |
| Schema version and geometry-rule version | Reopen older work without silently applying a different corner or correction rule. |
| Seam ID, instance ID and revision | Distinguish the master definition, independent copies and regenerated results. |
| Source-guide reference, plane and units | Locate and read the user's current guide. |
| Last generated guide and input snapshot | Detect changes and explain the existing output; not a substitute for the current source guide. |
| Start, direction, closed state, endpoint treatment | Recover traversal and closure semantics. |
| Pitch, slit profile and correction policy | Reproduce the physical pattern. |
| Annotation types, guide attachments and order | Restore the visible Start, End, Landmark and Intersection markers and derive the corresponding construction features. |
| Ordered openings and correction records | Inspect what was actually accepted and identify manual work. |
| Imprint source, source revision, piece label and registration transform | Preserve correspondence to the master. |

The exact serialization format is not chosen. Keep values numeric and locale-independent. Do not store an SVG, screenshot or rounded dimension label as the source geometry.

A database handle can help locate an object within its drawing. It is not the complete identity model across copies and exports. Xrecord reference translation can remap database object references during cloning; it does not automatically assign a new seam ID or interpret arbitrary serialized identifiers. [16]

After saving, closing and reopening the DWG, the tool must restore the actual source-guide association, visible annotation meanings and selected pitch. If the source guide is missing, report that fact. A saved input snapshot must not silently become a replacement guide. Generated ordinary geometry should remain visible and plottable without the plugin; regeneration requires the plugin and valid inputs.

## Edits, copies and transforms

| Operation | Proposed behaviour |
| --- | --- |
| Move or rotate generated output | Normal block transformation. The separate source guide is not moved automatically. Generate uses the current guide; preview must show the resulting placement. |
| Independent editable copy | Copy the guide, annotations and settings with a new seam identity, then generate its own output. Give independently edited outputs separate block definitions. |
| Native COPY of output only | A geometry copy, not automatically a new editable seam with independent inputs. Detect duplicated identities and associations before regeneration. Never silently edit all copies. |
| Mirror | Mirroring output alone does not change its source guide or annotations; Generate still uses those inputs. A mirrored input pattern needs an explicit face/handedness convention so its regenerated slit axes are correct. |
| Physical resizing | A resized solved seam is invalid until rebuilt: even uniform resizing changes pitch, slit length and hole diameter. Account for drawing/block unit conversion when checking physical dimensions. |
| Edit the original guide, markers or pitch | Allowed input changes. Mark the output as potentially stale; recompute on Generate and replace only that seam's output. Recheck marker attachments after guide edits. |
| Directly edit generated cuts with BEDIT or grips | Outside the input workflow. Detect inconsistent output; regeneration replaces it from the source guide and annotations. Normal editing of the original guide remains supported. |
| Explode | Treat the resulting geometry as detached output. Do not promise continuing seam semantics or lineage. |

Block references expose a local-to-world transform. A shared block definition affects its references, so identity and independent editing require deliberate handling. EXPLODE converts the block into component entities and can also change inherited display properties. [7][17]

The instruction to keep earlier segments fixed applies during an ordered construction. An explicit user edit can start a new construction from an affected anchor. Do not interpret that instruction as prohibiting all future edits, or use regeneration as permission to move a locked earlier prefix without telling the user.

A raw block scale factor need not be one if it represents a declared unit conversion. Validate the resulting physical pitch, slit length and hole diameter in millimetres. Distinguish a valid unit conversion from resizing a solved seam.

Ordinary blocks do not prevent every native CAD operation from violating physical assumptions. Start with explicit Generate and validation when the tool opens its inputs. Automatic regeneration from events can follow once copy, Undo/Redo, document switching and re-entrancy are handled. An object-modified notification is not a dependency system.

## Transfer imprints from the solved master

Imprints use the master's latest successfully generated output, not source edits that have not yet been generated. For an initial imprint feature, use rigid 2D registration, optionally with reflection. The user supplies the destination piece and alignment. Preserve the master's resolved positions, slit axes, hole types and exceptional intervals. Do not run the spacing solver independently on each destination.

Store the master ID and revision, destination piece/ply label, transform, face/parity and corresponding opening order. Give the imprint a distinct display style and a short label identifying its source.

Define registration from master-local coordinates to destination-local coordinates. Keep those local frames stable during regeneration. Moving the master around the drafting sheet must not relocate its imprints on other pattern pieces during an update. The initial imprint is its own placed block; moving arbitrary destination outlines does not automatically move it unless both belong to a shared piece container.

Opening correspondence is revision-specific. A change of pitch can change the opening count, so an index cannot be assumed to identify the same physical opening across arbitrary revisions. Refresh the imprint and its correspondence together.

Initially, keep master and imprints in the same drawing and use explicit updates. If a master changes or disappears, show stale or missing-source status when the relevant plugin operation runs. Do not promise live automatic updates before events and persistence have been implemented.

This first transfer rule does not infer assembled layers, leather deformation, registration between unrelated outlines, or through-thickness slit behaviour. A mirrored centreline alone is insufficient to establish reverse-face punching instructions. Those require an explicit face convention and, if needed later, a richer transfer model.

## Build in this order

1. **Identify the host and existing extension.** Record version/build, edition, OS/architecture, extension technology and any requirement to support other hosts.
2. **Port the geometry and build the general route planner.** Keep it callable without BricsCAD. Compare its numeric results with the supplied examples. Keep unsupported geometry explicit.
3. **Complete the user's input workflow.** Draw a straight guide, select it in the tool, mark Start and End, choose pitch, and Generate one output block on AUTOSTITCH. Save/reopen and restore the guide association, markers and pitch. Edit the original guide and generate replacement output. Verify Undo. This is the first acceptance gate.
4. **Add the remaining annotation actions and admitted features.** Mark Landmarks and Intersections directly on selected guides, then support their existing line/arc rules and closure. Use the examples to check both positions and rejection behaviour.
5. **Verify ordinary drawing operations.** Move, rotate, independent copy, reflection, scale detection, multiple seams and saved metadata.
6. **Add imprints.** Rigid registration, source label, opening correspondence and explicit update.
7. **Package the actual supported build.** Provide a loadable plugin with short installation/use instructions. Keep build commands in developer documentation.

For initial loading, .NET uses NETLOAD; LISP and BRX applications can use APPLOAD. Packaging and automatic loading can follow a working command. [18] The user should not have to run a build script merely to obtain the file they need to load.

### What must be checked inside BricsCAD

The supplied tests verify the mathematical implementation, not CAD integration. The in-CAD acceptance checks must establish:

- Actual measured slit length, pitch and 0.5 mm hole diameter at the intended drawing scale.
- Correct handedness and corner behaviour in both route directions.
- Preview cancellation leaves no temporary entities.
- Create/edit has predictable Undo and Redo.
- A saved/reopened seam retains editable metadata.
- Editing a copied seam does not change the original.
- The original guide remains editable and its annotation attachments restore correctly.
- Generated cuts form one block per seam on AUTOSTITCH, and Generate replaces the prior output without duplicates.
- A failed Generate preserves the existing valid output and does not undo separately made source edits.
- Master/imprint updates preserve corresponding openings and flag stale data.
- Realistic drawing sizes remain responsive.

Measure performance on representative patterns before choosing a custom entity to reduce database size.

## Decisions still needing evidence

The implementation can proceed with the stated boundaries. These remaining decisions should be resolved at the relevant stage:

- **Host details:** required before selecting the build target.
- **Straight-corner acceptance:** the current tip-aligned construction preserves the schematic thread vector; the real centre-to-corner-hole distances are not ordinary pitch. Confirm that its actual geometry is the intended physical result.
- **Sharp curved junctions:** accept a separate rule, derive another direct rule, or leave them unsupported.
- **Profile calibration:** 1.5 mm slit length and 40 degrees are provisional canonical values, not measurements of a confirmed chisel.
- **Reverse-face transfer:** settle the face/handedness convention before producing imprints intended for punching.

The drawn-guide, tool-annotation, pitch and Generate workflow, with contained output on AUTOSTITCH, is the user's specified workflow. The particular block metadata format, physical-scale validation details and same-drawing imprint policy remain implementation recommendations.

## Official references

Checked 6 November 2026. Some API pages are versioned examples. Confirm signatures and runtime requirements against the target installation.

1. [BricsCAD edition comparison](https://help.bricsys.com/en-us/document/bricscad/getting-started-with-bricscad/bricscad-and-autocad-feature-comparison).
2. [Developer API availability by OS and edition, V25](https://developer.bricsys.com/bricscad/help/en_US/V25/DevRef/source/DevRef_Overview.htm).
3. [Current .NET API, project references and runtime](https://developer.bricsys.com/bricscad/help/en_US/CurVer/DevRef/source/dotNETAPI.htm).
4. [BRX API capabilities and platform model](https://developer.bricsys.com/bricscad/help/en_US/V24/DevRef/source/BRX_01.htm).
5. [Developing and running .NET plugins in V26](https://help.bricsys.com/en-us/document/knowledge-base/how-to/how-to-develop-and-run-net-plugins-in-bricscad-v26).
6. [Current developer resources and SDK downloads](https://bricscad.octave.com/developer-resources).
7. [BlockTableRecord](https://developer.bricsys.com/bricscad/help/en_US/V25/DevRef/source/html/99bdd443-1d53-a52a-d3e9-9afef913225e.htm) and [BlockReference](https://developer.bricsys.com/bricscad/help/en_US/V25/DevRef/source/html/a1730d52-4066-5010-303b-78fc33a86b24.htm).
8. [Working with groups](https://help.bricsys.com/en-us/document/bricscad/blocks-attributes-external-references-and-mechanical-blocks/working-with-groups).
9. [2D parametric blocks](https://help.bricsys.com/en-us/document/bricscad/blocks-attributes-external-references-and-mechanical-blocks/2d-parametric-blocks?version=V27).
10. [Drawing and proxy behaviour](https://help.bricsys.com/en-us/document/bricscad/managing-drawings/opening-and-saving-drawings?version=V25).
11. [LayerTableRecord](https://developer.bricsys.com/bricscad/help/en_US/V25/DevRef/source/html/6ac1cbf1-9c93-97bc-adff-005fe96ebfdc.htm).
12. [Editor](https://developer.bricsys.com/bricscad/help/en_US/CurVer/DevRef/source/html/e0e6089d-ed70-a2e8-70d8-7c5c9be97930.htm) and [TransientManager](https://developer.bricsys.com/bricscad/help/en_US/V25/DevRef/source/html/951a1a70-5a2c-883a-b81f-a82fffdd1521.htm).
13. [Transaction commit and abort](https://developer.bricsys.com/bricscad/help/en_US/CurVer/DevRef/source/html/2ef9a2b9-0f3d-1f0e-d683-c79d14a9aec5.htm).
14. [Polyline segments and curve-distance evaluation](https://developer.bricsys.com/bricscad/help/en_US/CurVer/DevRef/source/html/004ae58e-cd23-8b04-613b-f7c08dfe35b2.htm).
15. [Spline API](https://developer.bricsys.com/bricscad/help/en_US/CurVer/DevRef/source/html/b2bc0628-7637-346c-60e8-9602f5b46543.htm).
16. [Xrecord and clone-reference translation](https://developer.bricsys.com/bricscad/help/en_US/V25/DevRef/source/html/e767bcfb-99ce-74a7-7eed-89da9543a3e0.htm) and [XData size limit](https://developer.bricsys.com/bricscad/help/en_US/V22/DevRef/source/xdsize.htm).
17. [Exploding entities](https://help.bricsys.com/en-us/document/bricscad/modifying-entities/exploding-entities?version=V26).
18. [NETLOAD](https://help.bricsys.com/en-us/document/command-reference/n/netload-command) and [APPLOAD](https://help.bricsys.com/en-us/document/command-reference/a/appload-command?version=V27).
19. [DCL start_dialog and modal behaviour](https://developer.bricsys.com/bricscad/help/en_US/V26/DevRef/source/dcl_functions_start_dialog.htm).
