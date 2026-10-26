import json

import pytest
from typer.testing import CliRunner

from myapp import cli
from myapp.client import HealthReport

runner = CliRunner()


def fake_fetch(report: HealthReport):
    async def fetch(api_url: str) -> HealthReport:
        return HealthReport(api_url, report.status, report.db)

    return fetch


def test_status_ok(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(cli, "fetch_health", fake_fetch(HealthReport("", "ok", "ok")))
    result = runner.invoke(cli.app, ["status"])
    assert result.exit_code == 0
    assert result.output == "API status: ok (database ok) · http://localhost:8000\n"


def test_status_json_and_exit_code_when_degraded(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        cli, "fetch_health", fake_fetch(HealthReport("", "degraded", "unavailable"))
    )
    result = runner.invoke(cli.app, ["status", "--json"])
    assert result.exit_code == 1
    assert json.loads(result.output) == {
        "api_url": "http://localhost:8000",
        "status": "degraded",
        "db": "unavailable",
    }


def test_api_url_flag_beats_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(cli, "fetch_health", fake_fetch(HealthReport("", "ok", "ok")))
    monkeypatch.setenv("MYAPP_API_URL", "http://from-env")
    from_env = runner.invoke(cli.app, ["status", "--json"])
    from_flag = runner.invoke(
        cli.app, ["--api-url", "http://from-flag/", "status", "--json"]
    )
    assert json.loads(from_env.output)["api_url"] == "http://from-env"
    assert json.loads(from_flag.output)["api_url"] == "http://from-flag"


def test_bare_myapp_without_a_terminal_prints_help() -> None:
    result = runner.invoke(cli.app, [])
    assert result.exit_code == 0
    assert "status" in result.output
