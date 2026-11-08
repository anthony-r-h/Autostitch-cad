---
% Skeleton %

# Introduction

- Bring specialized stitch-layout tools into industry-standard, enterprise CAD: pitch, landmarks, corners and shared junctions from editable pattern guides
- A seam path expresses design intent; making it requires exact positions and orientations for individual openings
- Bridge design, geometric layout and physical execution: turn spacing and junction judgement into instructions someone can follow
- Pricking-iron slits have length and orientation as well as position; diagonal slits and their transitions shape the visible stitching
- Seam lengths and required features rarely fall on exact multiples of nominal pitch
- Manual arrays create many objects and make edits tedious; manual placement depends on spacing and junction judgement
- Operationalize judgement through explicit rules, repeatable output and useful rejection when no valid layout exists
- Axiomatic approach driven by manufacturability, visual balance, precision

# Even Big Fashion Gets It Wrong

- Gallery of big name fashion stitching mistakes

# Current State

For cases below, simple gallery showing: Line, curve, intersection, intersection with curve

- Same guides, tool profile and constraints across approaches
- Comparisons demonstrated directly in the visible stitching
- General CAD supplies curves, arrays and blocks; the remaining work is deciding how tool geometry, spacing and required features fit together
- A local spacing correction can change how the next landmark, corner or closure fits

## Equal redistribution

- Evenly distribute

## Local adjustment

- Keep nominal spacing through most of the line; absorb the remainder in a few permitted adjusted gaps near the end
- Compare how many gaps change separately from where they are placed; central placement is our policy, not the only valid fit
- A visually plausible pattern can leave the maker to decide where and how to depart from the tool's nominal spacing


# Autostitch

- Equivalent gallery showing Autostitch with full UI elements to annotate its geometric decisions
- Resolve opening positions and orientations in the same CAD document as the pattern, retaining native editing tools

## Why CAD

- Stitch layout depends on precise geometry: measured paths, exact references, controlled dimensions and relationships between pattern pieces
- Build on the host's drawing, snapping, trimming, offsetting, dimensioning and reusable geometry tools; add the stitch-specific judgement those tools leave to the user
- Keep pattern geometry, references and resolved openings together so layout can be reviewed in the context of the whole design
- Give teams usable geometry within their established drafting standards, drawing templates, review practices and production handoffs

## Why extend an established CAD environment

- Standalone stitch tools can provide a complete specialist environment; for teams already working in enterprise CAD, adopting one adds another editor and project to maintain
- Moving a pattern out for stitch layout and bringing it back creates transfer and reconciliation work whenever the source changes
- Keep the editable source and its generated layout together; reduce duplicate drawings, repeated import/export and uncertainty about which revision the stitches belong to
- Retain the team's existing CAD skills, libraries and automation while adding specialized manufacturing knowledge where the pattern is designed
- Position Autostitch as a capability brought to established CAD platforms, with a consistent geometric model across planned ports
- Current implementation: BricsCAD; additional platform ports are planned

## Axioms and motivation

- Fixed tool profile; changing pitch does not scale the tool
- Pitch is direct centre-to-centre distance; on a curve, use the circular chord rather than arc length
- Centre landmarks inside a nominal gap; no opening at the reference; protect that gap from adjustment
- Keep chosen endpoints, landmark pairs and junction neighbours fixed so fitting cannot move required features
- Bound adjusted slit-to-slit gaps to within $10\%$ of nominal pitch; sharp-corner steps follow their own construction
- Reuse one compatible opening at closure and shared junctions
- Require clearance between every distinct pair of openings across the complete layout

## Model and solution

- Draw from [the glossary](GLOSSARY.md), [axioms](AXIOMS.md), [model](MODEL.md) and [junction construction](JUNCTIONS.md)
- Axioms define valid geometry; the solution policy selects among feasible fits

### Geometry and fixed features

- A guide is an editable path of straight or circular segments; one guide or connected guides define a stitch line, with chosen extents and directions
- Openings are slits or round holes; slit length, width and signed lean relative to the local tangent define the slit geometry, with hole diameter and clearance margin completing the tool profile
- Real slit centres stay on their guides; subdividing the same geometry alone does not change the layout
- Distinguish distance along a guide from direct spacing between openings: on a circle, pitch is a chord, and a nominal chord must fit within the diameter
- Nominal gaps equal the chosen pitch; protected gaps stay nominal; adjusted gaps use the permitted allowance; consecutive equal adjusted gaps form an adjustment block
- Open ends fix slit centres at the chosen endpoints; closure reuses the start opening
- A landmark fixes a nominally spaced slit pair symmetrically along the guide, with no opening at the reference; on a circle, this symmetry follows the arc
- Endpoints, landmark pairs and junction neighbours bound the free spans; fitting places the remaining openings without moving those fixed features

### Fitting free spans

- Fix required features and protected gaps, fit each free span, then check the complete layout
- Bound the feasible integer gap counts using span length or circular sweep, the protected gaps and the adjustment allowance; reject spans with no feasible count
- For each candidate count, determine how many adjusted gaps are needed to absorb the remainder; protected gaps cannot supply that adjustment
- First minimize the number of adjusted gaps; then prefer exact centring, smaller fractional pitch change and fewer gaps, in that order
- Give adjusted gaps one equal spacing in one contiguous block, as central as protected gaps allow; half-index ties go toward the end
- On circles, convert chord spacing to angular advance and centre the adjustment block along the arc
- Demo anchors at $3\,\mathrm{mm}$ pitch: a $30.5\,\mathrm{mm}$ straight span uses two central $3.25\,\mathrm{mm}$ gaps; a $7\,\mathrm{mm}$ span has no permitted fit
- Preserve nominal gaps to retain the tool's regular spacing; mark adjusted gaps and corner steps for individual placement and physical execution

### Joins, corners and junctions

- Junction arms are the portions of stitch lines extending away from the meeting; a through-line contributes two arms, a T three and an X four
- Straight or co-circular continuation at equal pitch stays one uninterrupted run; a smooth change of curvature shares one tangent-aligned slit
- A sharp two-arm corner shares a round hole where the selected tips of two virtual slits meet; those virtual slits are construction only
- Construct the corner by intersecting tip loci: lines parallel to straight arms, circles concentric with circular arms; choose the isolated intersection nearest the vertex and the principal-branch virtual stations nearest it
- Reject ambiguous or failed corner constructions; keep the selected construction rather than substituting a farther intersection or another revolution
- A corner step measures virtual-to-real centre distance; prefer nominal pitch, adjusting within $10\%$ only as needed to keep the real neighbour on its finite arm; virtual centres may lie on extensions
- T/X junctions share a round hole at the guide intersection, with one nominal-pitch neighbour on each arm; sharp two-arm hole-to-neighbour distances follow the virtual-tip construction
- Distinguish a sharp included angle from a shallow change of direction: clearance and finite-arm placement impose different restrictions
- Usable angles depend on slit length, width, lean, hole diameter, pitch and margin; curved arms also require radii, winding and available lengths; the two-arm angle formula does not apply to T/X junctions

### Matched guides

- Solve the source stitch line once; transfer the complete opening layout and construction to matching guides by translation, rotation or reflection
- Rotation and translation preserve face; reflection changes face; travel direction is a separate choice
- Preserve slit geometry, spacing, clearance and opening correspondence; matched copies receive the source's adjusted gaps without fitting independently
- Validate the complete guide geometry under the same transformation; start correspondence fixes registration, and closed guides also need a chosen phase

### Whole-layout clearance

- Model each slit as its finite axis thickened by half its width, and each round hole as a disk; clearance measures edge-to-edge separation
- Check every distinct real opening pair, including other guides and closure; exclude virtual slits and count each shared opening once
- Reuse coincident required openings only when centre, type and slit axis agree; all other openings must remain disjoint and retain the required margin, with touching invalid even at zero margin
- A successful span or corner construction still needs the complete clearance check; reject output that fails it
- Regenerable blocks keep the original pattern guides editable

## Atomic demos and SVGs

- [Illustration guidelines and scripts](../examples/illustrated/README.md): small, direct examples, optionally animated to reveal placement, conflict and the resulting decision
- Example format: 600 × 375 px, landscape, 16:10; keep each frame readable at 600 px wide
- Compose diagrams from reusable elements; keep SVG masters and deliver PNG stills, with optional automatically looping GIF/silent WebM animations and no playback controls
- Opening comparison on the same straight span: equal redistribution changes ten gaps; an end adjustment and Autostitch each change two gaps, in different locations. Show a fixed tooth array to explain nominal tool spacing; keep the crowded last gap as a separate failure example
- Expand the line, curve and intersection gallery into the individual geometric decisions; use test-catalog IDs for future SVGs
- Straight exact fit, central adjustment and impossible span
- Landmark with its protected nominal gap and fitting in the adjacent free span
- Straight corners at several angles
- Line/arc and arc/arc corners, with virtual slits showing the construction
- Smooth joins, T/X junctions and connected guides
- Closed loop, chosen start/end and reversed direction
- Pattern edit, regeneration and repair

# 'I can do that'

- Challenge experienced and master practitioners: can they achieve this layout, and with how much effort?
- 'Can you really' banner combines the demonstrated geometric decisions into one impressive example
- Overall view establishes complexity; annotated close-ups reveal the resolved details
- Difficulty visible to readers with different levels of experience

# Who it helps and where it matters

## Hand craftsmanship

- Less experienced makers gain explicit guidance for spacing, corners and adjustments that otherwise depend on accumulated layout experience
- Experienced makers can spend less time resolving and revisiting those decisions; experts may gain mainly in efficiency and repeatability
- Increase the floor of attainable layout quality; make intricate layouts practical with less preparation effort
- Accurate punching, tool handling and stitching remain physical skills the maker brings to the resolved pattern

## From a pattern to repeatable production

- Pattern designers specify the intended openings and adjusted gaps so the person making the piece has fewer layout decisions left to interpret
- Bespoke work benefits from resolving irregular geometry; small batches benefit from reusing the same decisions across pieces and makers
- Equipment capable of varying pitch still needs a decision about where pitch should vary and by how much
- Explicit geometry makes those decisions inspectable and communicable before physical execution

## Where precision earns its effort

- Strongest fit: visible, closely controlled stitching in leather goods, bespoke pieces and small-batch production, where regularity and symmetry matter to the result
- Benefit depends on the required finish, geometry and time spent on layout; straightforward seams with forgiving tolerances have less to gain
- Automated production is a possible downstream use where resolved opening geometry can feed production preparation; value depends on the process and its precision needs
- For individuals and teams already designing in enterprise CAD, the benefit includes keeping specialized layout within the tools and drawing practices they already use

---

# Authored
