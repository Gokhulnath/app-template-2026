"""myapp's MCP server: the same tool the CLI has always had for AI agents, now defined
once, here, and served over MCP (Streamable HTTP) at /mcp -- mounted straight into the
FastAPI app by api.main.create_app. It IS the API now, so it checks the database directly
rather than calling the REST route over HTTP.

Claude Code and any other MCP client reach this tool directly
(`claude mcp add --transport http myapp <api>/mcp`); the CLI's stdio server
(apps/cli/src/myapp/mcp_server.py) is a thin proxy to this one, so there is no second copy
of the tool.
"""

from fastmcp import FastMCP
from fastmcp.server.dependencies import get_http_request
from mcp.types import ToolAnnotations
from sqlalchemy.ext.asyncio import AsyncEngine

from api.db import database_ok

INSTRUCTIONS = (
    "Tools for myapp. This server is the myapp API itself, so get_status reads the "
    "database directly. Call it first to check that the API and its database are up."
)


def _self_url() -> str | None:
    # None outside an HTTP request -- a direct fastmcp.Client(mcp_server) in tests, or
    # stdio through the CLI's proxy -- never a problem, since this field is informational
    # for a human reading a direct tool call's result.
    try:
        request = get_http_request()
    except RuntimeError:
        return None
    return str(request.base_url).rstrip("/")


def build_mcp_server(engine: AsyncEngine, *, db_health_timeout: float) -> FastMCP:
    mcp = FastMCP("myapp", instructions=INSTRUCTIONS)

    @mcp.tool(annotations=ToolAnnotations(read_only_hint=True, open_world_hint=False))
    async def get_status() -> dict[str, str | None]:
        """Check whether the myapp API and its database are up.

        Returns api_url (this server's own URL, when the call arrived over HTTP, else
        null), status ("ok" or "degraded") and db ("ok" or "unavailable").
        """
        ok = await database_ok(engine, db_health_timeout)
        return {
            "api_url": _self_url(),
            "status": "ok" if ok else "degraded",
            "db": "ok" if ok else "unavailable",
        }

    return mcp
