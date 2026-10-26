# cli

`myapp` from the terminal: commands for humans and scripts, a terminal UI, and (in later
steps) an MCP server for AI agents. All of it is a thin layer over the myapp API. The
shared HTTP client is `src/myapp/client.py`.

## Run

From the repo root:

```bash
pnpm myapp status          # API status: ok (database ok) · http://localhost:8000
pnpm myapp status --json   # {"api_url": ..., "status": "ok", "db": "ok"}
pnpm myapp --help
pnpm myapp                 # in a terminal: opens the TUI (same card as the web app)
pnpm myapp tui             # opens the TUI explicitly
```

In the TUI, `r` or **Check again** re-checks, `q` quits and `Ctrl+P` opens the command
palette. Bare `myapp` opens the TUI only when stdin and stdout are a terminal; in scripts,
pipes and agent shells it prints help instead of waiting on a UI nobody can see.

From this folder: `uv run myapp status`. To put `myapp` on your `PATH`:
`uv tool install --editable apps/cli` (run from the repo root).

## MCP server (for AI agents)

`myapp mcp` runs an MCP server over stdio. Its tools are hand-written per task (today
`get_status`, read-only), not generated one-per-endpoint.

```bash
# Claude Code: the repo's .mcp.json registers it for sessions opened in this repo.
# Anywhere else:
claude mcp add myapp -- uv run --project /path/to/myapp/apps/cli myapp mcp
# Inspect it by hand:
npx @modelcontextprotocol/inspector uv run --project apps/cli myapp mcp
```

`MYAPP_API_URL` (or `--api-url` before `mcp`) points it at another API.

## Conventions

| Thing      | Rule                                                                         |
| ---------- | ---------------------------------------------------------------------------- |
| API URL    | `--api-url` flag, then `MYAPP_API_URL`, then `http://localhost:8000`         |
| Output     | human-readable by default; `--json` for scripts and agents                   |
| Exit codes | `0` healthy or succeeded, `1` not healthy or failed, `2` usage error (Typer) |
| Logic      | none here: every command calls the API through `myapp.client`                |

## Develop

```bash
uv run pytest
uv run ruff check && uv run ruff format --check
```
