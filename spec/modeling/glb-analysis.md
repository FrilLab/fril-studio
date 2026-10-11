# GLB analysis procedure

Use the same sequence for generated and reference assets. Record findings in
the work's `assets/model/inspection/analysis/` directory, with provenance in
`assets/model/reference/README.md` for third-party sources.

## 1. Record the file and provenance

Capture the filename, byte size, SHA-256, GLB and glTF versions, generator,
copyright/extras, source URL, author, license, and whether the binary is local,
committed, or deployed. A model analyzer cannot determine redistribution
rights. Do not copy a reference GLB into the repository until its license
permits the intended use.

## 2. Establish scope and normalization

Inspect the active scene and its root nodes. Some exports contain duplicate
assemblies or presentation objects; select the intended product subtree before
comparing counts or bounds. Record the exact selected node name.

Before interpreting dimensions, establish the product's front, back, top, and
articulation axes from documented views or known features. glTF is right-handed
and Y-up, but that does not establish which axis is the product width, height,
or depth. Determine units from provenance or a trustworthy dimension. If units
are unknown, compare normalized ratios and do not report raw coordinate
differences as physical measurements.

For a basic shape comparison, measure transformed active-mesh bounds, center
them when appropriate, and compare sorted dimension ratios only after verifying
orientation. Sorted extents remove axis labels but do not correct rotation or
shear. Preserve both raw bounds and the normalization method in the work
analysis; do not silently apply an arbitrary scale.

## 3. Inspect structure and geometry

Record active and total node counts, meshes, primitives, POSITION accessor
counts, triangle counts, materials, textures, images, and animations. Vertex
counts summed per primitive can count a shared accessor more than once. Record
mesh names and node paths, local and world transforms, and non-uniform scale
warnings. Distinguish a repeated mesh reference from unique geometry where the
format makes that possible. The included script transforms the corners of each
POSITION accessor's local bounding box; for rotated local meshes this is a
conservative box estimate. It does not account for morph-target displacement
or skinned-pose deformation.

Review material PBR values and referenced image formats/dimensions/bytes when
extractable. Flag large textures against the intended web use. Counts and
accessor bounds are measurements of the file; they do not establish product
accuracy.

Inspect runtime candidates by semantic node name and path: articulation pivots,
body groups, separately addressable display surfaces, camera assemblies, and
other surfaces expected to change material. A lookalike mesh is not a runtime
pivot. Confirm that the pivot is placed at the physical articulation axis and
that each moving body remains in its intended subtree.

## 4. Compare product geometry

Compare generated and reference assets only after selecting the corresponding
product assemblies and documenting orientation/unit assumptions. Prefer ratios
such as component extent divided by body extent when source units are uncertain.
Include absolute difference, ratio, and percentage only when the values share a
meaningful basis; omit percentages for unavailable, zero, differently oriented,
or unmatched measurements.

Camera, hinge, screen, bezel, corner, and protrusion bounds selected by names
are approximate unless their mesh boundaries and orientation have been
verified. Record the matched node paths. If one model lacks a semantic boundary,
mark that comparison unavailable instead of inventing a counterpart.

When measuring a rear camera assembly, exclude explicitly named front and cover
cameras from the name-selected bounds. Keep those front cameras in the node
inventory, but do not let them expand the rear camera envelope.

Visual comparisons should use consistent front, rear, side, top, perspective,
camera, and hinge views where available. Keep generated/reference images and
overlays in the work. A simple aligned overlay is useful, but it does not
replace numeric provenance or orientation checks.

## Confidence labels

- `measured`: directly calculated from a known file property or verified
  geometry, with method recorded.
- `inferred`: derived from documented context or a normalized comparison, not
  directly specified by the source.
- `approximate`: useful estimate with incomplete boundaries, orientation, or
  semantic mapping.
- `unavailable`: not extractable or not reliably comparable.

Do not label an inferred value as an official specification. Preserve evidence
and confidence in each work's JSON and explain important limitations in its
comparison report.
