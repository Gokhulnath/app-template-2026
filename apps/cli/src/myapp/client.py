"""The one HTTP client the terminal surfaces share: commands, TUI and MCP server.

Like every myapp client, it only talks to the API; no logic lives here.
"""

from collections.abc import Awaitable, Callable
from dataclasses import dataclass

import httpx

DEFAULT_API_URL = "http://localhost:8000"


@dataclass(frozen=True)
class HealthReport:
    api_url: str
    # "ok" | "degraded" (API up, database down) | "error" | "unreachable"
    status: str
    # "ok" | "unavailable", or None when the API didn't send a health body
    db: str | None = None

    @property
    def ok(self) -> bool:
        return self.status == "ok"


# What the TUI and the MCP server accept, so tests can pass a fake.
Fetch = Callable[[str], Awaitable[HealthReport]]


async def fetch_health(
    api_url: str, transport: httpx.AsyncBaseTransport | None = None
) -> HealthReport:
    try:
        async with httpx.AsyncClient(
            base_url=api_url, timeout=10, transport=transport
        ) as client:
            response = await client.get("/health")
    except httpx.HTTPError:
        return HealthReport(api_url, "unreachable")
    # 503 still carries a health body: the API is up but its database isn't.
    if response.status_code in (200, 503):
        try:
            body = response.json()
            return HealthReport(api_url, body["status"], body.get("db"))
        except ValueError, KeyError, TypeError:
            pass
    return HealthReport(api_url, "error")
