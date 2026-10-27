# api

The myapp API: FastAPI 0.162 on Python 3.14 (GIL build), managed with uv. All of myapp's
business logic and data access live here. Every client talks to this API.

## Layout

```
pyproject.toml      # deps; [tool.fastapi] entrypoint = "api.main:app"
.python-version     # 3.14+gil: keeps uv off the free-threaded 3.14t build
src/api/main.py     # the FastAPI app
tests/              # pytest, using FastAPI's TestClient
```

## Run

```bash
uv sync               # create .venv and install deps
CORS_ALLOW_LOCALHOST=true uv run fastapi dev   # http://127.0.0.1:8000, reloads; docs at /docs
uv run pytest
uv run ruff check && uv run ruff format --check
```

From the repo root, `pnpm dev:api` does the same and sets `CORS_ALLOW_LOCALHOST=true` for
you. Without it, browser clients on localhost (the web dev server, `tauri dev`) are refused.

## MCP (`/mcp`)

myapp's tool (`get_status`) is defined in `src/api/mcp.py` and served over MCP (Streamable
HTTP) at `/mcp`, mounted into the FastAPI app in `create_app` (`src/api/main.py`). It
checks the database directly, the same way `/health` does.

```bash
claude mcp add --transport http myapp http://localhost:8000/mcp
```

The CLI's stdio server (`apps/cli`, `myapp mcp`) is a thin proxy to this endpoint; see
`apps/cli/README.md` and `docs/surfaces.md`.

## Dependencies

```bash
uv add <package>          # runtime dependency
uv add --dev <package>    # dev-only (dependency group "dev")
```

Never use `pip install`. uv keeps `uv.lock` in sync, and the lockfile is committed.
