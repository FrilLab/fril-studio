# Agent instructions

## 3D modeling and asset work

Before implementing or modifying a 3D model, read the relevant files under
[`spec/modeling/`](spec/modeling/README.md) and inspect that work's
`works/<slug>/assets/model/inspection/` data. Do not ignore previously
validated findings.

- Treat `works/<slug>/` as the source of product-specific evidence, provenance,
  measurements, and comparison results.
- Treat `spec/modeling/` as reusable guidance shared across works.
- On model-related work, store measurements and comparisons in the work. Promote
  a finding to `learned-heuristics.md` only when it is supported by actual
  inspection or implementation, useful across likely works, legally safe, and
  labelled with confidence and evidence.
- Do not put product-specific measurements in global specs without a clear,
  labelled example. Do not present inferred values as official facts.
- Do not commit a third-party model unless its license explicitly permits the
  intended redistribution. Do not copy third-party geometry or textures into a
  Fril Studio model unless the license permits that use.
- When evidence conflicts, prefer this order:

  1. Official product specification with a recorded source.
  2. Verified work-specific measurement.
  3. Local reference-model analysis with recorded normalization and provenance.
  4. Reusable spec guidance.
  5. Visual inference.

  A generic spec never overrides known product-specific evidence.
- Prefer generated or reproducible modeling code as the source of truth for
  Fril Studio procedural models when applicable.
- In implementation notes and reports, name the specific spec rule or
  work-specific finding used; do not merely say that the specs were consulted.

## Work independence

Works are independent browser experiences discovered from `works/*/work.json`.
Keep product-specific code and assets inside the work. The studio homepage may
load work metadata and static preview images, but not a work's runtime or heavy
assets.
