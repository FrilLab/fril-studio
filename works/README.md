# Adding a work

Every directory directly inside `works/` is an independent browser experience
and its metadata source. The studio index discovers those directories
automatically; it does not have a separate work list to edit.

## Create the directory and entry point

Create a lowercase kebab-case directory such as `works/quiet-garden/`. Add a
browser-ready `index.html` and keep the code and runtime assets it needs inside
that directory. The entry point should work when opened directly at
`/works/quiet-garden/` and should provide a visible link back to `/`.

Works can use plain HTML/CSS/JavaScript or their own browser framework and
libraries. Keep dependencies local to the work's implementation. The studio
does not import work code, and the work does not need to be a React route.

## Add `work.json`

Add a `work.json` in the work root. Required fields are:

```json
{
  "id": "005",
  "slug": "quiet-garden",
  "title": {
    "en": "Quiet Garden",
    "ko": "고요한 정원"
  },
  "category": {
    "en": "Interactive story",
    "ko": "인터랙티브 스토리"
  },
  "description": {
    "en": "A short description of the experience.",
    "ko": "경험을 설명하는 짧은 문장입니다."
  },
  "year": "2026",
  "thumbnail": "./thumbnail.webp",
  "entry": "./index.html",
  "status": "published"
}
```

Use a unique `id` and `slug`; the slug must match the directory name. Both
English and Korean values are required for title, category, and description.
`entry` is a relative file path inside the work and must exist. Use
`./index.html` for the standard URL `/works/<slug>/`. `thumbnail` is an
optional relative path to a small static preview; if supplied, the file must
exist. Do not use a GLB, video, or runtime-rendered canvas as a homepage
thumbnail.

Allowed publication statuses are:

- `published` — shown on the homepage and packaged for deployment.
- `draft` — validated but hidden from the homepage and deployment.
- `unpublished` — validated but hidden from the homepage and deployment.

Malformed metadata is reported with its file path and field. Duplicate ids or
slugs, missing locale values, invalid statuses, and missing entry/thumbnail
files fail validation instead of silently disappearing.

## Development discovery

`npm run dev` scans `works/*/work.json` at startup and watches metadata and
work-directory additions/removals. The studio receives a generated Vite
manifest and refreshes when metadata changes. The same dev server serves each
work directly at `/works/<slug>/`; no manual manifest generation or copy step
is needed.

The homepage loads the small metadata manifest and preview images only. It
does not start a work's runtime. The work's own `index.html` and scripts load
after the visitor follows its link.

## Production packaging

`npm run build` validates all work metadata, builds the studio with the
generated published-work manifest, then packages published work directories
under `dist/works/<slug>/`. The output supports direct URLs such as
`/works/001-galaxy-z-fold8/` when the static host serves directory index files.

Packaging keeps the browser entry point, runtime code, and runtime assets. It
omits `work.json`, `README.md`, `.blend` files, `assets/model/source/`,
`assets/model/inspection/`, and `assets/model/reference/`. Keep a homepage
thumbnail in the work root or another runtime directory, outside the excluded
authoring, reference, and inspection folders. These records remain in the
repository; they are excluded only from deployed output. A reference model
needed at runtime must be explicitly placed among runtime exports and have a
license that permits the intended distribution.

## Other work-specific notes

Add device support, audio behavior, third-party rights, attribution, and other
experience-specific instructions to that work's own README or interface.
Original creative work and assets are not covered by the root source code
license unless that work explicitly says otherwise.

## Model source, references, and inspection

For a work containing a 3D model, keep product-specific model evidence beside
the work, normally under `assets/model/`:

- `source/` — Fril-owned editable sources and reproducible generators.
- `exported/` — browser runtime exports. Clearly identify any third-party file
  that remains here for runtime use.
- `reference/README.md` — third-party provenance, author, license, intended use,
  and whether the binary is local, committed, or deployed. This documentation
  directory is excluded from production packaging.
- `inspection/analysis/` — generated/reference analysis JSON, machine-readable
  comparison JSON, and a human-readable comparison report.
- `inspection/` — deterministic view captures and validation records.

Do not commit a downloaded reference binary unless its license permits the
intended redistribution. If it is unknown or disallows redistribution, keep it
local and ignored; retain only legally safe derived analysis and its recorded
provenance. Do not copy third-party geometry, textures, or materials into a
Fril-owned export without compatible rights.

The repository's small GLB analyzer and comparator use no extra dependencies:

```bash
npm run model:analyze -- path/to/model.glb [--root ProductRoot] [--output analysis.json]
npm run model:compare -- generated.glb reference.glb \
  --generated-root GeneratedRoot --reference-root ReferenceRoot \
  --output-dir path/to/inspection/analysis
```

The root node options select one active product subtree, useful when an export
contains duplicates. Without them, the analyzer uses the entire active scene.
The comparison does not infer licensing, units, orientation, or product
accuracy. Record normalization assumptions and confidence in the work report.
Reusable methods belong in [`../spec/modeling/`](../spec/modeling/README.md),
not in a product's measurement record.
