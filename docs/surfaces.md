---
title: Surfaces
description: Every way to use myapp -- the Skill, MCP, the CLI and the API.
---

Every way to use myapp is a thin layer over one HTTP API. Pick the one that fits who, or
what, is calling.

- **For AI agents:** [Skill](#skill), [MCP](#mcp)
- **For humans:** [CLI](#cli), [API](#api), plus the web and desktop apps

---

## For AI agents

### Skill

`skills/myapp/SKILL.md` is an [Agent Skill](https://agentskills.io). It teaches an agent to
use the `myapp` CLI: run `myapp status --json`, read the fields, never run bare `myapp`, and
check `--help` instead of guessing.

```bash
# Use it everywhere (Claude Code):
ln -s "$PWD/skills/myapp" ~/.claude/skills/myapp
# Validate after editing:
uvx --from skills-ref==0.1.1 agentskills validate skills/myapp
```

Trigger evals to run by hand: `skills/myapp/evals/triggers.md`.

### MCP

myapp's tool is defined once, in the API, and served over MCP (Streamable HTTP) at
`/mcp` -- hand-written and task-oriented, not generated one-per-endpoint:

| Tool         | Read-only | Returns                                                    |
| ------------ | --------- | ---------------------------------------------------------- |
| `get_status` | yes       | `api_url`, `status` (ok, degraded), `db` (ok, unavailable) |

A failed call (a database that's down) comes back as a tool error.

```bash
# Claude Code in this repo: already registered by .mcp.json (an HTTP server).
# Elsewhere, against a running API:
claude mcp add --transport http myapp http://localhost:8000/mcp
# Try it by hand:
npx @modelcontextprotocol/inspector
```

`myapp mcp` runs the same tool over stdio, for setups that can't reach the API's HTTP port
directly (Claude Desktop's `.mcpb` bundle, for one): it's a thin proxy to `/mcp`, with no
tool definitions of its own, pointed at the API URL the CLI already resolves (`--api-url`,
`MYAPP_API_URL`, a release's own API, then `http://localhost:8000`).

```bash
claude mcp add myapp -- uv run --project /path/to/myapp/apps/cli myapp mcp
npx @modelcontextprotocol/inspector uv run --project apps/cli myapp mcp
```

MCP OAuth (so Claude Code can sign in once to a deployed API) comes once the API has real
auth.

---

## For humans

### CLI

```bash
pnpm myapp status          # API status: ok (database ok) · http://localhost:8000
pnpm myapp status --json   # for scripts
pnpm myapp                 # interactive terminal UI (in a terminal)
uv tool install --editable apps/cli   # put `myapp` on your PATH
```

The API URL comes from `--api-url`, then `MYAPP_API_URL`, then the API a release was
built for, then `http://localhost:8000`. Releases attach the CLI, the MCP bundle for Claude
Desktop and the Agent Skill (see `docs/releasing.md`).
Exit codes are `0` for healthy or succeeded and `1` for not; Typer uses `2` for usage
errors.

### API

- Base URL: http://localhost:8000 in development.
- Reference: **`/docs`** (Scalar). Contract: **`/openapi.json`**.
- `/health` is unversioned. Resources live under `/v1`.
- Errors are RFC 9457 `application/problem+json` and include a `request_id`. Every response
  carries `X-Request-ID`.
- Browser clients need their origin allowed by CORS (see `docs/architecture.md`). Native
  clients need nothing.
- Auth (planned): bearer tokens. Supabase Auth for the apps, personal API keys for the CLI,
  MCP and scripts.

---

All four stay in step because they share one source of truth. The API's OpenAPI schema
defines what exists. The CLI uses one client (`apps/cli/src/myapp/client.py`); MCP tools
are defined once, in the API itself, and the CLI's stdio server only proxies them; the
Skill only points at the CLI. When the API gains a capability, add it to the client,
expose it as a CLI command and, where it's a task an agent would do, as an MCP tool in
`apps/api/src/api/mcp.py`. Then update the Skill and this page.
