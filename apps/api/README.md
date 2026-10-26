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

## Dependencies

```bash
uv add <package>          # runtime dependency
uv add --dev <package>    # dev-only (dependency group "dev")
```

Never use `pip install`. uv keeps `uv.lock` in sync, and the lockfile is committed.
