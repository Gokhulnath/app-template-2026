<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- Below is outside the BEGIN/END markers -- `next dev` only ever rewrites the text
     between them, so this survives untouched. Don't nest content inside the markers. -->

# apps/web

The myapp web app: Next.js 16.4 (App Router, TypeScript, Tailwind CSS v4, Turbopack). It
is UI only; everything it shows comes from the myapp API. Also bundled by `apps/desktop`.

## Hard boundaries

- Static export (`output: "export"`): no server components that fetch data, no server
  actions, no route handlers. `next.config.ts` has no `rewrites`/`redirects` either.
- Every element comes from the design system (`@myapp/ui`); this app sets no colors, font
  sizes, radii or shadows of its own (`docs/design-system.md`).
- All data comes from the API, fetched in the browser through `src/lib/api.ts` — the one
  file that knows `NEXT_PUBLIC_API_URL`. Components that fetch are client components.

## Commands (from the repo root)

- `pnpm dev:web` — `http://localhost:3000` (or the next free port).
- `pnpm --filter web lint` / `typecheck` / `build` need no database. `typecheck` runs
  `next typegen && tsc --noEmit`.
- `pnpm --filter web preview` — serves the already-built `out/` with `serve`.
- No `pnpm --filter web test`: `package.json` has no `test` script, so root `pnpm test`
  skips this app. There's no suite here yet — see "Tests" below.

## Files to read first

- `src/lib/api.ts` — `API_URL` and `apiFetch`: the only place that knows the API's URL.
- `src/components/api-status.tsx` — `fetchStatus()`: calls `/health`, and treats a 503
  as "degraded", not an error, since the API can be up with its database down.
- `src/components/runtime-info.tsx` — `detectShell()`: tells Tauri apart from a plain
  browser, useful when a new shell gets "unreachable" from a missing CORS origin.
- `next.config.ts`'s `distDir` — a no-op unless `MYAPP_WEB_DIST_DIR` is set, used only by
  `packages/e2e`'s isolated build; never set by hand.

## Tests

No test suite in this app yet (no `test` script, no `vitest`/`jsdom` setup). The one
cross-surface proof that the built export actually reaches the API is
`packages/e2e`'s smoke spec, which drives a real browser against `api-status.tsx`'s own
rendered status (`docs/testing.md`). When this app grows real behavior worth a unit test
(a form, a fetch with error branches), test it here against a faked `fetch`, the way
`docs/design-system.md`'s "Tests" section already describes for `packages/ui` — never by
re-proving the API's own rules.

Read first: `docs/design-system.md`, `docs/architecture.md` ("Web app"), `docs/testing.md`.
