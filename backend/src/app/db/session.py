from collections.abc import AsyncIterator

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.db.engine import get_engine

session_factory: async_sessionmaker[AsyncSession] | None = None


def init_session_factory() -> async_sessionmaker[AsyncSession]:
    global session_factory
    session_factory = async_sessionmaker(bind=get_engine(), class_=AsyncSession, expire_on_commit=False)
    return session_factory


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    if session_factory is None:
        raise RuntimeError("Session factory is not initialized")
    return session_factory


async def get_db_session() -> AsyncIterator[AsyncSession]:
    async with get_session_factory()() as session:
        yield session


async def check_db_ready() -> bool:
    async with get_session_factory()() as session:
        result = await session.execute(text("select 1"))
        return result.scalar_one() == 1

