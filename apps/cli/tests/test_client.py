import httpx
import pytest

from myapp.client import HealthReport, fetch_health

API = "http://api.test"


def transport(status: int, body: object | None = None) -> httpx.MockTransport:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/health"
        return httpx.Response(status, json=body)

    return httpx.MockTransport(handler)


async def fetch(status: int, body: object | None = None) -> HealthReport:
    return await fetch_health(API, transport(status, body))


@pytest.mark.anyio
async def test_healthy() -> None:
    assert await fetch(200, {"status": "ok", "db": "ok"}) == HealthReport(
        API, "ok", "ok"
    )


@pytest.mark.anyio
async def test_database_down() -> None:
    report = await fetch(503, {"status": "degraded", "db": "unavailable"})
    assert report == HealthReport(API, "degraded", "unavailable")
    assert not report.ok


@pytest.mark.anyio
async def test_unexpected_response_is_an_error() -> None:
    assert (await fetch(500, {"title": "Internal Server Error"})).status == "error"
    assert (await fetch(200, ["not", "a", "health", "body"])).status == "error"


@pytest.mark.anyio
async def test_unreachable() -> None:
    def refuse(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("refused", request=request)

    report = await fetch_health(API, httpx.MockTransport(refuse))
    assert report == HealthReport(API, "unreachable")
