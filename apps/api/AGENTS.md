# apps/api

The myapp API: FastAPI 0.162 on Python 3.14 (uv-managed). All of myapp's business logic
and data access live here; every client (web, desktop, CLI/TUI, MCP) talks only to this
process. `src/api/mcp.py`'s one tool (`get_status`) is served over MCP at `/mcp`, mounted
straight into the FastAPI app, so a tool call runs the exact same code as `/health`.

## Commands (run from the repo root)

- `pnpm --filter api test` — `uv run pytest`. Needs the local database (`pnpm db:start`)
  for full coverage: without it, DB-dependent tests self-skip (`tests/support.py`'s
  `require_database`), which can trip the 99% floor silently. `pnpm verify` sets
  `MYAPP_REQUIRE_DB=1`, matching CI, so a skip there fails loudly instead.
- `pnpm --filter api lint` / `format` — ruff check / ruff format. No
  `pnpm --filter api build`; this app has none.
- `pnpm --filter api typecheck` — pyright (`extraPaths = ["tests"]` in `pyproject.toml`,
  since tests import `tests/support.py` as a bare `support` module).
- `pnpm dev:api` — `fastapi dev` with `CORS_ALLOW_LOCALHOST=true`; without it, the web dev
  server and `tauri dev` are refused (CORS defaults to only the packaged Tauri origins).

## Files to read first

- `src/api/main.py` — `create_app(settings)`: mounts `/mcp`, `UnhandledErrorMiddleware`
  (`problems.py`), `CorrelationIdMiddleware`, CORS, and the Scalar-powered `/docs` page
  (pinned script URL plus a Subresource Integrity hash, recomputed by hand when bumped).
- `src/api/settings.py` — `Settings` (pydantic-settings): `database_url` default is the
  local Supabase stack's `myapp_api` role; `cors_allow_localhost` is off unless set.
- `src/api/db.py` — `create_engine`/`database_ok`: the pool and the timeout-bounded health
  check `/health` and `get_status` both call.
- `src/api/mcp.py` — `build_mcp_server`: the only tool today, `get_status`.
- `docs/architecture.md` — API conventions (errors, CORS, versioning, the connection-pool
  budget) and what's still planned (auth, generated clients).

## Tests

This directory owns the API contract (root `CLAUDE.md`, "Tests") and proves it against
the real database where it matters (`test_health.py`'s `test_health_with_database`,
`test_mcp.py`'s `mcp_server` fixture, `test_db_pool.py`'s pool-exhaustion test) —
everything else (`test_cors.py`, `test_problems.py`, `test_request_id.py`) runs against
`tests/support.py`'s `IsolatedSettings` with no database involved at all. `fail_under = 99`
in `pyproject.toml`.

## Gotchas proven by the code and docs

- `[tool.coverage.report] fail_under` "just under today's number" by its own comment —
  raise it when coverage rises, never lower it to land a prune.
- `src/api/db.py`'s `except SQLAlchemyError, OSError, TimeoutError:` is Python 3.14's
  relaxed `except` grammar (parentheses optional around multiple types), not a stray
  Python 2 habit — don't "fix" it by adding parens.
- After changing a route or a request/response model, run `pnpm contract:generate` from
  the repo root and commit `openapi.json` (written by `scripts/export_openapi.py`) with
  it: `pnpm lint` and the pre-commit hook fail on a stale contract, and
  `packages/api-types` regenerates from it for TypeScript clients.
  `scripts/export_mcp_tools.py` and the committed `openapi.json` feed `apps/docs`'
  generated reference pages; don't hand-edit those pages.
- Never read `.env` / `.env.local` here. `.env.example` is safe to open and documents,
  per setting, which have no safe default versus a real local default.
