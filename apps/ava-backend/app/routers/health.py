from __future__ import annotations

from fastapi import APIRouter

from app.database import get_pool
from app.models.common import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    """
    Liveness + readiness probe.

    Returns ``status: ok`` when the database pool is reachable.
    Returns ``status: degraded`` (HTTP 200) when the pool is unavailable so
    that load-balancers can distinguish a healthy app from a crash loop.
    """
    try:
        pool = get_pool()
        async with pool.acquire() as conn:
            await conn.fetchval("SELECT 1")
        return HealthResponse(status="ok", database="connected")
    except Exception:
        return HealthResponse(status="degraded", database="unavailable")
