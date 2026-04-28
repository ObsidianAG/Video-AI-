"""Redis connection pool."""
from __future__ import annotations

from typing import Any

import redis.asyncio as aioredis
import structlog

from config import get_settings

log = structlog.get_logger(__name__)

_redis: Any = None


def get_redis() -> aioredis.Redis:  # type: ignore[type-arg]
    global _redis
    if _redis is None:
        settings = get_settings()
        _redis = aioredis.from_url(
            settings.redis_url,
            encoding="utf-8",
            decode_responses=True,
            max_connections=50,
        )
    return _redis


async def ping_redis() -> None:
    """Verify Redis connectivity — raises on failure."""
    r = get_redis()
    result = await r.ping()
    if not result:
        raise RuntimeError("Redis ping returned falsy response")
    log.info("redis.ping.ok")


async def close_redis() -> None:
    global _redis
    if _redis is not None:
        await _redis.aclose()
        _redis = None
        log.info("redis.closed")
