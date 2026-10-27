import os
from typing import Any

import pytest
from fastapi.testclient import TestClient
from pydantic_settings import BaseSettings, PydanticBaseSettingsSource

from api.settings import Settings


class IsolatedSettings(Settings):
    """Settings built only from the arguments given, so tests never pick up the
    developer's environment variables or .env file."""

    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls: type[BaseSettings],
        init_settings: PydanticBaseSettingsSource,
        env_settings: PydanticBaseSettingsSource,
        dotenv_settings: PydanticBaseSettingsSource,
        file_secret_settings: PydanticBaseSettingsSource,
    ) -> tuple[PydanticBaseSettingsSource, ...]:
        return (init_settings,)


def database_settings(**overrides: Any) -> IsolatedSettings:
    """Settings for tests that use a real database. TEST_DATABASE_URL points them at another
    Postgres (a second local stack on other ports, say). A dedicated name, so an exported
    production DATABASE_URL never reaches the tests."""
    url = os.environ.get("TEST_DATABASE_URL")
    if url:
        overrides.setdefault("database_url", url)
    return IsolatedSettings(**overrides)


def require_database(client: TestClient) -> None:
    """Skips the test when the database is down, unless MYAPP_REQUIRE_DB says it must be up
    (matching test_health.test_health_with_database)."""
    if client.get("/health").status_code == 503 and not os.environ.get(
        "MYAPP_REQUIRE_DB"
    ):
        pytest.skip("local database not running; start it with `pnpm db:start`")
