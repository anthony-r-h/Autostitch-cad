# Stitching examples

Corner treatments found in finished work, reconstructed as stitch diagrams and compared with Autostitch.

- Reference diagrams interpret the photographs; slit axes are inferred from the visible thread
- Dimensions and spacing are chosen for the diagrams, using $p=3\,\mathrm{mm}$. The totals describe these reconstructions, not the products
- Autostitch changes corner openings and sometimes start/end positions. The comparisons include those changes, as well as the distribution of adjustments

## Corner treatments

### Shared diagonal slit and mixed slit lean

- One real diagonal slit joins the incoming and outgoing arms
- Its orientation differs from both rows, changing the direction and visible length of the thread entering and leaving the corner slit
- In the Sellier reconstruction, the top row uses rear-style lean and the vertical row uses front-style lean; their slit axes remain nearly parallel across the turn
- The shared slit bisects the corner in this diagram. Front/rear style describes the lean, not which face was physically punched
- The shared opening stays at the intended vertex
- This treatment relaxes the consistent-lean rule: one arm uses mirrored lean and the corner slit has its own orientation
- A good corner solution when those changes in lean and thread appearance suit the design

![Shared diagonal slit joining rows with different lean relative to their guides](../examples/counter_examples/assets/sellier-diagonal-corner.gif)

| Construction | Number of adjusted gaps | Absolute adjustment ($\mathrm{mm}$) | Absolute residual ($\mathrm{mm}$) |
| --- | ---: | ---: | ---: |
| Shared diagonal slit | $0$ | $0.000$ | $0.000$ |

## Cases

### Hermès Sellier wallet

<img src="../examples/counter_examples/hermies_sellier.webp" width="300" alt="Sellier wallet with a diagonal upper corner and decorative H at the lower corner">

- Focus: the top corner and the decorative H below the right-hand run
- The H is represented by six round holes; its two approaches are set to nominal pitch, with no residual

#### Reference

- Shared diagonal corner slit; rear-style top row and front-style vertical row
- The stitches entering the H continue the adjoining thread angles

![Sellier reconstruction with a shared diagonal corner slit](../examples/counter_examples/assets/sellier-wallet-diagonal.png)

#### Autostitch

- Consistent rear-style lean; a round corner hole at the virtual slit-tip intersection
- The H keeps its shape and nominal approaches; its position and the bottom row move to suit the changed slit lean

![Sellier construction with an Autostitch corner](../examples/counter_examples/assets/sellier-wallet-autostitch.png)

| Construction | Number of adjusted gaps | Absolute adjustment ($\mathrm{mm}$) | Absolute residual ($\mathrm{mm}$) |
| --- | ---: | ---: | ---: |
| Reference | $0$ | $0.000$ | $0.000$ |
| Autostitch | $0$ | $0.000$ | $0.000$ |

### Loewe Mini Feather hanger

<img src="../examples/counter_examples/loewe_mini_feather.jpg" width="300" alt="Loewe Mini Feather with a rectangular stitched strap below the swivel hook">

- Focus: the rectangular strap below the swivel hook
- The stitch line goes up the left side, across the top and down the right side

#### Reference

- Shared slit at the left corner; round hole at the right corner
- The two top slits have opposing lean, giving the middle thread a horizontal line

![Loewe reconstruction with a slit corner, horizontal middle thread and round corner](../examples/counter_examples/assets/loewe-hanger-reference.png)

#### Autostitch

- Same guides; round holes at both corners and consistent slit lean
- One adjusted top gap, approximately $3.249\,\mathrm{mm}$
- Start and end positions shift along the vertical guides to keep those rows nominal

![Loewe construction with two Autostitch corners](../examples/counter_examples/assets/loewe-hanger-autostitch.png)

| Construction | Number of adjusted gaps | Absolute adjustment ($\mathrm{mm}$) | Absolute residual ($\mathrm{mm}$) |
| --- | ---: | ---: | ---: |
| Reference | $3$ | $0.900$ | $0.900$ |
| Autostitch | $1$ | $0.249$ | $0.249$ |

### Louis Vuitton Speedy handle chape

<img src="../examples/counter_examples/lv_speedy.png" width="300" alt="Louis Vuitton Speedy with stitched leather handle chapes">

- Focus: the left [handle chape](https://us.louisvuitton.com/eng-us/products/nano-speedy-g81-nvprod7890132v/M29781), the leather tab attaching the handle hardware to the bag
- Closed pentagonal stitch line; one handedness throughout

#### Reference

- A shared slit at each corner
- Each side uses equal spacing between its corner slits

![Speedy reconstruction with five shared slit corners](../examples/counter_examples/assets/lv-speedy-chape-reference.png)

#### Autostitch

- Same pentagonal guides; five round corner holes
- Each span uses the fewest adjusted gaps allowed by the pitch bounds
- The loop closes at its starting opening

![Speedy construction with five Autostitch corners](../examples/counter_examples/assets/lv-speedy-chape-autostitch.png)

| Construction | Number of adjusted gaps | Absolute adjustment ($\mathrm{mm}$) | Absolute residual ($\mathrm{mm}$) |
| --- | ---: | ---: | ---: |
| Reference | $26$ | $4.931$ | $4.931$ |
| Autostitch | $6$ | $0.917$ | $0.917$ |

### Jaeger-LeCoultre / Casa Fagliano strap tip

<img src="../examples/counter_examples/jaeger_lecoultre_fagliano.png" width="300" alt="Jaeger-LeCoultre Casa Fagliano straps with a pointed tip on the right strap">

- Focus: the pointed end of the right strap
- Both straight rows start at matching heights, with one handedness throughout

#### Reference

- Symmetric curves meet at a round hole fixed at the vertex
- Equal compression through each curve is an assumption of this reconstruction
- Five adjusted gaps per side, approximately $2.749\,\mathrm{mm}$ each; the straight rows remain aligned

![Symmetric reference curves compressed equally into a fixed vertex hole](../examples/counter_examples/assets/fagliano-tip-compression.gif)

#### Autostitch

- Same guides and aligned straight rows
- Virtual slit tips locate the shared hole slightly right of the vertex, changing the available span on each arm
- Left: one adjusted gap of approximately $2.747\,\mathrm{mm}$
- Right: four adjusted gaps of approximately $2.729\,\mathrm{mm}$
- Minimizing adjusted gaps gives different spacing patterns on the two sides

![Autostitch strap tip with one adjusted gap on the left and four on the right](../examples/counter_examples/assets/fagliano-tip-autostitch.png)

| Construction | Number of adjusted gaps | Absolute adjustment ($\mathrm{mm}$) | Absolute residual ($\mathrm{mm}$) |
| --- | ---: | ---: | ---: |
| Reference | $10$ | $2.509$ | $2.513$ |
| Autostitch | $5$ | $1.337$ | $1.339$ |

[Sources, geometry and reproduction](../examples/counter_examples/README.md)
