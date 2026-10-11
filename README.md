# Fril Studio

Fril Studio is an independent web studio exploring interactive experiences
made with code, motion, storytelling, and play. The root site is the studio
index; each published experience under `works/` is an independent browser page.

## Technology

The studio index uses React, TypeScript, and Vite. Works choose their own
browser technologies and do not need to become React routes. The homepage reads
only a generated manifest and static preview images. A work's JavaScript,
Three.js runtime, models, and other experience assets load only after a visitor
opens that work.

## Local development

Use Node.js 22.12 or newer and npm:

```bash
npm ci
npm run dev
```

The Vite development server scans `works/*/work.json`, validates the metadata,
and makes published works available to the studio index. It watches metadata
changes and additions/removals while running. A work can also be opened
directly at `/works/<slug>/`; no separate copy step or server is needed.

See [works/README.md](works/README.md) for the metadata contract and steps for
adding a work.

## 3D asset workflow

Product-specific model evidence stays with its work under `assets/model/`.
Shared measurement methods and reusable modeling guidance live in
[`spec/modeling/`](spec/modeling/README.md). Before modifying a model, consult
the repository rules in [`AGENTS.md`](AGENTS.md) and the relevant work
inspection files. The analyzer and comparator are available as
`npm run model:analyze` and `npm run model:compare`; see the Work 001 README for
their selected-root usage and output format.

## Commands

```bash
npm run dev        # studio index and direct work URLs
npm run lint       # lint repository TypeScript
npm test           # run unit and locale behavior tests
npm run typecheck  # check TypeScript types
npm run build      # validate metadata, build studio, package published works
```

`npm run build` validates the work directories before building the React site.
It then packages each published work into `dist/works/<slug>/`, preserving
direct work URLs. The generated manifest is a Vite virtual module and is not
manually edited or checked in.

## Work boundaries and deployed files

The studio page imports only localized metadata and references static
thumbnails. It does not import a work's source code or load its GLB, Three.js,
video, or other large runtime assets. A standard link navigates to the
independent work entry point, where that experience initializes itself.

For each published work, production packaging includes its browser entry,
runtime source, and assets. It omits `work.json` (already represented in the
studio manifest), `README.md`, `.blend` files, `assets/model/source/`,
`assets/model/inspection/`, and `assets/model/reference/`. Source, reference
notes, and inspection assets remain in Git for authoring and validation. A
small homepage thumbnail such as `thumbnail.webp` should live outside those
excluded development directories.

## Languages

The studio shell supports English (`en`) and Korean (`ko`). On a first visit it
uses Korean when the browser's preferred language is Korean, and English
otherwise. Choosing `EN` or `KO` stores that preference in `localStorage`.
Shared studio UI translations live in `src/i18n/en.ts` and `src/i18n/ko.ts`.
Each work owns its bilingual title, category, and description in `work.json`.

## Deployment

The project is static-first and intended for static hosting. A host should
serve `index.html` for directory URLs such as `/works/001-galaxy-z-fold8/`.
Vite uses relative asset URLs for the studio build; work files keep paths
relative to their own directory. No backend or database is used.

## Licensing

Reusable source code is released under the MIT License in [LICENSE](LICENSE).
Original creative works and assets are excluded from that license unless a
work says otherwise; they remain with their respective copyright owner(s). See
[docs/licensing.md](docs/licensing.md) for the full policy and third-party
asset requirements.
