from fastapi.testclient import TestClient
from support import IsolatedSettings

from api.main import create_app
from api.settings import Settings


def allowed_origin(settings: Settings, origin: str) -> str | None:
    client = TestClient(create_app(settings))
    response = client.get("/openapi.json", headers={"Origin": origin})
    return response.headers.get("access-control-allow-origin")


def test_defaults_allow_desktop_origins_but_not_localhost() -> None:
    settings = IsolatedSettings()
    assert allowed_origin(settings, "tauri://localhost") == "tauri://localhost"
    assert (
        allowed_origin(settings, "http://tauri.localhost") == "http://tauri.localhost"
    )
    assert allowed_origin(settings, "http://localhost:3000") is None


def test_dev_settings_allow_any_localhost_port() -> None:
    settings = IsolatedSettings(cors_allow_localhost=True)
    assert (
        allowed_origin(settings, "http://tauri.localhost") == "http://tauri.localhost"
    )
    assert allowed_origin(settings, "http://localhost:3001") == "http://localhost:3001"
    assert allowed_origin(settings, "http://127.0.0.1:1430") == "http://127.0.0.1:1430"


def test_defaults_reject_other_origins() -> None:
    assert allowed_origin(IsolatedSettings(), "https://example.com") is None


def test_production_settings_allow_only_listed_origins() -> None:
    settings = IsolatedSettings(
        cors_origins="https://donna.example,tauri://localhost",
        cors_allow_localhost=False,
    )
    assert allowed_origin(settings, "https://donna.example") == "https://donna.example"
    assert allowed_origin(settings, "tauri://localhost") == "tauri://localhost"
    assert allowed_origin(settings, "http://localhost:3000") is None


def test_lookalike_origins_are_rejected() -> None:
    # Starlette full-matches allow_origin_regex; this guards that assumption.
    settings = IsolatedSettings(cors_allow_localhost=True)
    for origin in (
        "http://localhost.evil.com",
        "http://127.0.0.1.evil.com",
        "http://localhost:3000.evil.com",
        "https://localhost:3000",
    ):
        assert allowed_origin(settings, origin) is None, origin
