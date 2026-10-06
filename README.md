# Fril Studio

Fril Studio explores interactive web experiences that combine code, motion, storytelling, and play.

The studio site is the gallery and entry point. Each work is an independent experience that can use the tools and visual language that fit it. Works may be linked directly from social posts and opened at their own URLs.

## Project status

The repository contains the initial studio shell and project conventions. The first production work and the studio's visual design are planned separately.

## Technology

The studio site uses React, TypeScript, Vite, and CSS. The dependency set is intentionally small. Individual works may use plain HTML, CSS, and JavaScript or other web technologies such as GSAP, Three.js, Canvas, WebGL, or React. A work does not need to become a React route.

## Repository structure

```text
src/                  React studio site
works/                Independent, browser-ready experiences
public/               Static assets copied by Vite
docs/                 Architecture and licensing notes
.github/workflows/    CI validation
```

## Local development

Use Node.js 22.12 or newer and npm.

```bash
npm ci
npm run dev
```

The development server prints its local URL. The root site is implemented in `src/`.

## Commands

```bash
npm run dev        # start the Vite development server
npm run lint       # lint TypeScript and TSX source
npm run typecheck  # check TypeScript types
npm run build      # build the studio and copy works into dist/works
```

The build output is in `dist/` and can be served by static hosting. The build copies the contents of `works/` to `dist/works/` as static files.

## Adding a work

Read [works/README.md](works/README.md) for the work directory contract. In short, add a lowercase kebab-case directory such as `works/quiet-garden/`, put a browser-ready `index.html` and its assets there, and make sure it works at its own URL. If a work has a build step, its browser-ready output belongs in that directory. The root build copies it to `dist/works/quiet-garden/` without requiring the studio app to import it or know its framework.

The studio site and works are served as separate pages. A work should provide its own return link to the studio, and its assets should use paths that continue to work from the deployed work URL. Static hosting should serve `index.html` for a work directory URL such as `/works/quiet-garden/`.

## Deployment

The project is static-first and intended to work with free static hosting such as GitHub Pages or Cloudflare Pages. No hosting provider or production deployment workflow is selected yet. The Vite build uses relative asset paths so the output can be hosted from a domain root or a project subpath.

## Licensing

Reusable source code is released under the MIT License in [LICENSE](LICENSE). Original creative works and assets are excluded from that license unless a work says otherwise; they remain with their respective copyright owner(s). See [docs/licensing.md](docs/licensing.md) for the full policy and third-party asset requirements.

This repository is public, but external contributions are not currently accepted.
