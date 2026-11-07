# Long-form README outline

Draft structure only. Use test-catalog IDs for future SVGs.

## What it is

- BricsCAD stitch layout from editable pattern guides.
- Pitch, landmarks, corners and shared junctions.
- Regenerable blocks; original geometry stays editable.

## Problem

- Manual arrays: many objects, tedious edits.
- Manual placement: skill-dependent spacing and junction decisions.
- Need explicit rules, repeatable output and useful rejection.

## Axioms and motivation

- Fixed tool profile; direct centre pitch.
- Landmark centred in a nominal gap.
- Reserve features before fitting.
- Fewest changed gaps, within 10%; central placement preference.
- One opening per closure/shared junction.
- Reject conflicts; preserve prior output.

## Model and solution

- Guide, opening, landmark, junction, free span.
- Straight distance versus circular chord.
- Count bounds; minimum correction count; central block.
- Smooth join, virtual-tip corner, branch hole.
- Whole-set clearance.

## Examples and SVGs

- Straight exact fit, central adjustment, impossible span.
- Landmark and adjacent protected gap.
- Straight corners at several angles.
- Line/arc and arc/arc corners; virtual slits.
- T/X junctions and connected sources.
- Closed loop; start/end and reversal.
- Pattern edit, regeneration and repair.

## Workflow and notation

- Select, pitch, endpoints, landmarks, connections, Generate.
- Slits, thread, `I` marks, dashed construction, labels and ID.
- Source ownership, block identity, Undo/Redo.

## Evidence and limits

- Catalog examples and automated checks.
- Original A03/A04 differences.
- Link to the single limits/qualification record; avoid repeated caveats.
