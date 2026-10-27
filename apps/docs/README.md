# docs

The myapp docs site: Next.js 16.4 (App Router, static export) with
[Fumadocs](https://fumadocs.dev). Two halves -- **Use myapp** (the web and desktop apps,
the CLI and TUI, MCP from Claude Code, the Agent Skill) and **Build myapp** (how the repo
works) -- plus a reference generated from the code itself, and
`llms.txt`/`llms-full.txt` for agents.

Next.js 16.4 has changed a lot. Read [`AGENTS.md`](AGENTS.md) and the guides bundled in
`node_modules/next/dist/docs/` before writing Next.js code.

## Run

From the repo root:

```bash
pnpm dev:docs   # http://localhost:3000 (or the next free port)
```

Or from this folder: `pnpm dev`, `pnpm build` (static export in `out/`),
`pnpm preview` (serves `out/`), `pnpm lint`.

## How it works

- **Static export** (`output: "export"`), same as `apps/web`: plain HTML/JS in `out/`, no
  Next.js server. Search runs against a prebuilt index (`useStaticSearch()`,
  `app/api/search/route.ts`'s `staticGET`) rather than a live API route.
- **"Build myapp" pages aren't copies.** `content/docs/build` symlinks straight to the
  repository's own `docs/` folder (`docs/*.md`); editing those files is editing the pages.
  `docs/meta.json` titles and orders the section. The only changes made to those files for
  this site are frontmatter (`title`/`description`) and fixing a couple of relative links --
  see `docs/setup-log.md`.
- **Reference pages are generated, never hand-written**, by `pnpm generate` (chained before
  `dev`/`build`): `scripts/generate-openapi.mts` calls `apps/api`'s `create_app().openapi()`
  directly (no running API or database) and feeds it to `fumadocs-openapi`;
  `scripts/generate-cli.mts` runs Typer's own `utils docs` against `apps/cli`'s app;
  `scripts/generate-mcp.mts` builds `apps/api`'s MCP server and lists its tool. All three
  write into `content/docs/reference/`, which is gitignored -- nothing there is committed,
  so it can never drift from the code. Today that's one API operation (`/health`) and one
  MCP tool (`get_status`); both reference pages grow the moment the API does.
- **Every color, font and radius comes from `@myapp/tokens`** (`app/global.css`), mapped
  onto Fumadocs UI's own theme variables; see `docs/design-system.md`. Two gaps: the dialog
  overlay tint and the "idea" callout color have no myapp equivalent, so they keep
  Fumadocs' own default.

## Pages

- **`/docs`**: the landing page, and the two sections' own overviews.
- **`/docs/reference/api`**, **`/docs/reference/cli`**, **`/docs/reference/mcp-tools`**:
  generated (see above).
- **`/llms.txt`**, **`/llms-full.txt`**: the same content as plain text, for agents.
