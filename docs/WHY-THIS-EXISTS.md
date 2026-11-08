# Constrained Geometric Placement of Oriented Stitch Perforations

Alternative: Manufacturing-Aware Stitch Layout and Distribution

## 1. The general problem

- Convert a continuous seam path into discrete stitch openings.
- Preserve nominal stitch pitch while satisfying geometric constraints.
- Resolve corners, intersections, landmarks, and closed seams.
- Minimize deviations from nominal pitch and specify exactly where they occur.
- Produce an executable manufacturing pattern rather than an approximate visual representation.

Mathematical characterization:

- Constrained geometric discretization.
- Placement of repeated, oriented features along a path.
- Discrete spacing and phase alignment under geometric constraints.
- Deterministic construction with minimal nonstandard intervals.

## 2. What makes pricking irons different?

- Conventional round holes are rotationally symmetric. Pricking-iron slits have position, length, and orientation.
- Diagonal slits influence the geometry and appearance of the resulting stitches.
- Multi-tooth pricking irons impose rigid spacing between openings.
- Corners require geometric treatment to maintain stitch regularity and symmetry.
- Seam lengths and constraint positions rarely align perfectly with multiples of nominal pitch.
- Adjustments must be physically executable, often requiring individual placement rather than a standard multi-tooth iron.

Core distinction: Stitch layout is not simply distributing points along a line. It must reconcile seam geometry, tool geometry, and manufacturing constraints.

## 3. What the geometric solution does

- Path discretization: Generate ordered stitch openings along straight and curved geometry.
- Constraint satisfaction: Respect endpoints, landmarks, intersections, and closure.
- Corner construction: Resolve directional slits into geometrically consistent transitions, including round corner holes.
- Pitch correction: Preserve nominal spacing wherever possible, minimizing the number of adjusted intervals.
- Execution specification: Identify nonstandard intervals and their required spacing.
- Repeatability: Replace subjective manual layout decisions with explicit geometric rules.

Contribution: Codifying specialized manufacturing judgment into reproducible geometric instructions.

## 4. The broader insight: design to manufacturing

Codifying tacit manufacturing knowledge into executable geometry.

Three stages:

1. Design intent: Where should the seam go, and what should it look like?
2. Geometric resolution: Given the tool and constraints, where exactly must every opening be?
3. Physical execution: Produce those openings according to the resolved pattern.

- Traditional CAD primarily addresses the first stage.
- Manufacturing equipment and operator skill address the third.
- The geometric solution addresses the second, translating design intent into precise manufacturing instructions.
- Expert judgment traditionally bridges the second and third stages.
- Explicit geometric resolution reduces the amount of interpretation required during execution.

Central insight: The ability to manufacture a feature is different from knowing precisely where and how it should be manufactured.

## 5. Two distinct sources of value

### A. Precision manufacturing: explicit execution specifications

- Design establishes the intended seam geometry.
- The tool determines every opening's location and orientation.
- Nonstandard pitch intervals are identified, quantified, and localized.
- Operators receive explicit instructions rather than making spacing decisions during production.
- Execution becomes less dependent on individual judgment.
- Identical designs can be reproduced consistently across operators and production runs.

Manual and semi-automated manufacturing

- Equipment may permit variable stitch length, but the operator still determines where adjustments occur.
- Those decisions are often intuitive, inconsistent, and difficult to communicate.
- Explicit specifications reduce variability and support tighter manufacturing tolerances.

Fully automated CNC manufacturing

- Precise, variable feature placement can be executed without additional manual effort.
- Geometric resolution becomes part of automated manufacturing planning.
- Higher precision can be achieved at little incremental execution cost.
- The value lies in translating design intent into machine-executable geometry.

Key distinction: Equipment capable of varying stitch pitch does not automatically determine where pitch should vary.

### B. Hand craftsmanship: making expert-level layout accessible

- Expert craftspeople develop an intuitive understanding of spacing, corners, and adjustments.
- Less experienced craftspeople often make those decisions manually and inconsistently.
- The tool externalizes that geometric judgment into explicit, repeatable instructions.
- Raises attainable layout quality without requiring equivalent experience.
- Reduces the time and effort required to achieve high precision.
- Makes advanced geometric layout accessible to a broader range of craftspeople.

Effect by skill level:

| Skill level  | Primary value                                                                |
| ------------ | ---------------------------------------------------------------------------- |
| Beginner     | Access to correct geometric layouts without extensive experience.            |
| Intermediate | Significant improvement in attainable precision and consistency.             |
| Advanced     | Less manual adjustment, greater repeatability, reduced layout effort.        |
| Expert       | Primarily efficiency and standardization; smaller gains in absolute quality. |

- Reduces the skill required for excellent layout.
- Does not replace the physical skills of accurate punching and stitching.
- Narrows the quality gap between operators without making their execution skills equivalent.

Core effect: Makes expert-level geometric layout achievable by more people, at substantially lower effort.

## 6. Value by industry and production scale

| Context                                   | Value                 | Reason                                                                                        |
| ----------------------------------------- | --------------------- | --------------------------------------------------------------------------------------------- |
| Ordinary industrial textile manufacturing | Low                   | Existing tolerances and production processes generally make additional precision unnecessary. |
| Precision leather goods manufacturing     | High                  | Stitch regularity, symmetry, and consistency directly influence product quality.              |
| Small-batch luxury production             | High                  | Repeatable precision without extensive manual layout effort.                                  |
| Bespoke leathercraft                      | High                  | Detailed control over irregular geometry and individual pieces.                               |
| Fully automated CNC production            | Conditional           | Precise geometric instructions can be executed at negligible incremental cost.                |
| Footwear and technical textiles           | Application-dependent | Relevant where visible stitch geometry or perforation placement is tightly controlled.        |

Economic principle: The value of additional precision depends on the application, not merely the ability to achieve it.

Scale and skill interact:

- Low-volume hand production benefits from reducing the expertise and effort required for precision.
- Small-batch production benefits from repeatability and standardization.
- Precision industrial production benefits from explicit execution specifications.
- Fully automated production benefits from incorporating geometric resolution directly into manufacturing planning.

## 7. Why general-purpose CAD does not solve this

Examples: AutoCAD, BricsCAD, Fusion 360, Inventor.

- General CAD provides curves, arrays, blocks, dimensions, and geometric constraints.
- It does not generally model the manufacturing semantics of pricking irons.
- Arrays distribute geometry but do not resolve competing stitch-placement constraints.
- Linetypes provide repeated visual patterns without sufficient control over individual opening positions.
- Users must manually adjust spacing, corners, and constrained regions.
- General CAD systems are designed around broadly applicable geometry, not specialized leatherworking processes.

The missing capability is domain-specific geometric planning, not basic CAD functionality.

## 8. Existing specialized leathercraft CAD

Examples: Stitch Hero, Leathercraft CAD, LeatherCAD, EasyPatt.

Existing capabilities:

- Automated stitch-hole generation.
- Fixed-pitch and adjusted-pitch distribution.
- Corner treatment and closure.
- Slit orientation and pricking-iron profiles.
- Some support for multi-piece registration and corresponding stitch holes.

Workflow characteristics:

- Separate applications and editing environments.
- DXF/SVG import-export workflows.
- Additional project files and software to manage.
- Potential loss of native CAD relationships, constraints, and editing continuity.
- Workflow fragmentation for users already designing in commercial CAD.

These applications address substantially similar stitch-placement problems through dedicated leathercraft design environments.

## 9. The CAD plugin

Specialized stitch-layout functionality integrated directly into existing commercial CAD workflows.

- User draws the seam using native CAD tools.
- Selects the guide through the plugin.
- Annotates start, end, landmarks, and intersections.
- Selects nominal stitch pitch.
- Plugin generates the resolved openings.
- Generated stitching is contained as a manageable CAD object on a dedicated layer.
- Seam geometry remains part of the existing CAD drawing and workflow.

Platform:

- BricsCAD implementation.
- AutoCAD as a potential additional platform through compatible or adapted CAD APIs.

### Comparison

| Capability                         | General CAD   | Specialized leather CAD | CAD plugin                |
| ---------------------------------- | ------------- | ----------------------- | ------------------------- |
| Native commercial CAD design tools | Yes           | Varies                  | Retained                  |
| Specialized stitch placement       | Generally no  | Yes                     | Yes                       |
| Pricking-iron geometry             | Manual/custom | Yes                     | Yes                       |
| Existing commercial CAD workflow   | Yes           | Separate environment    | Yes                       |
| Additional design application      | No            | Yes                     | No                        |
| Manufacturing instructions         | Limited       | Varies                  | Explicit geometric output |

## 10. Overall contribution

Technical

- Domain-specific geometric planning for oriented stitch perforations.
- Constraint-aware placement and pitch correction.
- Translation of seam design into explicit manufacturing geometry.

Manufacturing

- Reduced dependence on tacit operator judgment.
- Greater precision, consistency, and repeatability.
- Explicit identification of departures from nominal tooling.
- Improved communication between design and execution.

Craftsmanship

- Makes expert-level layout accessible to less experienced practitioners.
- Raises attainable quality for a given skill level.
- Reduces layout effort for experienced craftspeople.
- Preserves the importance of physical craftsmanship.

Software

- Brings specialized leathercraft functionality into established CAD software.
- Preserves existing tools, drawings, and workflows.
- Eliminates the need for a separate pattern-design environment.

Central thesis: The project bridges the gap between design intent and manufacturing execution by turning specialized geometric judgment into explicit, reproducible instructions. It makes precision stitching layout more accessible to craftspeople and more repeatable in manufacturing, directly within the CAD environment where the work is designed.