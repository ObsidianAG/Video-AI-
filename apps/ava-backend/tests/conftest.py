from __future__ import annotations

from collections.abc import AsyncGenerator
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import create_app


@pytest.fixture
async def mock_db() -> AsyncMock:
    """Minimal async mock of an asyncpg connection."""
    conn = AsyncMock()
    conn.fetchval.return_value = 1
    return conn


@pytest.fixture
async def client(mock_db: AsyncMock) -> AsyncGenerator[AsyncClient, None]:
    """
    HTTPX async client wired to the FastAPI app.

    The asyncpg pool is fully mocked — no real database is required for tests
    that use this fixture.  The lifespan ``init_pool`` / ``close_pool`` calls
    are replaced with no-ops, and ``_pool`` is pre-set to a ``MagicMock`` that
    returns ``mock_db`` from its ``acquire()`` async context manager.
    """
    pool_mock = MagicMock()
    pool_mock.acquire.return_value.__aenter__ = AsyncMock(return_value=mock_db)
    pool_mock.acquire.return_value.__aexit__ = AsyncMock(return_value=False)

    with (
        patch("app.database.init_pool", AsyncMock()),
        patch("app.database.close_pool", AsyncMock()),
        patch("app.database._pool", pool_mock),
    ):
        _app = create_app()
        async with AsyncClient(
            transport=ASGITransport(app=_app),
            base_url="http://test",
        ) as ac:
            yield ac
