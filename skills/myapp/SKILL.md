---
name: myapp
description: Check whether the myapp backend (its API and database) is healthy, and use myapp from the command line through the `myapp` CLI. Use when the user asks about myapp's status or health, whether the myapp API or its database is up, or wants to do something with myapp from a terminal or an agent session.
---

# myapp

myapp is one backend, an HTTP API, shared by every client: the web and desktop apps, the
`myapp` CLI and the myapp MCP server. All logic lives in the API, and the CLI is a thin
client over it. Report what the CLI returns. Never guess at myapp's behavior.

## Check status

```bash
myapp status --json
```

It prints one JSON object and exits `0` when healthy, `1` otherwise:

| Field     | Values                                                           |
| --------- | ---------------------------------------------------------------- |
| `status`  | `ok`, `degraded` (API up, database down), `error`, `unreachable` |
| `db`      | `ok`, `unavailable`, or `null` when the API didn't answer        |
| `api_url` | the API that was checked                                         |

Tell the user in plain words, for example "The myapp API is up, but its database is
unavailable."

## Point at another API

```bash
myapp --api-url https://api.example.com status --json   # or set MYAPP_API_URL
```

## Rules

- Always pass a subcommand. Bare `myapp` opens an interactive UI in a terminal and only
  prints help elsewhere, so never use it from an agent.
- Use `--json` and read the fields rather than parsing prose.
- Don't invent commands. Run `myapp --help` or `myapp <command> --help` to see what exists.
  Today that's `status`, `tui` and `mcp`.
- If the myapp MCP server is connected, its `get_status` tool returns the same data. Either
  is fine.

## If `myapp` isn't installed

From a myapp checkout, install it with `uv tool install --editable apps/cli`, or run it
without installing: `uv run --project apps/cli myapp status --json`.
