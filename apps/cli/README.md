# cli

`donna` from the terminal: commands for humans and scripts, a terminal UI, and (in later
steps) an MCP server for AI agents. All of it is a thin layer over the donna API. The
shared HTTP client is `src/donna/client.py`.

## Run

From the repo root:

```bash
pnpm donna status          # API status: ok (database ok) · http://localhost:8000
pnpm donna status --json   # {"api_url": ..., "status": "ok", "db": "ok"}
pnpm donna --help
pnpm donna                 # in a terminal: opens the TUI (same card as the web app)
pnpm donna tui             # opens the TUI explicitly
```

In the TUI, `r` or **Check again** re-checks, `q` quits and `Ctrl+P` opens the command
palette. Bare `donna` opens the TUI only when stdin and stdout are a terminal; in scripts,
pipes and agent shells it prints help instead of waiting on a UI nobody can see.

From this folder: `uv run donna status`. To put `donna` on your `PATH`:
`uv tool install --editable apps/cli` (run from the repo root).

## MCP server (for AI agents)

`donna mcp` runs an MCP server over stdio. Its tools are hand-written per task (today
`get_status`, read-only), not generated one-per-endpoint.

```bash
# Claude Code: the repo's .mcp.json registers it for sessions opened in this repo.
# Anywhere else:
claude mcp add donna -- uv run --project /path/to/donna/apps/cli donna mcp
# Inspect it by hand:
npx @modelcontextprotocol/inspector uv run --project apps/cli donna mcp
```

`DONNA_API_URL` (or `--api-url` before `mcp`) points it at another API.

## Conventions

| Thing      | Rule                                                                         |
| ---------- | ---------------------------------------------------------------------------- |
| API URL    | `--api-url` flag, then `DONNA_API_URL`, then `http://localhost:8000`         |
| Output     | human-readable by default; `--json` for scripts and agents                   |
| Exit codes | `0` healthy or succeeded, `1` not healthy or failed, `2` usage error (Typer) |
| Logic      | none here: every command calls the API through `donna.client`                |

## Develop

```bash
uv run pytest
uv run ruff check && uv run ruff format --check
```
