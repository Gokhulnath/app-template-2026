import pytest
from fastmcp import Client

from myapp.client import HealthReport
from myapp.mcp_server import build_server

API = "http://api.test"


async def healthy(api_url: str) -> HealthReport:
    return HealthReport(api_url, "ok", "ok")


@pytest.mark.anyio
async def test_get_status_tool_returns_the_health_report() -> None:
    async with Client(build_server(API, fetch=healthy)) as client:
        result = await client.call_tool("get_status", {})
    assert result.data == {"api_url": API, "status": "ok", "db": "ok"}


@pytest.mark.anyio
async def test_tools_are_listed_with_read_only_hints() -> None:
    async with Client(build_server(API, fetch=healthy)) as client:
        tools = {tool.name: tool for tool in await client.list_tools()}
    assert list(tools) == ["get_status"]
    annotations = tools["get_status"].annotations
    assert annotations is not None
    assert annotations.read_only_hint is True
