import asyncio

from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine


def create_engine(
    database_url: str,
    *,
    connect_timeout: float,
    pool_size: int,
    max_overflow: int,
    pool_timeout: float,
) -> AsyncEngine:
    # Connecting is lazy; the connect timeout bounds a fresh connection attempt, and the
    # pool timeout how long a request waits for a free one.
    return create_async_engine(
        database_url,
        pool_pre_ping=True,
        pool_size=pool_size,
        max_overflow=max_overflow,
        pool_timeout=pool_timeout,
        connect_args={"timeout": connect_timeout},
    )


async def database_ok(engine: AsyncEngine, timeout: float) -> bool:
    # The overall timeout also covers a pooled connection whose ping never returns, such
    # as a database that accepts TCP but has stopped answering. SQLAlchemy's own pool
    # timeout (PoolTimeout, a SQLAlchemyError) is caught here too, so a busy pool is
    # reported the same as a down database rather than raised.
    try:
        async with asyncio.timeout(timeout):
            async with engine.connect() as connection:
                await connection.execute(text("select 1"))
    except SQLAlchemyError, OSError, TimeoutError:
        return False
    return True
