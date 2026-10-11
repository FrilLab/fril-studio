# Work 001 reference model

## Provenance

- **Asset:** “SAMSUNG Galaxy Z Fold8” GLB
- **Source:** [Sketchfab model page](https://sketchfab.com/3d-models/samsung-galaxy-z-fold8-dfbcbd3143e644608c758edaa0289db3)
- **Author:** zhe_kan
- **License:** [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)
- **Binary location:** not retained in the work directory
- **Use:** local structural, dimensional, and visual comparison reference
- **Redistribution:** the license permits sharing only for noncommercial use,
  with attribution and ShareAlike terms. It does not grant commercial-use
  permission. Check the intended distribution against the license before
  release.

The reference binary is absent from the current workspace, is not tracked by
Git, and is not packaged for deployment. Keep any locally reacquired copy out
of Git and production unless the intended use is covered by the license. Do not
treat its previous `exported/` location as evidence that it is a Fril
Studio-owned model.

## Use and derived data

No reference mesh, material, texture, or logo geometry was copied into the
Fril-generated `galaxy-z-fold8.glb`. The browser runtime uses only that
independently generated asset.

The JSON analysis and comparison report under `../inspection/analysis/` contain
file metadata, counts, bounds, node names, and derived ratios. They do not
contain reference geometry, materials, or texture data. The analysis selects
the product root `SAMSUNG Galaxy Z Fold8_22` to exclude a second duplicated
assembly in the source GLB. Component envelopes are approximate and the
reference does not expose a semantic hinge node.

Work-specific results and limitations are documented in
[`../inspection/analysis/comparison.md`](../inspection/analysis/comparison.md).
