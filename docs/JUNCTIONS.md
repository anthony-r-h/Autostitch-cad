# Junctions

Construction depends on the incident arms. Terms are defined in the [glossary](GLOSSARY.md).

| Geometry | Opening |
| --- | --- |
| Straight or co-circular continuation, equal pitch | One uninterrupted run; subdivision introduces no hole. |
| Smooth change of curvature | One shared tangent-aligned slit. |
| Sharp two-arm corner | Round hole where the selected virtual slit tips meet. |
| Three or more arms | Round hole at the intersection; one nominal-pitch neighbour on each arm. |

## Sharp corners

Let $h=\ell/2$. Virtual slit centres $C_i,C_o$ and unit axes $\mathbf u_i,\mathbf u_o$ define the round-hole centre:

$$
J=C_i-h\mathbf u_i=C_o+h\mathbf u_o.
$$

The real incoming neighbour is before $C_i$; the outgoing neighbour is after $C_o$. Their corner steps $q_i,q_o$ are direct centre distances, nominally $p_i,p_o$. Each may adjust within $0.9p\leq q\leq1.1p$ to keep its real neighbour on its finite arm. The virtual slits are construction only.

1. Intersect the incoming minus-tip and outgoing plus-tip loci.
2. Choose the isolated intersection nearest the guide vertex. Equally near distinct roots are ambiguous.
3. Recover the virtual stations on the principal branch nearest the vertex. Antipodal ties are ambiguous.
4. Prefer nominal corner steps. Where a neighbour falls outside its arm, choose the nearest allowed step that puts it on the arm.
5. Require all real openings to pass clearance. Mark a real slit whose corner step was adjusted with `I`.
6. Reject a failed construction; do not substitute a farther root or another revolution.

For a circular arm, let $R$ be radius, $\sigma\in\{-1,1\}$ winding, and $\mathbf e_r,\mathbf e_\phi$ its radial and tangential basis. With signed lean $\alpha$:

$$
\begin{aligned}
\mathbf u&=\sigma(-\sin\alpha\,\mathbf e_r+\cos\alpha\,\mathbf e_\phi),\\
\text{tip locus}&=C(s)+\epsilon h\mathbf u(s),\qquad \epsilon\in\{-1,1\},\\
R_\epsilon&=\sqrt{R^2+h^2-2\epsilon Rh\sigma\sin\alpha},\\
b(q)&=2R\arcsin\left(\frac{q}{2R}\right).
\end{aligned}
$$

The tip locus is a concentric circle; a straight arm gives a parallel line and $b(q)=q$. Relative to the vertex, virtual stations must satisfy

$$
-L_i+b_i\leq c_i\leq b_i,\qquad
-b_o\leq c_o\leq L_o-b_o.
$$

Virtual centres may lie on extensions. Real neighbours may not.

Intersect each arm's finite bounds with the advances allowed by its step range. Choose the advance nearest $b(p)$:

$$
\begin{aligned}
b_i&\in[c_i,c_i+L_i]\cap[b(0.9p_i),b(1.1p_i)],\\
b_o&\in[-c_o,L_o-c_o]\cap[b(0.9p_o),b(1.1p_o)].
\end{aligned}
$$

For circular arms, cap the upper chord at $2R$. An empty intersection has no permitted placement. With adjustments disabled, use only $b(p)$.

## Junctions with three or more arms

For a junction at $P$, place one round hole and fix a nominal gap to its first neighbour on each arm. The corresponding advance along the guide is

$$
b=p\quad\text{on a line},\qquad
b=2R\arcsin\left(\frac{p}{2R}\right)\quad\text{on a circle}.
$$

These hole-to-neighbour distances are nominal chords. Sharp two-arm hole distances instead follow the virtual-tip construction.

Two such junction holes can share a protected nominal gap, or have one middle slit with a nominal gap on either side. Fit any remaining free spans normally.

## Angle limits

Use $\delta$ for the signed traversal turn and $\beta$ for the included angle between the arms:

$$
\beta=\pi-\lvert\delta\rvert,\qquad 0<\lvert\delta\rvert<\pi.
$$

A small included angle is a sharp corner. A small turn is nearly straight. Their limits are different.

### Minimum included angle: nominal steps on equal-pitch straight arms

Let $a=\lvert\alpha\rvert$. For the common regime $0<a<\pi/2$ and $p\cos a\geq\ell$, define

$$
A=p\cos a-\ell,\qquad B=p\sin a,\qquad C=w+m>0.
$$

When the closest points are one slit tip and a point on the other slit axis, their separation is

$$
D(\beta)=A\sin\beta+B(1-\cos\beta).
$$

Solving $D(\beta)=C$ gives the minimum included angle for slit-to-slit clearance:

$$
\boxed{
\beta_{\min}=
2\arctan\left(
\frac{C}{A+\sqrt{A^2+2BC-C^2}}
\right).
}
$$

This formula applies when the root is acute, the square root is real, and the closest-point projection lies on the finite slit:

$$
0\leq
\frac{B\sin\beta_{\min}-A(1-\cos\beta_{\min})}{\ell}
\leq1.
$$

Otherwise use the exact finite-axis test below. For $m>0$, equality at the clearance margin is allowed. For $m=0$, the touching boundary is excluded, so the formula gives an infimum rather than an attained minimum. For $C=0$, that infimum can be zero.

The round hole must also clear each neighbouring slit. On a straight arm this distance is independent of the corner angle:

$$
H(p)=
\sqrt{p^2\sin^2\alpha+
\left[\max\{\lvert p\cos\alpha-h\rvert-h,0\}\right]^2}
\ \geq\ \frac{w+d}{2}+m.
$$

If this condition fails, changing the angle cannot fix the profile.

### Shallow-turn limit

For equal pitch, nominal corner steps and sufficiently long arms, real neighbours require

$$
\lvert\delta\rvert\geq
\delta_{\min}=
2\arctan\left(
\frac{h\lvert\sin\alpha\rvert}{p-h\cos\alpha}
\right),
\qquad p-h\cos\alpha>0.
$$

This is the nominal-step limit. With corner adjustment enabled, replace $p$ in this bound by $1.1p$; finite-arm and clearance checks still apply. A zero turn uses the smooth-join rule.

For $p=3\,\mathrm{mm}$, $\ell=1.5\,\mathrm{mm}$, $a=40^\circ$, $w=m=0.2\,\mathrm{mm}$ and $d=0.5\,\mathrm{mm}$, the isolated straight-corner construction with nominal steps and sufficiently long arms admits

$$
20.434278^\circ\lesssim\beta\lesssim157.516571^\circ.
$$

Here the nominal-step threshold is $\delta_{\min}\approx22.483429^\circ$ and $H\approx2.087007\,\mathrm{mm}>0.55\,\mathrm{mm}$. The corner-step allowance lowers the finite-arm threshold to approximately $20.061869^\circ$; this alone does not certify clearance. These results use the stated dimensions; width and margin are inputs, not universal constants.

### Exact test for other profiles and finite arms

Place the vertex at the origin with incoming tangent along the horizontal axis. For straight arms:

$$
\begin{aligned}
Q&=h\sin\alpha\cot(\delta/2),\\
c_i&=h\cos\alpha-Q,&c_o&=-h\cos\alpha-Q,\\
J&=(-Q,-h\sin\alpha),\\
P_i&=(c_i-q_i,0),&
P_o&=(c_o+q_o)(\cos\delta,\sin\delta).
\end{aligned}
$$

Require the finite-arm bounds

$$
q_i-L_i\leq c_i\leq q_i,\qquad
-q_o\leq c_o\leq L_o-q_o.
$$

Construct the two finite slit axes

$$
\begin{aligned}
S_i&=\{P_i+t(\cos\alpha,\sin\alpha):-h\leq t\leq h\},\\
S_o&=\{P_o+t(\cos(\delta+\alpha),\sin(\delta+\alpha)):-h\leq t\leq h\}.
\end{aligned}
$$

Apply the [opening-clearance inequalities](MODEL.md#opening-clearance) to $S_i,S_o,J$. Equality with the required margin locates a clearance boundary; physical touching remains forbidden. The whole stitch layout must pass the same pairwise test.

For curved arms, use their selected tip-locus intersection and resulting finite slit axes. Radii, winding and available lengths are additional inputs. Holding these fixed makes the angle boundaries solvable, but the admissible angles need not form one interval.

T/X junctions use their intersection-centred hole construction and the same clearance test. The two-arm closed form does not apply to them.
