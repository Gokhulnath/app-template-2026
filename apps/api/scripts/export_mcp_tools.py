"""Print myapp's MCP tool definitions as JSON, for apps/docs's reference generator
(scripts/generate-mcp.mts). Builds the MCP server directly rather than calling it over
HTTP: the engine it takes never opens a database connection on its own (SQLAlchemy
connects lazily, and listing tools never runs a query), so this needs neither a running
API nor a database, including in CI.
"""

import asyncio
import json
import sys

from api.db import create_engine
from api.mcp import build_mcp_server


async def export_tools() -> list[dict[str, object]]:
    # A placeholder URL: list_tools() never connects, so this never resolves a real host.
    engine = create_engine(
        "postgresql+asyncpg://unused:unused@localhost/unused",
        connect_timeout=1,
        pool_size=1,
        max_overflow=0,
        pool_timeout=1,
    )
    try:
        mcp = build_mcp_server(engine, db_health_timeout=1)
        tools = await mcp.list_tools()
        return [
            {
                "name": tool.name,
                "description": tool.description or "",
                "input_schema": tool.parameters,
                "annotations": (
                    tool.annotations.model_dump(exclude_none=True)
                    if tool.annotations
                    else {}
                ),
            }
            for tool in tools
        ]
    finally:
        await engine.dispose()


def main() -> None:
    json.dump(asyncio.run(export_tools()), sys.stdout)


if __name__ == "__main__":
    main()
