"""myapp's own job here: proxy every tool call to the API's MCP server (apps/api/src/
api/mcp.py owns the tool itself, its validation and its errors -- see its own tests). A
real in-process FastMCP server, on a real local port, stands in for the API, since
`myapp mcp` always speaks real Streamable HTTP to whatever API URL it's given."""

from collections.abc import AsyncGenerator

import pytest
from fastmcp import Client, FastMCP
from fastmcp.utilities.http import find_available_port
from fastmcp.utilities.tests import run_server_async

from myapp.mcp_server import build_server


def fake_api() -> FastMCP:
    """A tiny upstream MCP server standing in for api.mcp: one tool, so a proxy test only
    has to prove a call is forwarded and its result relayed back, not re-prove api.mcp's
    own tool contract (apps/api/tests/test_mcp.py does that)."""
    mcp = FastMCP("myapp")

    @mcp.tool
    async def echo(message: str) -> str:
        """Echo message back, so a test can tell a call reached this upstream."""
        return message

    return mcp


@pytest.fixture
async def api_url() -> AsyncGenerator[str]:
    # run_server_async's own path argument becomes part of the yielded URL
    # ("http://host:port/mcp"); build_server appends "/mcp" itself, exactly as it does for
    # a real API URL, so the fixture hands back the URL without it.
    async with run_server_async(fake_api(), path="/mcp") as url:
        yield url.removesuffix("/mcp")


@pytest.mark.anyio
async def test_lists_and_calls_a_tool_from_the_upstream_api(api_url: str) -> None:
    async with Client(build_server(api_url)) as client:
        tools = {tool.name for tool in await client.list_tools()}
        assert tools == {"echo"}

        result = await client.call_tool("echo", {"message": "hello from the API"})
    assert result.data == "hello from the API"


@pytest.mark.anyio
async def test_unreachable_api_is_a_clear_error_not_a_crash() -> None:
    # Nothing is listening on this port -- a closed connection, not a slow one, so the
    # test doesn't wait out a timeout.
    unreachable = f"http://127.0.0.1:{find_available_port()}"
    async with Client(build_server(unreachable)) as client:
        with pytest.raises(Exception, match="(?i)failed to connect"):
            await client.list_tools()
