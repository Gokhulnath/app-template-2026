<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- Below is outside the BEGIN/END markers -- `next dev` only ever rewrites the text
     between them, so this survives untouched. Don't nest content inside the markers. -->

# apps/docs

The myapp docs site: Next.js 16.4 (App Router), static export, built on
[Fumadocs](https://fumadocs.dev): **Use myapp**, **Build myapp**, a generated
**Reference**, and `/llms.txt` / `/llms-full.txt`. `README.md` has the fuller map.

## What this is, and what it must never do

- Static export only, like `apps/web`: no server components that fetch data, no server
  actions. `app/api/search/route.ts` looks like a route handler but isn't one at
  runtime — `createFromSource(...).staticGET` plus `revalidate = false` makes
  `next build` prerender it to a fixed JSON file; `components/search.tsx` reads it
  through `useStaticSearch()`, never a live fetch.
- Never hand-edit `content/docs/reference/**` or `.generated/openapi.json`: both are
  gitignored and rewritten by `pnpm generate` on every `dev`/`build`. Fix the matching
  `scripts/generate-*.mts` instead. `.generated/openapi.json` is just a copy of the
  committed `apps/api/openapi.json` (docs/architecture.md); this app never regenerates
  the schema itself.
- `content/docs/build` symlinks to the repo's own `docs/*.md` — editing those files _is_
  editing "Build myapp". `docs/meta.json` titles and orders the section.
- Depends on `@myapp/tokens` directly, not `@myapp/ui` (Fumadocs' own components replace
  it here; token mapping in `app/global.css`, see `docs/design-system.md`). Don't add
  `@myapp/ui` to this app.

## Commands (run from the repo root)

- `pnpm dev:docs` — dev server; chains `pnpm generate` first.
- `pnpm --filter docs build` — static export to `out/`; also chains `generate` first.
- `pnpm --filter docs generate` (or `generate:openapi` / `generate:cli` / `generate:mcp`)
  — rebuild `content/docs/reference/**` from the live code.
- `pnpm --filter docs lint`, `pnpm --filter docs typecheck` (`typecheck` runs
  `next typegen` first, since `page.tsx`'s generated page props depend on it).
- `pnpm --filter docs preview` — serves the already-built `out/`.

None need a database. `generate-openapi.mts` only reads the committed `apps/api/
openapi.json` (run `pnpm contract:generate` from the repo root first if an API route or
model just changed); `generate-cli.mts` and `generate-mcp.mts` still shell into
`apps/cli`'s and `apps/api`'s own code (`uv run typer myapp.cli utils docs`, `uv run
python scripts/export_mcp_tools.py`) — those apps' `uv` environments must be installed
(`pnpm install` does this).

## Files an agent most needs

- `lib/source.ts` — the one Fumadocs MDX collection; `dir` reaches outside this app on
  purpose, since "Build myapp" pages are `docs/*.md` itself.
- `lib/openapi.ts` and `scripts/generate-{openapi,cli,mcp}.mts` — the only things that
  should ever write into `content/docs/reference/`.
- `content/docs/meta.json` and each section's `meta.json` — page order and titles; a new
  page's slug has to be added here or it won't show in the sidebar.

## Tests

No test suite — `package.json` has no `test` script, so root `pnpm test` skips it.
Verify with `pnpm --filter docs generate && pnpm --filter docs build`, `lint`,
`typecheck`, plus a manual browser check of rendering, links and search.
