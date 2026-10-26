"""donna's MCP server: hand-written, task-oriented tools for AI agents.

Every tool calls the donna API through the shared client. There's no logic here, and tools
are designed per task rather than generated one-per-endpoint.
"""

from dataclasses import asdict

from fastmcp import FastMCP
from mcp.types import ToolAnnotations

from donna.client import Fetch, fetch_health

INSTRUCTIONS = (
    "Tools for donna. Each tool calls the donna API and returns its answer as data. "
    "Call get_status first to check that the API and its database are up."
)


def build_server(api_url: str, fetch: Fetch = fetch_health) -> FastMCP:
    mcp = FastMCP("donna", instructions=INSTRUCTIONS)

    @mcp.tool(annotations=ToolAnnotations(read_only_hint=True, open_world_hint=False))
    async def get_status() -> dict[str, str | None]:
        """Check whether the donna API and its database are up.

        Returns api_url, status ("ok", "degraded", "error" or "unreachable") and db
        ("ok", "unavailable", or null when the API didn't answer).
        """
        return asdict(await fetch(api_url))

    return mcp
