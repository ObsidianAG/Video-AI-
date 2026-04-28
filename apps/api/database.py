"""Async SQLAlchemy + asyncpg database setup."""
from __future__ import annotations

from collections.abc import AsyncGenerator
from typing import Any

import structlog
from sqlalchemy import event, text
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from config import get_settings

log = structlog.get_logger(__name__)

_engine: Any = None
_session_factory: Any = None


def get_engine() -> Any:
    global _engine
    if _engine is None:
        settings = get_settings()
        _engine = create_async_engine(
            settings.database_url,
            pool_pre_ping=True,
            pool_size=10,
            max_overflow=20,
            echo=settings.app_env == "development",
        )
    return _engine


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    global _session_factory
    if _session_factory is None:
        _session_factory = async_sessionmaker(
            get_engine(),
            class_=AsyncSession,
            expire_on_commit=False,
            autoflush=False,
        )
    return _session_factory


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency — yields an async database session."""
    factory = get_session_factory()
    async with factory() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def ping_database() -> None:
    """Verify database connectivity — raises on failure."""
    engine = get_engine()
    async with engine.connect() as conn:
        await conn.execute(text("SELECT 1"))
    log.info("database.ping.ok")


async def close_database() -> None:
    """Dispose engine connection pool on shutdown."""
    global _engine
    if _engine is not None:
        await _engine.dispose()
        _engine = None
        log.info("database.disposed")
