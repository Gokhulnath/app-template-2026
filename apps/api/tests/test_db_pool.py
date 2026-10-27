import time

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import TimeoutError as PoolTimeout
from support import database_settings, require_database

from api.db import create_engine
from api.main import create_app


@pytest.mark.anyio
async def test_pool_timeout_is_honored_when_every_connection_is_busy() -> None:
    # Without db_pool_timeout wired into create_async_engine, SQLAlchemy falls back to its
    # default 30-second wait for a free connection; a caller that finds the pool (one
    # connection, no overflow) already busy would hang for most of that before failing.
    # With the fix, it raises SQLAlchemy's own TimeoutError well within a couple of seconds.
    with TestClient(create_app(database_settings())) as client:
        require_database(client)
        settings = database_settings(
            db_pool_size=1, db_max_overflow=0, db_pool_timeout=0.2
        )
    engine = create_engine(
        settings.database_url,
        connect_timeout=settings.db_health_timeout,
        pool_size=settings.db_pool_size,
        max_overflow=settings.db_max_overflow,
        pool_timeout=settings.db_pool_timeout,
    )
    held = await engine.connect()
    try:
        started = time.monotonic()
        with pytest.raises(PoolTimeout):
            await engine.connect()
        assert time.monotonic() - started < 2
    finally:
        await held.close()
        await engine.dispose()
