import os
import socket
import time
from collections.abc import Iterator

import pytest
from fastapi.routing import APIRoute
from fastapi.testclient import TestClient
from support import IsolatedSettings

from api.main import SCALAR_JS_SRI, SCALAR_JS_URL, app, create_app

UNREACHABLE_DB = "postgresql+asyncpg://donna_api:unused@127.0.0.1:1/postgres"


def test_health_with_database(client: TestClient) -> None:
    response = client.get("/health")
    if response.status_code == 503 and not os.environ.get("DONNA_REQUIRE_DB"):
        pytest.skip("local database not running; start it with `pnpm db:start`")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "db": "ok"}


def test_health_without_database() -> None:
    settings = IsolatedSettings(database_url=UNREACHABLE_DB, db_health_timeout=1)
    with TestClient(create_app(settings)) as client:
        response = client.get("/health")
    assert response.status_code == 503
    assert response.json() == {"status": "degraded", "db": "unavailable"}


@pytest.fixture
def silent_server() -> Iterator[int]:
    # Accepts TCP connections and never answers, like a database that has hung.
    with socket.socket() as server:
        server.bind(("127.0.0.1", 0))
        server.listen()
        yield server.getsockname()[1]


def test_health_does_not_hang_on_an_unresponsive_database(silent_server: int) -> None:
    url = f"postgresql+asyncpg://donna_api:unused@127.0.0.1:{silent_server}/postgres"
    settings = IsolatedSettings(database_url=url, db_health_timeout=1)
    with TestClient(create_app(settings)) as client:  # startup warm-up also times out
        started = time.monotonic()
        response = client.get("/health")
    assert response.status_code == 503
    assert time.monotonic() - started < 4


def test_every_route_is_tagged() -> None:
    # Untagged routes fall back to bare operationIds, which makes generated clients uneven.
    untagged = [
        r.path
        for r in app.routes
        if isinstance(r, APIRoute) and r.include_in_schema and not r.tags
    ]
    assert untagged == []


def test_operation_ids_are_clean() -> None:
    schema = TestClient(app).get("/openapi.json").json()
    assert schema["paths"]["/health"]["get"]["operationId"] == "health-get_health"


def test_docs_page_uses_scalar_without_telemetry() -> None:
    client = TestClient(app)
    response = client.get("/docs")
    assert response.status_code == 200
    assert f'src="{SCALAR_JS_URL}" integrity="{SCALAR_JS_SRI}"' in response.text
    assert "/openapi.json" in response.text
    assert '"telemetry": false' in response.text
    assert '"agent": {"disabled": true}' in response.text
    assert client.get("/redoc").status_code == 404
