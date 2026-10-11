# Fril Studio Work 001 — Unfold the Frame

A standalone, scroll-driven Three.js study of a Galaxy Z Fold8. The page uses
native ES modules and a pinned Three.js 0.180.0 import map; it does not load the
React studio application.

- **Entry:** `index.html`
- **Runtime model:** `assets/model/exported/galaxy-z-fold8.glb`, generated from
  Fril Studio's Blender source at `assets/model/source/build_fold8.py`.
- **Homepage preview:** `thumbnail.webp` is a temporary static preview adapted
  from the generated model's rear inspection render. The homepage does not
  initialize Three.js or load the GLB.
- **Device support:** desktop and mobile; mobile uses a lower pixel ratio and
  wider framing so the open device stays in view.
- **Background:** two seeded Three.js point layers (292 stars total) with very
  slow drift; reduced-motion settings stop the drift.
- **Attribution:** unofficial interactive concept by Fril Studio; not
  affiliated with or endorsed by Samsung Electronics.

The browser loads the generated GLB directly and resolves its semantic nodes:
`GalaxyZFold8`, `HingeRoot`, both body pivots, both body groups, three screen
surfaces, and `CameraAssembly`. The export has width on X, thickness on Y, and
height on Z. The runtime rotates only the asset root to align it with Three.js
Y-up, preserving the hierarchy; the left body folds using its exported local Z
hinge axis. The camera close-up targets the bounds of the existing camera
assembly. Geometry is not rebuilt or reparented in JavaScript.

Production packaging includes the generated runtime GLB and browser files. It
excludes Blender source, inspection renders and analysis, reference notes, and
the earlier third-party comparison GLB if present.

## Model inspection and provenance

This work follows the per-work layout described in
[`spec/modeling/README.md`](../../spec/modeling/README.md):

```text
assets/model/
├── source/       # Fril-owned Blender source and reproducible generator
├── exported/     # Fril-generated runtime GLB
├── reference/    # provenance and use notes for the analyzed third-party model
└── inspection/
    ├── analysis/ # generated.json, reference.json, comparison.json/.md
    └── *.png     # validation renders, preserved in place
```

`validation.json` records generated-model checks, Fold8-specific dimensions,
official source links, and confidence for reference-derived camera and hinge
proportions. The analysis JSON labels raw reference bounds as measured in
unknown units and named component envelopes as approximate.

The downloaded Sketchfab model was used as a local comparison reference. Its
source and CC BY-NC-SA 4.0 provenance are recorded in
[`assets/model/reference/README.md`](assets/model/reference/README.md). The
reference binary is not retained in the current work directory or production
package. Comparison JSON preserves derived measurements, not its geometry,
materials, or textures.

Analyze the generated model from the repository root:

```bash
npm run model:analyze -- works/001-galaxy-z-fold8/assets/model/exported/galaxy-z-fold8.glb --root GalaxyZFold8 --output works/001-galaxy-z-fold8/assets/model/inspection/analysis/generated.json
```

To compare against a reference you are authorized to use, pass its local path:

```bash
npm run model:compare -- \
  works/001-galaxy-z-fold8/assets/model/exported/galaxy-z-fold8.glb \
  /path/to/local-reference.glb \
  --generated-root GalaxyZFold8 \
  --reference-root 'SAMSUNG Galaxy Z Fold8_22' \
  --output-dir works/001-galaxy-z-fold8/assets/model/inspection/analysis
```

Comparison output is evidence for this product only. For shared methods and
promotion criteria, see [`spec/modeling/`](../../spec/modeling/README.md).

## Procedural reconstruction

`assets/model/source/build_fold8.py` independently generates the runtime GLB
and its `.blend` source. It does not read or reuse the reference GLB geometry,
textures, or materials. Rebuild with Blender 5.2 LTS from the repository root:

```bash
blender --background --python-exit-code 1 --python works/001-galaxy-z-fold8/assets/model/source/build_fold8.py
```

The generator keeps the official 161.4 × 123.9 × 4.5 mm open and 81.9 × 123.9
× 9.7 mm folded dimensions, plus the official 7.6-inch main and 5.5-inch
cover-display diagonals. Camera size and placement, lens spacing, flash size,
and the inferred split hinge rail use normalized proportions from the analyzed
reference hierarchy. Their confidence and limitations are recorded in
`inspection/validation.json` and `inspection/analysis/comparison.md`.

`inspection/analysis/generated-previous.json` preserves the analyzer output
from the previous procedural GLB. Regenerate the work-specific before/after
ratios after running an updated comparison:

```bash
node works/001-galaxy-z-fold8/assets/model/inspection/analysis/build-improvement-report.mjs
```
