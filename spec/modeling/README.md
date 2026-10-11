# Fril Studio modeling knowledge

This directory stores reusable 3D asset guidance. The boundary is:

- `works/<slug>/assets/model/` holds product-specific evidence: generated and
  reference asset provenance, measurements, node maps, validation, and visual
  comparisons.
- `spec/modeling/` holds methods and lessons that can guide more than one work.

**Work directories preserve evidence. Specs preserve reusable knowledge.**

When a work inspection reveals a useful method, first record the evidence in
that work. Promote a lesson only when it is useful beyond one product, supported
by real inspection or implementation, legally safe to retain, and described
with an appropriate confidence. Keep product names, dimensions, and
product-specific approximations in the work; label an example if a spec needs
one to explain a method.

Specs guide future work; they are not immutable laws. New product evidence can
override a generic recommendation. Record provenance for reference assets and
state whether the binary can be committed or redistributed. Derived analysis
should identify the measured source, normalization, confidence, and limits.

## Documents

- [GLB analysis](glb-analysis.md) — repeatable measurement and comparison.
- [Geometry](geometry.md) — real-time product modeling guidance.
- [Hierarchy](hierarchy.md) — runtime naming and articulation conventions.
- [Web runtime](web-runtime.md) — Fril Studio delivery constraints.
- [Learned heuristics](learned-heuristics.md) — validated reusable lessons only.

The optional analyzer is `scripts/model/analyze-glb.mjs`; comparison is
`scripts/model/compare-glb.mjs`. See the Work 001 README for a worked example.
