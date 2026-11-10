# Model and solution

Terms: [glossary](GLOSSARY.md). Rules: [axioms](AXIOMS.md). Construction: [junctions](JUNCTIONS.md).

## Parameters

The tool profile is slit length $\ell$, transverse slit width $w$, signed lean $\alpha$, hole diameter $d$ and clearance margin $m$. Pitch $p$ can differ between guides sharing a profile. Changing pitch does not scale the tool.

Defaults are $p=3\,\mathrm{mm}$, $\ell=1.5\,\mathrm{mm}$, $\alpha=40^\circ$ and $d=0.5\,\mathrm{mm}$. Width and margin must be specified for an effective angle limit; see [limits](LIMITS.md).

## Solution policy

Fix feature positions and protected gaps, fit each free span, then check every distinct opening pair. At a sharp two-arm corner, prefer nominal virtual-to-real steps. If a nominal neighbour lies outside its finite arm, choose the nearest step within the adjustment allowance that puts it on the arm. At a branching junction, fix each first slit at half-pitch chord distance from the shared hole. These neighbours then become fixed constraints for span fitting.

Among feasible fits:

1. Minimize the number of adjusted gaps.
2. Prefer gap counts that allow an exactly centred adjustment block.
3. Choose smaller fractional pitch change, then fewer gaps.
4. Give the adjusted gaps one equal spacing in one contiguous block, placed as centrally as the protected gaps allow. Half-index ties go toward the end.

These choices select a result within the axioms. They do not move fixed features.

## Matched guides

Solve the source once. Transfer its openings and construction by an isometry:

$$
F(x)=Qx+t,\qquad Q^\mathsf{T}Q=I,\qquad\det Q\in\{-1,1\}.
$$

Rotation/translation preserves face; reflection changes face. Transform slit axes by $Q$, and transform round holes, virtual slits and adjusted-step endpoints by $F$. Distances, slit dimensions, clearance and hole correspondence remain unchanged. Copies never fit their spacing independently.

Validate the complete target guides under the same map. Equal length alone is insufficient. Start correspondence fixes registration; closed guides also need a chosen phase. Regenerate text placement so annotations remain readable after reflection.

## Span fitting

Measure each span between its fixed slit centres after reserving junction neighbours. A branching junction's half-pitch connection lies outside this span; it is neither an adjusted gap nor a protected nominal gap counted below.

Let $q_s,q_e$ count protected gaps at either end, and $q=q_s+q_e$. For a positive span:

| Quantity | Straight span | Circular span, radius $R$ |
| --- | --- | --- |
| Total advance $T$ | Length $D$ | Absolute sweep $\lvert\Delta\phi\rvert$ |
| Nominal advance $a$ | $p$ | $2\arcsin\left(\frac{p}{2R}\right)$ |
| Minimum advance $a_-$ | $0.9p$ | $2\arcsin\left(\frac{0.9p}{2R}\right)$ |
| Maximum advance $a_+$ | $1.1p$ | $2\arcsin\left(\min\left\{1,\frac{1.1p}{2R}\right\}\right)$ |

Circular pitch requires $p\leq 2R$ and uses the minor chord. Define the per-gap extension and contraction capacities:

$$
e=a_+-a,\qquad c=a-a_-.
$$

The feasible integer gap counts satisfy

$$
n_{\min}=
\max\left\{1,q,\left\lceil\frac{T+qe}{a_+}\right\rceil\right\},
\qquad
n_{\max}=\left\lfloor\frac{T-qc}{a_-}\right\rfloor.
$$

Reject if $n_{\min}>n_{\max}$. For a candidate count $n$, let $r=T-na$. The required number of adjusted gaps is

$$
k(n)=
\begin{cases}
0,&r=0,\\
\left\lceil r/e\right\rceil,&r>0,\ e>0,\\
\left\lceil -r/c\right\rceil,&r<0,\ c>0,\\
+\infty,&\text{the required capacity is zero}.
\end{cases}
$$

Only fits with $k(n)\leq n-q$ are usable. The minimum $K$ is obtained from the floor and ceiling of $T/a$, clamped to the feasible count range. Counts with that minimum lie in

$$
\left[
\left\lceil\frac{T-Ke}{a}\right\rceil,\,
\left\lfloor\frac{T+Kc}{a}\right\rfloor
\right]
\cap[n_{\min},n_{\max}].
$$

For $K>0$, exact centring requires

$$
n-K\equiv0\pmod2,\qquad
\frac{n-K}{2}\geq\max(q_s,q_e).
$$

Compare the nearest admissible counts on either side of $T/a$, using the solution policy above. For the selected count, the first adjusted gap has zero-based index

$$
i=\operatorname{clamp}
\left(
\left\lfloor\frac{n-K}{2}+\frac12\right\rfloor,\,
q_s,\,
n-q_e-K
\right).
$$

Here $\operatorname{clamp}(x,u,v)=\min\{v,\max\{u,x\}\}$. The adjusted advance and gap are

$$
a'=a+\frac{T-na}{K},
\qquad
p'=
\begin{cases}
a',&\text{straight},\\
2R\sin(a'/2),&\text{circular}.
\end{cases}
$$

For $K=0$, all gaps remain nominal. Negative sweep reverses angular advance; adjustment blocks on circles are centred in angular station. Arithmetic tolerances do not enlarge the permitted pitch adjustment.

| Span with $p=3\,\mathrm{mm}$ | Fit |
| --- | --- |
| $D=30.5\,\mathrm{mm}$ | $n=10$; two central gaps of $3.25\,\mathrm{mm}$. |
| $D=31.5\,\mathrm{mm}$ | $n=11$; five central gaps of $2.7\,\mathrm{mm}$. |
| $D=30.3\,\mathrm{mm}$ | $n=10$; one gap of $3.3\,\mathrm{mm}$ nearest the centre. |
| $D=6.3\,\mathrm{mm}$, final gap protected | $3.3\,\mathrm{mm}$ followed by $3\,\mathrm{mm}$. |
| $D=7\,\mathrm{mm}$ | No fit: $2(1.1p)=6.6\,\mathrm{mm}<D<8.1\,\mathrm{mm}=3(0.9p)$. |

## Fixed features

- Open ends have slit centres at the chosen endpoints.
- Closure reuses the start opening.
- A straight landmark at station $s$ fixes slit centres at $s-p/2$ and $s+p/2$.
- A circular landmark at angle $\phi$ fixes slit centres at $\phi-a/2$ and $\phi+a/2$. This is symmetry along the guide; the chord midpoint lies inside the circle.
- A smooth change of curvature requires one shared slit. Redundant straight or co-circular subdivisions do not force an opening.
- Sharp two-arm corners use the virtual-tip [junction construction](JUNCTIONS.md).
- Branching junctions fix one round hole at the guide intersection and the first slit at chord distance $p/2$ on every arm. Arm count and angle do not change that distance.

Coincident required openings can be reused only when their position, opening type and undirected slit axis agree.

For a straight arm of available length $L$ from a branching hole to a fixed endpoint slit, the remaining span is $D=L-p/2$. Between two branching holes, reserve both neighbours first: $D=L-p$. If $D=0$, reuse one compatible slit; if $D<0$, the reservations overlap and the layout fails. For $D>0$, apply the span equations to the remaining slit-to-slit gaps. Circular arms reserve the arc advance $2R\arcsin\left(p/(4R)\right)$ at each branching end before fitting the remaining sweep.

## Opening clearance

Represent a slit by a finite axis segment $S$ thickened to a capsule of radius $w/2$, and a round hole by a disk. The required separations are

$$
\begin{aligned}
\operatorname{dist}(S_1,S_2)&\geq w+m,\\
\operatorname{dist}(S,P)&\geq \frac{w+d}{2}+m,\\
\lVert P_1-P_2\rVert&\geq \frac{d_1+d_2}{2}+m.
\end{aligned}
$$

Physical envelopes must also be strictly disjoint: touching fails when $m=0$. Check every distinct real opening pair, including closure and other guides. Virtual slits and a shared opening counted twice are excluded.
