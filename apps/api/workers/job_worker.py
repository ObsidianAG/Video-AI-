"""Job worker — dequeues jobs, calls media service, updates state."""
from __future__ import annotations

import asyncio
import json
import signal
import sys
from typing import Any

import httpx
import structlog

from config import get_settings
from database import close_database, get_session_factory, ping_database
from redis_client import close_redis, ping_redis
from services.job_service import transition_job_state
from services.queue_service import ack_job, dequeue_job, nack_job

log = structlog.get_logger(__name__)
_running = True


def _handle_shutdown(sig: int, _frame: Any) -> None:
    global _running
    log.info("worker.shutdown_signal", signal=sig)
    _running = False


async def process_job(entry: dict[str, Any]) -> None:
    """Send job to media service and handle result."""
    settings = get_settings()
    job_id: str = entry["job_id"]
    payload: dict[str, Any] = entry.get("payload", entry)

    factory = get_session_factory()
    async with factory() as db:
        # Transition to STARTED
        try:
            await transition_job_state(
                db,
                job_id=job_id,
                from_state="QUEUED",
                to_state="STARTED",
                actor="worker",
            )
        except Exception as exc:
            log.error("worker.state_transition_failed", job_id=job_id, error=str(exc))
            return

        # Call media service
        callback_url = f"{settings.api_base_url}/api/internal/jobs/{job_id}/callback"
        execute_payload = {
            "jobId": job_id,
            "provider": payload.get("provider"),
            "jobType": payload.get("job_type"),
            "params": payload.get("params", {}),
            "callbackUrl": callback_url,
            "idempotencyKey": payload.get("idempotency_key"),
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{settings.media_service_url}/internal/jobs/execute",
                    json=execute_payload,
                    headers={"X-Internal-Secret": settings.media_service_secret},
                )
                response.raise_for_status()
                result = response.json()

            # Transition to PROVIDER_RUNNING
            await transition_job_state(
                db,
                job_id=job_id,
                from_state="STARTED",
                to_state="PROVIDER_RUNNING",
                actor="worker",
                provider_operation_id=result.get("mediaJobId"),
            )
            await ack_job(job_id)
            log.info("worker.job_dispatched", job_id=job_id, media_job_id=result.get("mediaJobId"))

        except httpx.HTTPStatusError as exc:
            log.error(
                "worker.media_service_error",
                job_id=job_id,
                status_code=exc.response.status_code,
                error=str(exc),
            )
            await transition_job_state(
                db,
                job_id=job_id,
                from_state="STARTED",
                to_state="FAILED",
                actor="worker",
                error_code="MEDIA_SERVICE_ERROR",
                error_message=str(exc),
            )
            await nack_job(job_id, entry, max_attempts=payload.get("max_attempts", 3))

        except Exception as exc:
            log.error("worker.unexpected_error", job_id=job_id, error=str(exc))
            await transition_job_state(
                db,
                job_id=job_id,
                from_state="STARTED",
                to_state="FAILED",
                actor="worker",
                error_code="WORKER_ERROR",
                error_message=str(exc),
            )
            await nack_job(job_id, entry, max_attempts=payload.get("max_attempts", 3))


async def run_worker() -> None:
    """Main worker loop."""
    signal.signal(signal.SIGINT, _handle_shutdown)
    signal.signal(signal.SIGTERM, _handle_shutdown)

    log.info("worker.starting")
    await ping_database()
    await ping_redis()
    log.info("worker.ready")

    try:
        while _running:
            entry = await dequeue_job(timeout=5)
            if entry is None:
                continue

            job_id = entry.get("job_id", "unknown")
            log.info("worker.dequeued", job_id=job_id)

            try:
                await process_job(entry)
            except Exception as exc:
                log.error("worker.unhandled_error", job_id=job_id, error=str(exc))
    finally:
        log.info("worker.stopping")
        await close_database()
        await close_redis()
        log.info("worker.stopped")


if __name__ == "__main__":
    asyncio.run(run_worker())
