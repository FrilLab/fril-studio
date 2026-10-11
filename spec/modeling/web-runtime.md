# Web runtime asset guidance

- Use GLB as the default packaged runtime format when it carries the required
  meshes, transforms, materials, and textures in one browser request.
- Keep reproducible source/modeling files separate from the exported runtime
  asset. Package source and inspection renders only when they are needed by the
  browser; normally they remain authoring data.
- Preserve runtime pivots, semantic nodes, and separately addressable screen
  surfaces in export. Check the exported GLB rather than relying only on the
  source scene.
- Prefer glTF-compatible PBR materials and right-sized textures. Avoid 4K maps
  unless a measured close view needs them; record dimensions and file bytes.
- Load a work's heavy model and runtime only after the visitor enters that
  work. The studio index should use a static thumbnail and lightweight metadata.
- Keep local work assets self-contained while their size is modest. Consider
  CDN/object storage only when measured deployment volume, caching, or delivery
  requirements justify the added dependency.
- Cap pixel ratio and tune geometry/texture detail for mobile. Use one
  persistent renderer where appropriate, avoid unnecessary post-processing,
  and account for low-memory devices when choosing asset size.

These are Fril Studio delivery constraints, not a general Three.js setup guide.
