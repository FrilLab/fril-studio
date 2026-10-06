# Architecture

Fril Studio has two parts with different jobs:

- **The studio site** is the gallery and entry point. It is a React, TypeScript, and Vite application built from `src/`.
- **Works** are independent interactive experiences stored under `works/`. Each work owns its implementation, dependencies, assets, and presentation. It can use any suitable browser technology and does not need to be a React route.

The root Vite build creates the studio site in `dist/` and copies browser-ready work directories to `dist/works/`. A work at `works/<slug>/index.html` is available at `/works/<slug>/` when the static host serves directory index files. Social posts can link directly to that URL.

This keeps the gallery lightweight and lets each experience evolve independently. Shared packages, a monorepo toolchain, a backend, and deployment-specific infrastructure can be introduced later if actual needs justify them.
