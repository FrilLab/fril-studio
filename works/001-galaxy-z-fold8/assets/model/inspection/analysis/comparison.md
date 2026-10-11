# Work 001 Model Comparison

Generated on 2026-10-11 by `scripts/model/compare-glb.mjs`.

## Assets

- Generated: `works/001-galaxy-z-fold8/assets/model/exported/galaxy-z-fold8.glb` (272248 bytes)
- Reference: `works/001-galaxy-z-fold8/assets/model/exported/samsung_galaxy_z_fold8.glb` (1776140 bytes)
- Generated analysis root: `GalaxyZFold8`
- Reference analysis root: `SAMSUNG Galaxy Z Fold8_22`
- Reference author/source/license are documented in [../../reference/README.md](../../reference/README.md).

## Overall shape

Raw dimensions are intentionally not subtracted: the reference unit and product-axis orientation are not verified as matching the generated GLB. The table compares axis-aligned extents sorted by size and normalized by each model's longest extent. Visually confirm orientation before treating the proportion comparison as meaningful.

| Extent | Generated | Reference | Reference − generated |
|---|---:|---:|---:|
| Longest | 1.0000 | 1.0000 | 0.0000 |
| Middle | 0.7677 | 0.7657 | -0.0020 |
| Shortest | 0.0344 | 0.0648 | 0.0304 |

## Complexity

Differences below are reference minus generated. Counts are directly extractable from GLB accessors and document arrays.

| Measure | Generated | Reference | Difference |
|---|---:|---:|---:|
| Position vertices by primitive | 7974 | 14336 | 6362 |
| Triangles | 5996 | 15117 | 9121 |
| Nodes | 39 | 58 | 19 |
| Meshes | 31 | 35 | 4 |
| Materials | 9 | 13 | 4 |
| Textures | 0 | 3 | 3 |

## Product component envelopes

Camera, hinge, and screen envelopes are approximate. The script selects meshes by names and reports a longest-extent ratio, not an official product measurement. Inspect each JSON's `matchedNodes` before using a ratio.

| Component | Generated ratio | Reference ratio | Confidence |
|---|---:|---:|---|
| Camera module | 0.2632 | 0.2625 | approximate/name-selected |
| Hinge | 0.7677 | unavailable | approximate/name-selected |
| Screen | 0.9578 | 0.9843 | approximate/name-selected |

## Hierarchy

- Generated semantic nodes: CameraAssembly, GalaxyZFold8, HingeRoot, LeftBody, LeftBodyPivot, RightBody, RightBodyPivot, Screen_Cover, Screen_Main_Left, Screen_Main_Right
- Reference semantic nodes: none
- Exact shared semantic names: none
- The reference hierarchy is not assumed to provide runtime pivots merely because the product looks articulated.

## Confidence and limits

- Scene dimensions are measured from accessor bounds and node transforms; GLB units are unknown unless separately documented.
- Shape proportions are inferred from normalized, sorted axis-aligned bounds; arbitrary orientation is not corrected automatically.
- Camera, hinge, and screen envelopes are approximate node-name matches and must be checked against the source hierarchy and reference views.
- This report contains derived data only. It does not reproduce the reference model's geometry, materials, or textures.

<!-- Fold8 before-after start -->
## Work-specific before / after measurements

| Feature (normalized ratio) | Previous | Reference | New | Previous error | New error | Error reduction |
|---|---:|---:|---:|---:|---:|---:|
| Open body width / height | 1.3027 | 1.3027 | 1.3027 | 0.00% | 0.00% | 0.00% |
| Camera envelope width / camera-side leaf width | 0.3036 | 0.2531 | 0.2531 | 19.95% | 0.00% | 100.00% |
| Camera envelope height / body height | 0.3551 | 0.3429 | 0.3429 | 3.58% | 0.00% | 100.00% |
| Camera outer-edge margin / leaf width | 0.0737 | 0.0751 | 0.0751 | 1.86% | 0.00% | 99.99% |
| Camera top margin / body height | 0.0964 | 0.0425 | 0.0425 | 127.15% | 0.00% | 100.00% |
| Camera ring diameter / camera envelope width | 0.5388 | 0.7371 | 0.7371 | 26.91% | 0.00% | 100.00% |
| Camera glass diameter / camera envelope width | 0.4449 | 0.6698 | 0.6698 | 33.57% | 0.00% | 100.00% |
| Lens center spacing / camera envelope height | 0.3682 | 0.3721 | 0.3721 | 1.06% | 0.00% | 100.00% |
| Flash diameter / camera envelope width | 0.2122 | 0.2059 | 0.2059 | 3.08% | 0.00% | 100.00% |
| Rear hinge rail width / open body width | 0.0000 | 0.0449 | 0.0448 | 100.00% | 0.26% | 99.74% |

Before the rebuild, the largest relevant gaps were the camera island width and top margin, followed by undersized ring and glass diameters. The official body width-to-height proportion was already aligned with the selected reference body leaf.

The previous values come from generated-previous.json; new and reference values come from this analyzer run. Ratios are normalized against the selected body leaf or component envelope because the two GLBs use different axis conventions and unverified source units. Error percentages are relative to the reference ratio. Ratios are rounded to four decimals and errors to two decimal places; these are comparison estimates, not claims of sub-percent product accuracy. Component confidence is approximate because the analyzer selects mesh envelopes by names.

The reference main display surface measures larger than the official standard Fold8 7.6-inch 4:3 panel, so the generator keeps the official diagonal. Camera depth is not compared because the reference depth envelope conflicts with the official folded stack. Object_18 is interpreted as a rear hinge rail with medium confidence.

Asset after rebuild: 272248 bytes; 31 meshes; 7974 POSITION vertices by primitive; 5996 triangles; 9 materials.
<!-- Fold8 before-after end -->
