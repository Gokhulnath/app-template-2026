---
name: donna
description: Check whether the donna backend (its API and database) is healthy, and use donna from the command line through the `donna` CLI. Use when the user asks about donna's status or health, whether the donna API or its database is up, or wants to do something with donna from a terminal or an agent session.
---

# donna

donna is one backend, an HTTP API, shared by every client: the web and desktop apps, the
`donna` CLI and the donna MCP server. All logic lives in the API, and the CLI is a thin
client over it. Report what the CLI returns. Never guess at donna's behavior.

## Check status

```bash
donna status --json
```

It prints one JSON object and exits `0` when healthy, `1` otherwise:

| Field     | Values                                                           |
| --------- | ---------------------------------------------------------------- |
| `status`  | `ok`, `degraded` (API up, database down), `error`, `unreachable` |
| `db`      | `ok`, `unavailable`, or `null` when the API didn't answer        |
| `api_url` | the API that was checked                                         |

Tell the user in plain words, for example "The donna API is up, but its database is
unavailable."

## Point at another API

```bash
donna --api-url https://api.example.com status --json   # or set DONNA_API_URL
```

## Rules

- Always pass a subcommand. Bare `donna` opens an interactive UI in a terminal and only
  prints help elsewhere, so never use it from an agent.
- Use `--json` and read the fields rather than parsing prose.
- Don't invent commands. Run `donna --help` or `donna <command> --help` to see what exists.
  Today that's `status`, `tui` and `mcp`.
- If the donna MCP server is connected, its `get_status` tool returns the same data. Either
  is fine.

## If `donna` isn't installed

From a donna checkout, install it with `uv tool install --editable apps/cli`, or run it
without installing: `uv run --project apps/cli donna status --json`.
