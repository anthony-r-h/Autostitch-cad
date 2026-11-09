# Stitching examples

For each construction: adjustments are measured from nominal pitch, $\Delta_i=g_i-p$; positive means extension, negative means compression. Totals use chord lengths in millimetres. Residual means the signed remainder before fitting, summed across the runs: $r=T-na$, where $T$ is the span and $a$ is the nominal advance. On curves, residual is arc length in millimetres; adjustment totals are chord-length changes.

Autostitch corners use virtual-to-real steps for pitch accounting, not real-to-hole distances. These corner steps are nominal in the examples. The decorative H's internal spacing is excluded; its two approaches are included. Counts include adjusted gaps to a fixed reference hole.

## Observed constructions

### Shared diagonal corner slit

- One real diagonal slit joins the two arms at the vertex
- Its angle can differ from the ordinary slits on either arm, changing the two adjoining stitches
- In the illustration, the shared slit bisects the corner

![Shared diagonal slit and its two adjoining stitches](../../examples/counter_examples/assets/sellier-diagonal-corner.gif)

Adjusted gaps: $0$. Sum of adjustments: $0.000\,\mathrm{mm}$. Sum of absolute adjustments: $0.000\,\mathrm{mm}$. Residual before fitting: $0.000\,\mathrm{mm}$.

### Mixed front- and rear-style runs

- In the Sellier reconstruction, the top run uses rear-style slit lean; the vertical run uses front-style slit lean
- Their ordinary slit axes remain nearly parallel across the turn, although their lean relative to each arm differs

## Cases

### Hermès Sellier wallet

<img src="../../examples/counter_examples/hermies_sellier.webp" width="300" alt="Sellier wallet with a diagonal upper corner and decorative H at the lower corner">

- Shared diagonal slit at the upper corner; decorative H at the lower corner
- The diagrams represent the H with six circular openings
- The stitches joining its legs continue the ordinary thread angle, with nominal centre spacing and no residual

**Reference construction** — mixed slit lean and a shared diagonal corner slit.

![Sellier case with the reference corner construction](../../examples/counter_examples/assets/sellier-wallet-diagonal.png)

Adjusted gaps: $0$. Sum of adjustments: $0.000\,\mathrm{mm}$. Sum of absolute adjustments: $0.000\,\mathrm{mm}$. Residual before fitting: $0.000\,\mathrm{mm}$.

**Autostitch construction** — consistent rear-style lean and a round hole where the virtual slit tips meet.

![Sellier case with the Autostitch corner construction](../../examples/counter_examples/assets/sellier-wallet-autostitch.png)

Adjusted gaps: $0$. Sum of adjustments: $0.000\,\mathrm{mm}$. Sum of absolute adjustments: $0.000\,\mathrm{mm}$. Residual before fitting: $0.000\,\mathrm{mm}$.

### Loewe Mini Feather hanger

<img src="../../examples/counter_examples/loewe_mini_feather.jpg" width="300" alt="Loewe Mini Feather with a rectangular stitched strap below the swivel hook">

Focus: the rectangular stitched strap directly below the swivel hook.

- One run goes up the left side, across the top and down the right side
- The left corner uses a shared slit; the right corner uses a round hole
- The middle thread across the top is horizontal

**Reference construction**

![Loewe hanger with a left slit corner, flat middle thread and right round hole](../../examples/counter_examples/assets/loewe-hanger-reference.png)

Adjusted gaps: $3$. Sum of adjustments: $-0.900\,\mathrm{mm}$. Sum of absolute adjustments: $0.900\,\mathrm{mm}$. Residual before fitting: $-0.900\,\mathrm{mm}$.

**Autostitch construction** — round holes at both corners, consistent slit lean and a bounded top-span adjustment.

![Loewe hanger with two Autostitch corners](../../examples/counter_examples/assets/loewe-hanger-autostitch.png)

Adjusted gaps: $1$. Sum of adjustments: $+0.249\,\mathrm{mm}$. Sum of absolute adjustments: $0.249\,\mathrm{mm}$. Residual before fitting: $+0.249\,\mathrm{mm}$.

### Louis Vuitton Speedy handle chape

The **handle chape** is the leather tab attaching the handle hardware to the bag. Louis Vuitton uses the term [chapes](https://us.louisvuitton.com/eng-us/products/nano-speedy-g81-nvprod7890132v/M29781) for these attachments.

<img src="../../examples/counter_examples/lv_speedy.png" width="300" alt="Louis Vuitton Speedy with stitched leather handle chapes">

Focus: the left handle chape.

- A closed pentagonal stitch line, with a shared slit at each corner
- One stitch handedness around the loop; no mirrored runs

**Reference construction**

![Speedy handle chape with five shared slit corners](../../examples/counter_examples/assets/lv-speedy-chape-reference.png)

Adjusted gaps: $26$. Sum of adjustments: $-4.931\,\mathrm{mm}$. Sum of absolute adjustments: $4.931\,\mathrm{mm}$. Residual before fitting: $-4.931\,\mathrm{mm}$.

**Autostitch construction** — five round-hole corners, fitted connecting spans and one continuous closure.

![Speedy handle chape with five Autostitch corners](../../examples/counter_examples/assets/lv-speedy-chape-autostitch.png)

Adjusted gaps: $6$. Sum of adjustments: $+0.815\,\mathrm{mm}$. Sum of absolute adjustments: $0.917\,\mathrm{mm}$. Residual before fitting: $+0.815\,\mathrm{mm}$.

### Jaeger-LeCoultre / Casa Fagliano strap tip

<img src="../../examples/counter_examples/jaeger_lecoultre_fagliano.png" width="300" alt="Jaeger-LeCoultre Casa Fagliano straps with a pointed tip on the right strap">

Focus: the pointed end of the right strap.

- The two straight runs have horizontally aligned holes and the same stitch handedness
- A round hole sits exactly at the vertex where the two curves meet
- Assume compression is confined to the curves, distributed equally across each arm's free gaps
- Symmetric guides and equal compression give the same curved chord on both sides: approximately $2.75\,\mathrm{mm}$ for $p=3\,\mathrm{mm}$

**Reference construction** — equal compression through each curve to the fixed vertex hole.

![Aligned strap sides with separate compression through each curve into a shared round hole](../../examples/counter_examples/assets/fagliano-tip-compression.gif)

Adjusted gaps: $10$. Sum of adjustments: $-2.509\,\mathrm{mm}$. Sum of absolute adjustments: $2.509\,\mathrm{mm}$. Residual before fitting: $-2.513\,\mathrm{mm}$.

**Autostitch construction** — the same guides and straight rows. The virtual slit tips locate the hole slightly to the right of the vertex; adjust the fewest gaps within the pitch bounds.

- Left: one adjusted gap of approximately $2.75\,\mathrm{mm}$; the remaining gaps stay nominal
- Right: four adjusted gaps of approximately $2.73\,\mathrm{mm}$

![Autostitch strap tip with one adjusted gap on the left and four on the right](../../examples/counter_examples/assets/fagliano-tip-autostitch.png)

Adjusted gaps: $5$. Sum of adjustments: $-1.337\,\mathrm{mm}$. Sum of absolute adjustments: $1.337\,\mathrm{mm}$. Residual before fitting: $-1.339\,\mathrm{mm}$.

## Interpretation

- Slit axes are inferred from the thread; the balanced corner angle is an assumption
- Front/rear style describes the slit lean here, not proof of which face was punched
- Dimensions are illustrative; the cases use $p=3\,\mathrm{mm}$

[Sources and reproduction](../../examples/counter_examples/README.md)
