# Using donna

Every way to use donna is a thin layer over one HTTP API. Pick the one that fits who, or
what, is calling.

- **For AI agents:** [Skill](#skill), [MCP](#mcp)
- **For humans:** [CLI](#cli), [API](#api), plus the web and desktop apps

---

## For AI agents

### Skill

`skills/donna/SKILL.md` is an [Agent Skill](https://agentskills.io). It teaches an agent to
use the `donna` CLI: run `donna status --json`, read the fields, never run bare `donna`, and
check `--help` instead of guessing.

```bash
# Use it everywhere (Claude Code):
ln -s "$PWD/skills/donna" ~/.claude/skills/donna
# Validate after editing:
uvx --from skills-ref==0.1.1 agentskills validate skills/donna
```

Trigger evals to run by hand: `skills/donna/evals/triggers.md`.

### MCP

`donna mcp` runs a stdio MCP server with hand-written, task-oriented tools:

| Tool         | Read-only | Returns                                                      |
| ------------ | --------- | ------------------------------------------------------------ |
| `get_status` | yes       | `api_url`, `status` (ok, degraded, error, unreachable), `db` |

```bash
# Claude Code in this repo: already registered by .mcp.json.
# Elsewhere:
claude mcp add donna -- uv run --project /path/to/donna/apps/cli donna mcp
# Try it by hand:
npx @modelcontextprotocol/inspector uv run --project apps/cli donna mcp
```

A remote MCP endpoint (Streamable HTTP at `/mcp`, with OAuth) comes once the API has real
auth.

---

## For humans

### CLI

```bash
pnpm donna status          # API status: ok (database ok) · http://localhost:8000
pnpm donna status --json   # for scripts
pnpm donna                 # interactive terminal UI (in a terminal)
uv tool install --editable apps/cli   # put `donna` on your PATH
```

The API URL comes from `--api-url`, then `DONNA_API_URL`, then `http://localhost:8000`.
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
defines what exists. The CLI and MCP server use one client (`apps/cli/src/donna/client.py`),
and the Skill only points at the CLI. When the API gains a capability, add it to the client,
expose it as a CLI command and, where it's a task an agent would do, as an MCP tool. Then
update the Skill and this page.
