# myapp

One FastAPI backend, many thin clients: a web app, a desktop app, a CLI, an MCP server and
an Agent Skill, with iOS and Android to come. All logic and data live in the API. See
[`docs/architecture.md`](docs/architecture.md).

| Path           | What                                 | Stack                                                    | Dev URL                                      |
| -------------- | ------------------------------------ | -------------------------------------------------------- | -------------------------------------------- |
| `apps/web`     | Web app (UI only)                    | Next.js 16.4 static export · React 19.3 · Tailwind CSS 4 | http://localhost:3000                        |
| `apps/api`     | API: all logic and data              | FastAPI 0.162 · Python 3.14 · uv                         | http://localhost:8000 (reference at `/docs`) |
| `apps/desktop` | Desktop app (wraps the web export)   | Tauri 2.12 · Rust                                        | `pnpm dev:desktop`                           |
| `apps/cli`     | `myapp` CLI, TUI and MCP server      | Typer · Textual · FastMCP · Python 3.14 · uv             | `pnpm myapp`                                 |
| `supabase/`    | Database: migrations and local stack | Supabase CLI 2.122 · Postgres 17                         | `pnpm db:start`                              |
| `skills/myapp` | Agent Skill                          | Agent Skills (`SKILL.md`)                                | —                                            |

## Prerequisites

Node.js ≥ 24 (built with 26.7), pnpm 11.7 (the root `packageManager` field pins it),
uv ≥ 0.12 (it installs Python 3.14 if needed), and Docker for the local database.
Doppler is optional (see `docs/architecture.md`).

## Quickstart

```bash
pnpm install    # JS deps for every app, plus `uv sync` for the Python apps
pnpm db:start   # local Supabase stack in Docker (first run pulls images)
pnpm dev        # web and API together, output prefixed per app
```

Open http://localhost:3000. The page shows **API status: ok** once the browser can reach the
API.

## Root scripts

| Command                                                | Runs                                                                          |
| ------------------------------------------------------ | ----------------------------------------------------------------------------- |
| `pnpm dev`                                             | every app's dev server, in parallel                                           |
| `pnpm dev:web`                                         | Next.js dev server                                                            |
| `pnpm dev:api`                                         | `fastapi dev` (port 8000; override with `--port`)                             |
| `pnpm dev:desktop` / `build:desktop`                   | the Tauri desktop app (needs Rust)                                            |
| `pnpm build`                                           | static export of the web app into `apps/web/out/`                             |
| `pnpm lint`                                            | Prettier check, ESLint (web), `ruff check` + `ruff format --check` (api, cli) |
| `pnpm typecheck`                                       | `tsc` (web), pyright (api, cli)                                               |
| `pnpm format`                                          | Prettier, plus ruff fix and format                                            |
| `pnpm test`                                            | pytest (api, cli)                                                             |
| `pnpm myapp …`                                         | the `myapp` CLI, e.g. `pnpm myapp status`                                     |
| `pnpm db:start` / `db:stop` / `db:reset` / `db:status` | local Supabase stack                                                          |
| `pnpm db:migration <name>`                             | new SQL migration in `supabase/migrations/`                                   |

## Docs

- [`docs/surfaces.md`](docs/surfaces.md): using myapp. For AI agents: Skill, MCP. For
  humans: CLI, API.
- [`docs/architecture.md`](docs/architecture.md): how the pieces fit, and the rules they
  follow.
- [`docs/setup-log.md`](docs/setup-log.md): every structural step taken to build this repo,
  with exact commands. Small doc-only commits don't get their own entry.
- [`docs/releasing.md`](docs/releasing.md): versions, release notes, tags and desktop
  downloads.
- [`docs/template.md`](docs/template.md): start a new project from the
  [`app-template-2026`](https://github.com/Gokhulnath/app-template-2026) template repo
  (`scripts/rename-project.sh <name>`).
- Per-app details: [`apps/web`](apps/web/README.md), [`apps/api`](apps/api/README.md),
  [`apps/cli`](apps/cli/README.md), [`apps/desktop`](apps/desktop/README.md).
