# Stitching examples

- Examples of stitching precision in luxury goods
- Diagrams compare the observed corner methods with Autostitch

## Cases

### Hermès Sellier wallet

<img src="../examples/counter_examples/hermies_sellier.png" width="300" alt="Sellier wallet with a diagonal upper corner and decorative H at the lower corner">

- Focus: the top corner and the decorative H below the right-hand run
- The H is represented by six round holes

#### Reference

- Shared diagonal slit with mirrored lean: rear-style top row, front-style vertical row
- The stitches entering the H continue the adjoining thread angles

![Sellier: Shared diagonal slit with mirrored lean](../examples/counter_examples/assets/sellier-wallet-diagonal.png)

#### Autostitch

- Consistent rear-style lean; a round corner hole at the virtual slit-tip intersection
- The H keeps its shape and nominal approaches; its position and the bottom row move to suit the changed slit lean

![Sellier construction with an Autostitch corner](../examples/counter_examples/assets/sellier-wallet-autostitch.png)

| Construction | Number of adjusted gaps | Absolute adjustment ($\mathrm{mm}$) | Absolute residual ($\mathrm{mm}$) | Absolute stitch-length deviation ($\mathrm{mm}$) |
| --- | ---: | ---: | ---: | ---: |
| Reference | $0$ | $0.000$ | $0.000$ | $1.213$ |
| Autostitch | $0$ | $0.000$ | $0.000$ | $1.090$ |

### Loewe Mini Feather hanger

<img src="../examples/counter_examples/loewe_mini_feather.png" width="300" alt="Loewe Mini Feather with a rectangular stitched strap below the swivel hook">

- Focus: the rectangular strap below the swivel hook
- The stitch line goes up the left side, across the top and down the right side

#### Reference

- Shared diagonal slit at the left corner; Vertex point at the right corner
- The two top slits have opposing lean, giving the middle thread a horizontal line

![Loewe: Shared diagonal slit on the left, Vertex point on the right, horizontal middle thread](../examples/counter_examples/assets/loewe-hanger-reference.png)

#### Autostitch

- Same guides; round holes at both corners and consistent slit lean
- One adjusted gap across the top
- Start and end positions shift along the vertical guides to keep those rows nominal

![Loewe construction with two Autostitch corners](../examples/counter_examples/assets/loewe-hanger-autostitch.png)

| Construction | Number of adjusted gaps | Absolute adjustment ($\mathrm{mm}$) | Absolute residual ($\mathrm{mm}$) | Absolute stitch-length deviation ($\mathrm{mm}$) |
| --- | ---: | ---: | ---: | ---: |
| Reference | $3$ | $0.900$ | $0.900$ | $1.403$ |
| Autostitch | $1$ | $0.249$ | $0.249$ | $0.224$ |

### Louis Vuitton Speedy handle chape

<img src="../examples/counter_examples/lv_speedy.png" width="300" alt="Louis Vuitton Speedy with stitched leather handle chapes">

- Focus: the left [handle chape](https://us.louisvuitton.com/eng-us/products/nano-speedy-g81-nvprod7890132v/M29781), the leather tab attaching the handle hardware to the bag
- Closed pentagonal stitch line; one handedness throughout

#### Reference

- Shared diagonal slit at each corner; consistent lean around the loop
- Each side uses equal spacing between its corner slits

![Speedy: five Shared diagonal slit corners with consistent lean](../examples/counter_examples/assets/lv-speedy-chape-reference.png)

#### Autostitch

- Same pentagonal guides; five round corner holes
- Each span uses the fewest adjusted gaps allowed by the pitch bounds
- The loop closes at its starting opening

![Speedy construction with five Autostitch corners](../examples/counter_examples/assets/lv-speedy-chape-autostitch.png)

| Construction | Number of adjusted gaps | Absolute adjustment ($\mathrm{mm}$) | Absolute residual ($\mathrm{mm}$) | Absolute stitch-length deviation ($\mathrm{mm}$) |
| --- | ---: | ---: | ---: | ---: |
| Reference | $26$ | $4.931$ | $4.931$ | $6.610$ |
| Autostitch | $6$ | $0.917$ | $0.917$ | $0.821$ |

### Jaeger-LeCoultre / Casa Fagliano strap tip

<img src="../examples/counter_examples/jaeger_lecoultre_fagliano.png" width="300" alt="Jaeger-LeCoultre Casa Fagliano straps with a pointed tip on the right strap">

- Focus: the pointed end of the right strap
- Both straight rows start at matching heights, with one handedness throughout

#### Reference

- Vertex point: symmetric curves meet at a round hole
- Residual distributed equally through five gaps on each curve; the straight rows remain aligned

![Fagliano: Vertex point with equal compression along both curves](../examples/counter_examples/assets/fagliano-tip-compression.gif)

#### Autostitch

- Same guides and aligned straight rows
- Virtual slit tips place the shared hole right of the vertex, changing the available span on each arm
- One adjusted gap on the left; four on the right
- Minimizing adjusted gaps gives different spacing patterns on the two sides

![Autostitch strap tip with one adjusted gap on the left and four on the right](../examples/counter_examples/assets/fagliano-tip-autostitch.png)

| Construction | Number of adjusted gaps | Absolute adjustment ($\mathrm{mm}$) | Absolute residual ($\mathrm{mm}$) | Absolute stitch-length deviation ($\mathrm{mm}$) |
| --- | ---: | ---: | ---: | ---: |
| Reference | $10$ | $2.509$ | $2.513$ | $2.030$ |
| Autostitch | $5$ | $1.337$ | $1.339$ | $1.169$ |

[Sources, geometry and reproduction](../examples/counter_examples/README.md)
