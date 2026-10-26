# web

The myapp web app: Next.js 16.4 (App Router, TypeScript, Tailwind CSS v4, Turbopack). It is
UI only. Everything it shows comes from the myapp API.

Next.js 16.4 has changed a lot. Read [`AGENTS.md`](AGENTS.md) and the guides bundled in
`node_modules/next/dist/docs/` before writing Next.js code.

## Run

From the repo root:

```bash
pnpm dev:web          # http://localhost:3000 (or the next free port)
```

Or from this folder: `pnpm dev`, `pnpm build` (static export in `out/`),
`pnpm preview` (serves `out/`), `pnpm lint`.

## How it works

- **Static export** (`output: "export"`). `next build` writes plain HTML/JS to `out/`, the
  same files a desktop shell bundles. There's no Next.js server, so `next start` doesn't
  apply. Export mode also makes the build fail on server-only features (`cookies()`,
  server actions, route handlers that read the request, proxy). That keeps the logic in the
  API.
- **Every element comes from the design system** (`@myapp/ui`; see
  [`docs/design-system.md`](../../docs/design-system.md)). `src/app/globals.css` imports its
  stylesheet and makes the page full height; the app sets no colors, font sizes, radii or
  shadows of its own.
- **All data comes from the API, fetched in the browser**, through `src/lib/api.ts`. That
  file is the one place that knows the API's URL. Components that fetch are client
  components (`"use client"`).

## Config

| Variable              | Default                 | Notes                                    |
| --------------------- | ----------------------- | ---------------------------------------- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Inlined at build time; rebuild to change |

Copy `.env.example` to `.env.local` to override it. Never put a secret in a `NEXT_PUBLIC_*`
variable: it ends up in the shipped JavaScript.
