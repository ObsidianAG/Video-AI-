from __future__ import annotations

from typing import Any

import asyncpg
import structlog

logger = structlog.get_logger()

# asyncpg.Pool typed as Any — asyncpg ships without bundled type stubs.
_pool: Any = None


async def init_pool(database_url: str, *, min_size: int = 2, max_size: int = 10) -> None:
    global _pool
    _pool = await asyncpg.create_pool(database_url, min_size=min_size, max_size=max_size)
    logger.info("asyncpg_pool_created", min_size=min_size, max_size=max_size)


async def close_pool() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None
        logger.info("asyncpg_pool_closed")


def get_pool() -> Any:
    """Return the live connection pool; raises RuntimeError if not initialised."""
    if _pool is None:
        raise RuntimeError("Database pool not initialised — call init_pool() first")
    return _pool
