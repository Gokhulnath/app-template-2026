"""myapp's MCP server: a stdio proxy to the API's own MCP server at <api_url>/mcp.

Tools are defined once, in the API (apps/api/src/api/mcp.py): their names, descriptions,
parameters, annotations and validation live there. This file has none of its own -- it
just forwards every list/call to the API over Streamable HTTP, so `myapp mcp` and the
.mcpb bundle keep working for local setups without a second copy of the tools, and Claude
Code can also reach the same tools directly (docs/surfaces.md).
"""

from fastmcp import FastMCP
from fastmcp.server import create_proxy


def build_server(api_url: str) -> FastMCP:
    """A FastMCP server named "myapp" that proxies every tool call to f"{api_url}/mcp".

    The connection is made lazily, on first use (listing tools, or calling one) -- not
    here -- so a down or unreachable API surfaces as a clear MCP error to whatever called
    it, rather than stopping `myapp mcp` from starting. provider_error_strategy="raise"
    is what makes that an error instead of the default "warn", which logs and reports no
    tools at all -- the wrong answer when there's only ever one provider: the API itself.
    """
    return create_proxy(
        f"{api_url.rstrip('/')}/mcp", name="myapp", provider_error_strategy="raise"
    )
