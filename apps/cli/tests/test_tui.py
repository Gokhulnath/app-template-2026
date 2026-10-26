import pytest
from textual.widgets import Static

from myapp.client import HealthReport
from myapp.tui import MyappApp


def fetch_returning(*reports: HealthReport):
    remaining = list(reports)

    async def fetch(api_url: str) -> HealthReport:
        return remaining.pop(0)

    return fetch


def status_text(app: MyappApp) -> str:
    return str(app.query_one("#status", Static).render())


@pytest.mark.anyio
async def test_shows_status_and_rechecks_on_r_and_click() -> None:
    api = "http://api.test"
    app = MyappApp(
        api,
        fetch=fetch_returning(
            HealthReport(api, "ok", "ok"),
            HealthReport(api, "degraded", "unavailable"),
            HealthReport(api, "unreachable"),
        ),
    )
    async with app.run_test() as pilot:
        await app.workers.wait_for_complete()
        assert status_text(app) == "API status: ok"

        await pilot.press("r")
        await app.workers.wait_for_complete()
        assert status_text(app) == "API status: degraded (database unavailable)"

        await pilot.click("#check")
        await app.workers.wait_for_complete()
        assert status_text(app) == "API status: unreachable"
