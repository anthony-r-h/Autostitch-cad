# Limits and open questions

This is the single record of unsupported cases, unverified claims and remaining qualification work.

## Physical assumptions

| Item | Current position | Evidence needed |
| --- | --- | --- |
| Tool profile | Defaults are 1.5 mm slit length, 40-degree lean and 0.5 mm round-hole diameter. They are illustrative. | Measure the actual iron and punched opening. |
| Slit thickness and retained material | `thickness` and `margin` are unset by default. The solver then checks ideal axes/circles with zero added width or margin. | Choose a measured thickness envelope and a material margin for the process. |
| Material edge | Guides supply no leather boundary; edge clearance is not checked. | A boundary input and a separate rule, if required. |
| Curved chisel placement | Exact centres and local slit angles generally cannot be made by one rigid multi-tooth placement. | Compare individual placement with a tolerable practical approximation. |
| Appearance and labour | Central corrections are a chosen preference. Minimum changed gaps does not prove minimum punching effort. | Stitch comparative samples. |
| Junction strength | Geometric clearance does not establish thread capacity, tear resistance, back-face appearance or tool-body access. | Punch and stitch corners, branches and a representative pattern. |

At `R=10 mm`, `p=3 mm`, neighbouring slit axes differ by 17.253853 degrees. Three successive circular centres depart 0.45 mm from a straight three-tooth arrangement. A rigid iron fits nominal straight runs; adjusted spacing and curves may need individual placement. `K` changed gaps does not mean `K` manual punches.

Fixture values `w=0.2 mm`, `m=0.2 mm` demonstrate angle-dependent clearance; they are not production defaults. For the tested straight-corner profile, included angle 20.435 degrees passes and 20.434 degrees fails. Other profiles, finite arms, nearby holes and curvature change that result.

## Scope boundaries

- Only planar LINE, ARC, CIRCLE and LWPOLYLINE guides; no splines, ellipses, 3D paths or more than one revolution per primitive.
- At most 2,000 openings per independent line or connected set. Oversized results fail, without truncation.
- A landmark gap cannot straddle a genuine change between primitive types or curvatures. That needs a separate mixed-primitive construction.
- No inferred mirror partners or paired corrections around obstructions. Independent spans can require different adjustments.
- Raw guides cannot overlap for a positive length, even when their chosen start/end ranges do not overlap. Trim the actual guides before connecting.
- Changed topology or ambiguous intersection correspondence needs explicit attachment repair. No nearest-point reassignment.
- No automatic stitch regeneration, sewing itinerary, leather deformation model or tool-body collision check.

## Host qualification

- An unexpected .NET editing-event exception still includes the host's technical message before the recovery instruction. Updating that fallback requires replacing the loaded DLL after BricsCAD exits; the current session has unsaved drawings.
- Tested on Windows, BricsCAD Ultimate 22.2.02 and OpenDCL 10.1.2.2. Other hosts are unqualified.
- Native COPY was qualified within one DWG. Cross-DWG scaled insertion remains unqualified.
- Very large coordinate scales remain unqualified; translated geometry was tested through (1000,1000) mm.
- An earlier session crashed during concurrent OpenDCL/COM probes; the cause was not established. Current native automation uses one host and one runner at a time.
- One automated Redo replay failed in a long-running session and did not recur in direct checks, a fresh process or later complete event runs. Timing is a hypothesis, not a diagnosis.

## Next physical checks

1. Record iron, leather, thickness, thread and punching depth; measure pitch, slit dimensions and opening envelope.
2. Compare end/centre corrections on 30.5 mm; one/two corrections on 30.3 mm; the symmetric 31.5 mm solution, all at 3 mm pitch.
3. Compare individual and two-tooth placement on R10 mm and a typical production curve. Inspect both faces and reused holes.
4. Test progressively sharp corners, a shallow-turn rejection, and T/X junctions.
5. Stitch one complete pattern before treating that tool/process profile as qualified.
