import asyncio

from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine


def create_engine(database_url: str, connect_timeout: float) -> AsyncEngine:
    # Connecting is lazy; the connect timeout bounds a fresh connection attempt.
    return create_async_engine(
        database_url, pool_pre_ping=True, connect_args={"timeout": connect_timeout}
    )


async def database_ok(engine: AsyncEngine, timeout: float) -> bool:
    # The overall timeout also covers a pooled connection whose ping never returns, such
    # as a database that accepts TCP but has stopped answering.
    try:
        async with asyncio.timeout(timeout):
            async with engine.connect() as connection:
                await connection.execute(text("select 1"))
    except SQLAlchemyError, OSError, TimeoutError:
        return False
    return True
