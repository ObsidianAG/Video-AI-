"""QNEO digital twin V(x) computation and snapshot management."""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Any

import structlog

from config import get_settings
from redis_client import get_redis
from services.queue_service import get_queue_stats

log = structlog.get_logger(__name__)

PROVIDER_HEALTH_KEY = "qneo:provider_health"
ACTIVE_JOBS_KEY = "qneo:active_jobs"


def _compute_health_score(
    provider_health: list[dict[str, Any]],
    queue_stats: dict[str, int],
    active_job_count: int,
) -> int:
    """
    Compute V(x) system health score (0-100).
    Factors: provider availability, queue pressure, error rates.
    """
    if not provider_health:
        return 50

    # Provider component (weight 0.5)
    healthy_providers = sum(1 for p in provider_health if p.get("healthy", False))
    total_providers = len(provider_health)
    provider_score = (healthy_providers / total_providers) * 100 if total_providers else 50

    # Error rate component (weight 0.3)
    avg_error_rate = (
        sum(p.get("error_rate", 0.0) for p in provider_health) / total_providers
        if total_providers else 0.0
    )
    error_score = max(0, 100 - avg_error_rate * 200)  # 50% error rate → 0

    # Queue pressure component (weight 0.2)
    queue_depth = queue_stats.get("queue_depth", 0)
    dlq_depth = queue_stats.get("dlq_depth", 0)
    queue_pressure = min(100, (queue_depth + dlq_depth * 3) * 2)
    queue_score = max(0, 100 - queue_pressure)

    v_x = int(provider_score * 0.5 + error_score * 0.3 + queue_score * 0.2)
    return max(0, min(100, v_x))


async def get_control_snapshot() -> dict[str, Any]:
    """
    Compute or retrieve cached QNEO control snapshot.
    Always reads from Redis — never computed client-side.
    """
    settings = get_settings()
    redis = get_redis()

    cache_key = f"{settings.qneo_redis_key_prefix}latest"
    cached_raw = await redis.get(cache_key)
    if cached_raw:
        return json.loads(cached_raw)

    # Build fresh snapshot
    snapshot_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    queue_stats = await get_queue_stats()

    # Read provider health from Redis (populated by workers pinging providers)
    provider_health_raw = await redis.hgetall(PROVIDER_HEALTH_KEY)
    provider_health: list[dict[str, Any]] = []
    for _provider, raw in provider_health_raw.items():
        try:
            provider_health.append(json.loads(raw))
        except json.JSONDecodeError:
            pass

    # Default entries for known providers if not yet recorded
    known_providers = ["veo", "kling", "anthropic", "vllm"]
    existing_providers = {p.get("provider") for p in provider_health}
    for pname in known_providers:
        if pname not in existing_providers:
            provider_health.append({
                "provider": pname,
                "healthy": False,
                "latency_ms": None,
                "error_rate": 0.0,
                "last_checked_at": now.isoformat(),
            })

    active_job_count_raw = await redis.get(ACTIVE_JOBS_KEY)
    active_job_count = int(active_job_count_raw) if active_job_count_raw else 0

    health_score = _compute_health_score(provider_health, queue_stats, active_job_count)

    alerts: list[str] = []
    if queue_stats["dlq_depth"] > 0:
        alerts.append(f"DLQ has {queue_stats['dlq_depth']} dead-lettered jobs")
    if health_score < 60:
        alerts.append(f"System health score is low: {health_score}/100")
    unhealthy = [p["provider"] for p in provider_health if not p.get("healthy")]
    if unhealthy:
        alerts.append(f"Unhealthy providers: {', '.join(unhealthy)}")

    snapshot: dict[str, Any] = {
        "snapshot_id": snapshot_id,
        "computed_at": now.isoformat(),
        "ttl_seconds": settings.qneo_snapshot_ttl_seconds,
        "system_health_score": health_score,
        "provider_health": provider_health,
        "job_queue_stats": {
            "queue_depth": queue_stats["queue_depth"],
            "processing_count": queue_stats["processing_count"],
            "dlq_depth": queue_stats["dlq_depth"],
            "avg_wait_ms": None,
        },
        "active_job_count": active_job_count,
        "metrics": [
            {
                "name": "queue_depth",
                "value": float(queue_stats["queue_depth"]),
                "unit": "jobs",
                "timestamp": now.isoformat(),
            },
            {
                "name": "active_jobs",
                "value": float(active_job_count),
                "unit": "jobs",
                "timestamp": now.isoformat(),
            },
            {
                "name": "health_score",
                "value": float(health_score),
                "unit": "score",
                "timestamp": now.isoformat(),
            },
        ],
        "alerts": alerts,
    }

    await redis.setex(
        cache_key,
        settings.qneo_snapshot_ttl_seconds,
        json.dumps(snapshot),
    )

    log.info(
        "qneo.snapshot_computed",
        snapshot_id=snapshot_id,
        health_score=health_score,
        alert_count=len(alerts),
    )
    return snapshot


async def update_provider_health(
    provider: str,
    *,
    healthy: bool,
    latency_ms: float | None,
    error_rate: float,
) -> None:
    """Called by workers to report provider health. Invalidates snapshot cache."""
    settings = get_settings()
    redis = get_redis()

    health_entry = {
        "provider": provider,
        "healthy": healthy,
        "latency_ms": latency_ms,
        "error_rate": error_rate,
        "last_checked_at": datetime.now(timezone.utc).isoformat(),
    }
    await redis.hset(PROVIDER_HEALTH_KEY, provider, json.dumps(health_entry))
    # Invalidate cached snapshot
    await redis.delete(f"{settings.qneo_redis_key_prefix}latest")
