# Runtime hierarchy conventions

Keep the model hierarchy useful to both inspection and browser interaction.
Prefer stable, semantic names over generated names such as `Object_42` for nodes
that runtime code must find.

## Articulated products

Use a hierarchy that keeps each moving body under a hinge-centered pivot:

```text
AssetRoot
└── ArticulationRoot
    ├── LeftBodyPivot       # origin at hinge axis
    │   └── LeftBody
    └── RightBodyPivot      # origin at hinge axis
        └── RightBody
```

The pivot should sit at the real or intentionally approximated articulation
axis. Animate the pivot group, not each body mesh. Keep independently moving
leaves under separate pivots, even if the initial interaction moves only one.
Do not bake the intended articulation into one flattened mesh.

## Addressable surfaces and assemblies

- Give screens or other replaceable material surfaces their own named mesh or
  group, with stable UVs and a documented front-facing normal.
- Group camera or other close-up assemblies semantically. Preserve the plate,
  ring, glass, and flash depth relationships where they contribute to the view.
- Keep static subcomponents grouped for predictable camera targeting and
  inspection. Avoid naming a broad parent so ambiguously that a runtime lookup
  catches unrelated geometry.
- Document any name mapping in the work when an imported hierarchy cannot be
  renamed at export. Runtime aliases should resolve to the original objects;
  they should not require rebuilding the geometry.

Validate names, parent-child relationships, local transforms, pivot behavior,
screen access, and camera targeting after export. Do not assume names survive
every exporter unchanged.

### Work 001 example

The generated Work 001 GLB has `HingeRoot`, independent body pivots, three
screen targets, and `CameraAssembly`. The active reference asset has different
names and no semantic hinge pivot. Its runtime mapping is documented in that
work; these names and its dimensions are not global requirements.
