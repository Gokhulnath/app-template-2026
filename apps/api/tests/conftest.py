import os
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from support import IsolatedSettings

from api.main import create_app


@pytest.fixture
def client() -> Iterator[TestClient]:
    # TEST_DATABASE_URL points the database tests at another Postgres (a second local stack
    # on other ports, say). A dedicated name, so an exported production DATABASE_URL never
    # reaches the tests. Everything else stays isolated from the environment.
    url = os.environ.get("TEST_DATABASE_URL")
    settings = IsolatedSettings(database_url=url) if url else IsolatedSettings()
    # The context manager runs the app's lifespan and keeps one event loop for the whole
    # test, which pooled asyncpg connections need.
    with TestClient(create_app(settings)) as test_client:
        yield test_client
