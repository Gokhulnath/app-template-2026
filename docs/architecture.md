# Architecture

## One backend, many thin clients

```
  web app        Next.js static export ───────────┐
  desktop app    Tauri, wraps the same export ────┤
  CLI / TUI      `myapp` (Python) ────────────────┤
  MCP server     `myapp mcp` (stdio) ─────────────┼── HTTP ──▶  API (FastAPI) ──▶ Postgres (Supabase)
  Agent Skill    SKILL.md, drives the CLI ────────┤
  iOS / Android  later ───────────────────────────┘
```

- **All business logic and all data access live in the API** (`apps/api`). Clients render,
  collect input and call the API. If two clients would need the same logic, it belongs in
  the API.
- **Clients never reach the database.** Not directly, and not through Supabase's
  auto-generated Data API, which stays disabled.
- **The OpenAPI schema (`/openapi.json`) is the contract.** Every client is written against
  it. Generated clients (TypeScript for web and desktop, Python for the CLI and MCP, Swift
  and Kotlin for mobile) come from it once there are a few real endpoints.

## Product surfaces

The docs navigation groups the ways to use myapp:

| For AI agents                            | For humans                                    |
| ---------------------------------------- | --------------------------------------------- |
| **Skill**: `skills/myapp/SKILL.md`       | **CLI**: `myapp` commands and a terminal UI   |
| **MCP**: `myapp mcp`, a stdio MCP server | **API**: HTTP + OpenAPI, reference at `/docs` |

The web and desktop apps are the visual clients. Layering: Skill → CLI → API, and
MCP → API. The CLI, the TUI and the MCP server share one HTTP client module.

## API conventions

- `/health` is unversioned. Resources live under `/v1`. A breaking change gets a new
  version, because mobile clients can't be force-updated.
- OpenAPI operation IDs are `<tag>-<function name>` (for example `health-get_health`). Every
  route has a tag; a test enforces it.
- Errors are RFC 9457 problem details (`application/problem+json`) with a `request_id`.
- Every response carries `X-Request-ID`. A valid incoming one is reused.
- **CORS is only for browser-based clients.** The web app and the Tauri webview send an
  `Origin`; the CLI, the MCP server and mobile apps don't.
  - Defaults: only the packaged Tauri origins (`tauri://localhost`, `http://tauri.localhost`).
    Localhost on any port is opt-in (`CORS_ALLOW_LOCALHOST=true`). `pnpm dev:api` turns it
    on, so a deployment that forgets the setting stays closed.
  - Production: add the web domain to `CORS_ORIGINS`, and leave localhost off.
  - `tauri dev` serves from `http://127.0.0.1:1430` and up. Only the packaged app uses
    `tauri://localhost`.
- **Auth (planned):**
  - Supabase Auth signs users in on the web, desktop and mobile apps, and FastAPI verifies
    the bearer token locally through the project's JWKS.
  - The CLI and the MCP server use personal API keys, which the API stores hashed.
  - No cookie sessions, since native clients can't use them.

## Web app

- A static export (`output: "export"`): plain files in `apps/web/out/`, served by any static
  host and bundled by the desktop shell. Export mode makes the build fail on server-only
  features, which keeps logic out of the web app.
- Data is fetched in the browser through `src/lib/api.ts`, the only file that knows the API
  URL (`NEXT_PUBLIC_API_URL`).
- `NEXT_PUBLIC_*` values are inlined at build time, so each environment and each desktop
  build is its own build. Never put a secret in one.

## Data (Supabase)

- Supabase Postgres is the only database, and the API is its only user. In development,
  the Supabase CLI runs the full stack locally in Docker. In production it's the cloud
  project.
- Schema changes are SQL migrations in `supabase/migrations/`, the only migration
  mechanism (no Alembic).
- Defense in depth beyond the disabled Data API:
  - app tables live in an `app` schema that the Data API never exposes
  - default grants on `public` are revoked from Supabase's `anon` and `authenticated`
    roles, and they get nothing on `app`
  - the API connects as a least-privilege `myapp_api` role
  - RLS is deliberately **off**: with no policies it would block `myapp_api` itself, which
    is a non-owner role
  - `anon` keeps `USAGE` on the (empty) `public` schema through the Postgres default grant
    to `PUBLIC`; revoking that would also affect Supabase's internal roles

## Secrets

- Doppler, in a personal workplace, holds real secrets. The CLI login is scoped to
  `~/Private`, so the employer workplace never applies here.
- One project, `myapp`, for every app. Variable names keep apps apart, and only
  `NEXT_PUBLIC_*` values ever reach the web bundle.
  - **`dev`**: local development; `doppler.yaml` binds `apps/api` and `apps/web` to it
  - **`prd`**: production, what `main` deploys; run it explicitly with
    `doppler run --config prd -- <cmd>`
  - **`stg`**: exists but stays empty until a staging deploy is needed
- `scripts/with-doppler.sh` injects secrets only when `doppler me` matches the workplace
  slug in `.doppler-workplace`. Otherwise it stops before running anything.
- Every app also runs without Doppler: committed `.env.example` files and code defaults hold
  safe local-development values.
- Nothing secret is ever committed, put in a `NEXT_PUBLIC_*` variable or pasted in chat.

| Key                    | `dev`                      | `prd`                                              |
| ---------------------- | -------------------------- | -------------------------------------------------- |
| `CORS_ALLOW_LOCALHOST` | `true`                     | `false`                                            |
| `CORS_ORIGINS`         | (default: Tauri origins)   | Tauri origins, plus the web domain once deployed   |
| `DATABASE_URL`         | local stack as `myapp_api` | **secret**: cloud direct connection as `myapp_api` |
| `NEXT_PUBLIC_API_URL`  | `http://localhost:8000`    | the production API URL, once deployed              |
| `SUPABASE_URL`         | `http://127.0.0.1:54321`   | `https://<project-ref>.supabase.co`                |

`SUPABASE_URL` isn't read by code yet. It's there for Supabase Auth.

## Status

| Piece                                                              | State                                                         |
| ------------------------------------------------------------------ | ------------------------------------------------------------- |
| API: health, CORS, problems, request IDs, docs                     | done                                                          |
| Web: static export, client-side fetch                              | done                                                          |
| Secrets: Doppler with `.env` fallback                              | done; Doppler projects wait on the owner's personal login     |
| Data: Supabase, migrations, lock-down                              | local stack done; cloud link/push waits on the owner          |
| CLI + TUI, MCP server, Agent Skill                                 | done (`apps/cli`, `skills/myapp`)                             |
| Desktop: Tauri                                                     | done (`apps/desktop`)                                         |
| Quality: Prettier, tsc/pyright, Lefthook, CI, Renovate             | done; Renovate acts only once its GitHub App is installed     |
| Template: `docs/template.md`, `scripts/rename-project.sh`          | done                                                          |
| Releases: release-please, desktop installers (macOS/Windows/Linux) | done; installers wait for a production API URL in Doppler prd |
| Auth, generated clients, mobile                                    | later, when a real feature needs them                         |
