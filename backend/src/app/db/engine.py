from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine

from app.core.settings import Settings

engine: AsyncEngine | None = None


def init_engine(settings: Settings) -> AsyncEngine:
    global engine
    engine = create_async_engine(
        str(settings.database_url),
        echo=False,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
    )
    return engine


def get_engine() -> AsyncEngine:
    if engine is None:
        raise RuntimeError("Database engine is not initialized")
    return engine

