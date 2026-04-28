"""Redis-backed job queue with retry and DLQ support."""
from __future__ import annotations

import json
import time
from datetime import datetime, timezone
from typing import Any

import structlog

from config import get_settings
from redis_client import get_redis

log = structlog.get_logger(__name__)


async def enqueue_job(job_id: str, payload: dict[str, Any]) -> None:
    """Push a job onto the Redis work queue."""
    settings = get_settings()
    redis = get_redis()

    entry = {
        "job_id": job_id,
        "payload": payload,
        "enqueued_at": datetime.now(timezone.utc).isoformat(),
        "attempt": 0,
    }
    await redis.rpush(settings.job_queue_key, json.dumps(entry))
    log.info("queue.enqueued", job_id=job_id)


async def dequeue_job(timeout: int = 5) -> dict[str, Any] | None:
    """Blocking-pop a job from the Redis queue. Returns None on timeout."""
    settings = get_settings()
    redis = get_redis()

    result = await redis.blpop(settings.job_queue_key, timeout=timeout)
    if result is None:
        return None

    _, raw = result
    entry: dict[str, Any] = json.loads(raw)
    # Mark as processing
    await redis.hset(
        settings.job_processing_key,
        entry["job_id"],
        json.dumps({**entry, "processing_started_at": datetime.now(timezone.utc).isoformat()}),
    )
    return entry


async def ack_job(job_id: str) -> None:
    """Remove job from the processing set upon successful completion."""
    settings = get_settings()
    redis = get_redis()
    await redis.hdel(settings.job_processing_key, job_id)
    log.info("queue.acked", job_id=job_id)


async def nack_job(job_id: str, entry: dict[str, Any], max_attempts: int = 3) -> None:
    """Re-queue or dead-letter a failed job."""
    settings = get_settings()
    redis = get_redis()

    attempt = entry.get("attempt", 0) + 1
    await redis.hdel(settings.job_processing_key, job_id)

    if attempt >= max_attempts:
        dlq_entry = {**entry, "attempt": attempt, "dead_lettered_at": datetime.now(timezone.utc).isoformat()}
        await redis.rpush(settings.job_dlq_key, json.dumps(dlq_entry))
        log.warning("queue.dead_lettered", job_id=job_id, attempt=attempt)
    else:
        retry_entry = {**entry, "attempt": attempt}
        await redis.rpush(settings.job_queue_key, json.dumps(retry_entry))
        log.info("queue.requeued", job_id=job_id, attempt=attempt)


async def get_queue_stats() -> dict[str, int]:
    """Return queue depth statistics."""
    settings = get_settings()
    redis = get_redis()

    queue_depth = await redis.llen(settings.job_queue_key)
    processing_count = await redis.hlen(settings.job_processing_key)
    dlq_depth = await redis.llen(settings.job_dlq_key)

    return {
        "queue_depth": queue_depth,
        "processing_count": processing_count,
        "dlq_depth": dlq_depth,
    }
