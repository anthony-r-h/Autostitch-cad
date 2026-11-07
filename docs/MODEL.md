# Model and solution

Implementation: [geometry](../source/autostitch-geometry.lsp), [connected sets](../source/autostitch-network.lsp). Rules: [axioms](AXIOMS.md).

## Inputs and objects

| Object | Meaning |
| --- | --- |
| Guide | Ordered line/arc primitives; original CAD entities remain authoritative. |
| Landmark | A station requiring one centred nominal gap. |
| Junction | Incident stitch arms sharing one opening. Corners within a guide are derived; separate guides are connected explicitly. |
| Opening | One slit or round hole. Virtual slits are construction only. |
| Reservation | Fixed opening centres and protected nominal gaps. |
| Free span | Distance between consecutive reservations, fitted without moving them. |

Pitch `p` is per source. Slit length `l`, lean `alpha`, handedness, round-hole diameter `d`, effective thickness `w` and retained-material margin `m` belong to its saved tool settings. Changing pitch does not scale them. Connected members must agree on tool settings; pitch may differ.

Default dimensions: `p=3 mm`, `l=1.5 mm`, `alpha=40 degrees`, `d=0.5 mm`. Calibration status is in [limits](LIMITS.md).

```text
normalize guide -> reserve features -> fit free spans
-> emit/reuse openings -> validate whole set -> commit output
```

## Span fitting

Let `qStart`, `qEnd` count protected nominal intervals and `q=qStart+qEnd`.

Use the same arithmetic for lines and circles:

| Quantity | Line | Circle of radius R |
| --- | --- | --- |
| Span `T` | Length D | Absolute sweep |
| Nominal advance `a` | p | 2 asin(p/(2R)) |
| Minimum advance `amin` | 0.9p | 2 asin(0.9p/(2R)) |
| Maximum advance `amax` | 1.1p | 2 asin(min(1,1.1p/(2R))) |

Circular pitch requires `p <= 2R`; every step uses the minor chord. Define `e=amax-a`, `c=a-amin`.

```text
low  = max(1, q, ceil((T + q e)/amax))
high = floor((T - q c)/amin)
```

An empty integer range fails. For a candidate interval count `n`, residual `r=T-na` needs:

```text
k(n) = 0                  if r=0
       ceil(r/e)          if r>0
       ceil(-r/c)         if r<0
```

The minimum `K` comes from the clamped floor and ceiling of `T/a`. All counts with that minimum lie in:

```text
[ceil((T-Ke)/a), floor((T+Kc)/a)] intersect [low, high]
```

For `K>0`, prefer counts with `n-K` even and `(n-K)/2 >= max(qStart,qEnd)`. These allow exact centring. Compare the nearest admissible counts below and above `T/a`; choose smaller fractional pitch change, then smaller `n`. No count search is needed.

```text
blockStart = clamp(roundHalfUp((n-K)/2), qStart, n-qEnd-K)
changed advance = a + (T-na)/K
changed line gap = changed advance
changed arc chord = 2R sin(changed advance/2)
```

`K=0` emits nominal intervals only. Negative sweeps reverse angular advances. Circle corrections are centred in angular station. Numeric comparisons use arithmetic tolerances, not added pitch or manufacturing allowances.

| Span at p=3 mm | Result |
| --- | --- |
| 30.5 mm | 10 intervals; two central gaps of 3.25 mm. |
| 31.5 mm | 11 intervals; five central gaps of 2.7 mm. |
| 30.3 mm | 10 intervals; one 3.3 mm gap nearest the centre. |
| 6.3 mm, last gap protected | 3.3 mm followed by 3 mm. |
| 7 mm | No fit: two gaps reach at most 6.6 mm; three need at least 8.1 mm. |

## Feature reservations

- Open ends: slit centres at the selected start and end.
- Closed route: reuse the start opening at closure.
- Straight landmark at station `s`: reserve `s-p/2` and `s+p/2`.
- Circular landmark at angle `phi`: reserve `phi-a/2` and `phi+a/2`. This is station symmetry; the chord midpoint is inside the circle.
- Smooth curvature change: reserve one shared slit. Redundant subdivisions have already been removed.
- Sharp corners and branches: use [junction reservations](JUNCTIONS.md).

Reuse reservations only when position, opening type and undirected slit axis agree. Otherwise reject the conflict.

## Clearance

Model a slit as a capsule around its finite axis, and a round hole as a disk. For the shared profile:

```text
slit/slit:   axis distance >= w + m
slit/round:  axis-to-centre distance >= w/2 + d/2 + m
round/round: centre distance >= (d1+d2)/2 + m
```

Touching physical envelopes fail even when `m=0`. Check all distinct real pairs, including closure and other paths; omit virtual slits and intentional shared identities. The cut drawing remains axes and circles. Stroke weight is display notation, not physical width.
