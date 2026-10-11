# Geometry guidance

These are starting points for web-oriented product assets. Validate them for
each work; product-specific evidence takes priority.

## Surface and silhouette

- Spend polygons where they affect silhouette, close views, reflections, or
  articulation. Remove hidden or repeated geometry when it does not contribute
  to the planned views.
- Avoid mathematically sharp edges on consumer products. Small bevels or
  carefully controlled normals catch highlights and help the object read under
  restrained real-time lighting.
- When exact dimensions are unavailable, use documented ratios between major
  parts. Mark visual estimates as inferred or approximate and keep them in the
  work analysis.
- Separate significant visual depth layers when they affect silhouette or
  close-up lighting: for example, a plate, rim, and inset surface. Avoid adding
  layers that cannot be seen in the intended framing.

## Runtime cost and inspection

Use the least geometry and texture detail that survives the expected browser
viewing distance and device pixel ratio. Check topology and shading at the
camera's closest product framing, not only in a modeling viewport. Treat
polygon targets as work-dependent budgets and record actual exported counts in
the work analysis rather than setting a universal count here.

These are reusable modeling recommendations, not cross-work learned
heuristics. See [learned heuristics](learned-heuristics.md) for promotion
criteria.
