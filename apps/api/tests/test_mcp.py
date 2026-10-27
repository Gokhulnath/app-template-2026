"""The MCP tool contract (api.mcp): get_status, checking the real database directly. One
test also proves the server mounted at /mcp with a working lifespan, over real HTTP
framing (no sockets)."""

from collections.abc import AsyncIterator
from typing import Any

import httpx2
import pytest
from fastapi.testclient import TestClient
from fastmcp import Client, FastMCP
from fastmcp.client.transports import StreamableHttpTransport
from fastmcp.utilities.asgi_transport import StreamingASGITransport, run_asgi_lifespan
from support import database_settings, require_database
from test_health import UNREACHABLE_DB

from api.db import create_engine
from api.main import create_app
from api.mcp import build_mcp_server


@pytest.fixture
async def mcp_server(client: TestClient) -> AsyncIterator[FastMCP]:
    """A server built the same way api.main.create_app does, against the same real
    database the REST tests use -- skipped when it isn't running (see require_database)."""
    require_database(client)
    settings = database_settings()
    engine = create_engine(
        settings.database_url,
        connect_timeout=settings.db_health_timeout,
        pool_size=settings.db_pool_size,
        max_overflow=settings.db_max_overflow,
        pool_timeout=settings.db_pool_timeout,
    )
    try:
        yield build_mcp_server(engine, db_health_timeout=settings.db_health_timeout)
    finally:
        await engine.dispose()


@pytest.mark.anyio
async def test_tools_are_listed_with_the_same_name_and_hints_as_before(
    mcp_server: FastMCP,
) -> None:
    async with Client(mcp_server) as client:
        tools = {tool.name: tool for tool in await client.list_tools()}
    assert list(tools) == ["get_status"]
    hints = tools["get_status"].annotations
    assert hints is not None
    assert hints.read_only_hint is True
    assert hints.open_world_hint is False


@pytest.mark.anyio
async def test_get_status_reports_the_real_database(mcp_server: FastMCP) -> None:
    async with Client(mcp_server) as client:
        result = await client.call_tool("get_status", {})
    # No HTTP request behind an in-memory Client, so there's no URL to report.
    assert result.data == {"api_url": None, "status": "ok", "db": "ok"}


@pytest.mark.anyio
async def test_database_down_is_degraded_not_a_crash() -> None:
    engine = create_engine(
        UNREACHABLE_DB,
        connect_timeout=1,
        pool_size=1,
        max_overflow=0,
        pool_timeout=1,
    )
    try:
        mcp_server = build_mcp_server(engine, db_health_timeout=1)
        async with Client(mcp_server) as client:
            result = await client.call_tool("get_status", {})
        assert result.data == {
            "api_url": None,
            "status": "degraded",
            "db": "unavailable",
        }
    finally:
        await engine.dispose()


@pytest.mark.anyio
async def test_mounted_at_mcp_over_http_with_a_working_lifespan(
    client: TestClient,
) -> None:
    """Proves the server mounted in api.main.create_app actually serves get_status at
    /mcp, and that the combined lifespan (api.main.create_app's own plus FastMCP's)
    starts and stops cleanly -- the real failure mode this guards against is the session
    manager's task group never being started, which raises on the first request (see
    fastmcp.server.http's own error message for that)."""
    require_database(client)
    app = create_app(database_settings())

    async with run_asgi_lifespan(app):

        def http_client(
            headers: dict[str, str] | None = None,
            timeout: httpx2.Timeout | None = None,
            auth: httpx2.Auth | None = None,
            **kwargs: Any,
        ) -> httpx2.AsyncClient:
            return httpx2.AsyncClient(
                transport=StreamingASGITransport(app),
                headers=headers,
                timeout=timeout,
                auth=auth,
                **kwargs,
            )

        transport = StreamableHttpTransport(
            "http://test/mcp", httpx_client_factory=http_client
        )
        async with Client(transport) as mcp_client:
            tools = {tool.name for tool in await mcp_client.list_tools()}
            assert tools == {"get_status"}

            status = await mcp_client.call_tool("get_status", {})
            assert status.data["status"] == "ok"
            # Reached over HTTP this time, so the tool can report its own URL.
            assert status.data["api_url"] == "http://test"
