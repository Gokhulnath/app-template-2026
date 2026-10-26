import pytest


@pytest.fixture
def anyio_backend() -> str:
    # Async tests run on asyncio, through the anyio pytest plugin that ships with httpx.
    return "asyncio"
