"""Health and metrics routes."""
from __future__ import annotations

import time

import structlog
from fastapi import APIRouter, Response
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest

from database import ping_database
from redis_client import ping_redis

log = structlog.get_logger(__name__)
router = APIRouter(prefix="/api", tags=["health"])

_start_time = time.time()


@router.get("/health")
async def health() -> dict:
    """Liveness + readiness probe."""
    checks: dict[str, str] = {}

    try:
        await ping_database()
        checks["database"] = "ok"
    except Exception as exc:
        checks["database"] = f"error: {exc}"

    try:
        await ping_redis()
        checks["redis"] = "ok"
    except Exception as exc:
        checks["redis"] = f"error: {exc}"

    all_ok = all(v == "ok" for v in checks.values())

    return {
        "status": "healthy" if all_ok else "degraded",
        "uptime_seconds": int(time.time() - _start_time),
        "checks": checks,
    }


@router.get("/metrics")
async def metrics(response: Response) -> Response:
    """Prometheus metrics endpoint."""
    data = generate_latest()
    return Response(content=data, media_type=CONTENT_TYPE_LATEST)
