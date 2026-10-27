from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from support import database_settings

from api.main import create_app


@pytest.fixture
def anyio_backend() -> str:
    # The MCP tests (test_mcp.py) are async, through the anyio pytest plugin that ships
    # with httpx/starlette.
    return "asyncio"


@pytest.fixture
def client() -> Iterator[TestClient]:
    # Everything but TEST_DATABASE_URL stays isolated from the environment.
    # The context manager runs the app's lifespan and keeps one event loop for the whole
    # test, which pooled asyncpg connections need.
    with TestClient(create_app(database_settings())) as test_client:
        yield test_client
