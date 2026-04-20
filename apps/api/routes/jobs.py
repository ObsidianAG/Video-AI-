"""Job routes — create, get, stream (SSE), cancel."""
from __future__ import annotations

import asyncio
import json
import uuid
from datetime import datetime, timezone
from typing import AsyncGenerator

import structlog
from fastapi import APIRouter, HTTPException, Query, Request, status
from fastapi.responses import StreamingResponse
from sqlalchemy import text

from auth import AuthDep, DbDep
from redis_client import get_redis
from schemas.jobs import (
    CancelJobRequest,
    CreateJobRequest,
    JobResponse,
    PaginatedJobsResponse,
)
from services.job_service import create_job, transition_job_state
from services.queue_service import enqueue_job

log = structlog.get_logger(__name__)
router = APIRouter(prefix="/api/jobs", tags=["jobs"])


@router.post("", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
async def submit_job(
    body: CreateJobRequest,
    current_user: AuthDep,
    db: DbDep,
) -> JobResponse:
    # Verify project ownership
    proj = await db.execute(
        text("SELECT id FROM projects WHERE id = :id AND user_id = :user_id"),
        {"id": str(body.project_id), "user_id": current_user.user_id},
    )
    if not proj.first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    # Verify prompt belongs to project
    prompt = await db.execute(
        text("SELECT id FROM prompts WHERE id = :id AND project_id = :project_id"),
        {"id": str(body.prompt_id), "project_id": str(body.project_id)},
    )
    if not prompt.first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prompt not found")

    job = await create_job(
        db,
        project_id=str(body.project_id),
        user_id=current_user.user_id,
        prompt_id=str(body.prompt_id),
        provider=body.provider,
        job_type=body.job_type,
        input_asset_id=str(body.input_asset_id) if body.input_asset_id else None,
        params=body.params.model_dump(),
        idempotency_key=body.idempotency_key,
    )

    # Transition to QUEUED and enqueue
    job = await transition_job_state(
        db,
        job_id=str(job["id"]),
        from_state="CREATED",
        to_state="QUEUED",
        actor=current_user.user_id,
    )

    await enqueue_job(str(job["id"]), {"job_id": str(job["id"]), **job})

    log.info("job.submitted", job_id=str(job["id"]), provider=job["provider"])
    return JobResponse.model_validate(job)


@router.get("", response_model=PaginatedJobsResponse)
async def list_jobs(
    current_user: AuthDep,
    db: DbDep,
    project_id: uuid.UUID | None = Query(default=None),
    state: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> PaginatedJobsResponse:
    offset = (page - 1) * page_size

    # Use explicit static queries — no dynamic column interpolation
    if project_id and state:
        count_q = text(
            "SELECT COUNT(*) FROM jobs WHERE user_id = :uid AND project_id = :pid AND state = :state"
        )
        rows_q = text(
            "SELECT * FROM jobs WHERE user_id = :uid AND project_id = :pid AND state = :state"
            " ORDER BY created_at DESC LIMIT :limit OFFSET :offset"
        )
        base_params: dict = {"uid": current_user.user_id, "pid": str(project_id), "state": state}
    elif project_id:
        count_q = text("SELECT COUNT(*) FROM jobs WHERE user_id = :uid AND project_id = :pid")
        rows_q = text(
            "SELECT * FROM jobs WHERE user_id = :uid AND project_id = :pid"
            " ORDER BY created_at DESC LIMIT :limit OFFSET :offset"
        )
        base_params = {"uid": current_user.user_id, "pid": str(project_id)}
    elif state:
        count_q = text("SELECT COUNT(*) FROM jobs WHERE user_id = :uid AND state = :state")
        rows_q = text(
            "SELECT * FROM jobs WHERE user_id = :uid AND state = :state"
            " ORDER BY created_at DESC LIMIT :limit OFFSET :offset"
        )
        base_params = {"uid": current_user.user_id, "state": state}
    else:
        count_q = text("SELECT COUNT(*) FROM jobs WHERE user_id = :uid")
        rows_q = text(
            "SELECT * FROM jobs WHERE user_id = :uid"
            " ORDER BY created_at DESC LIMIT :limit OFFSET :offset"
        )
        base_params = {"uid": current_user.user_id}

    count_result = await db.execute(count_q, base_params)
    total = count_result.scalar() or 0

    rows_result = await db.execute(rows_q, {**base_params, "limit": page_size, "offset": offset})
    rows = rows_result.mappings().all()

    return PaginatedJobsResponse(
        items=[JobResponse.model_validate(dict(r)) for r in rows],
        total=total,
        page=page,
        page_size=page_size,
        has_more=(page * page_size) < total,
    )


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(job_id: uuid.UUID, current_user: AuthDep, db: DbDep) -> JobResponse:
    result = await db.execute(
        text("SELECT * FROM jobs WHERE id = :id AND user_id = :user_id"),
        {"id": str(job_id), "user_id": current_user.user_id},
    )
    row = result.mappings().first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    return JobResponse.model_validate(dict(row))


@router.get("/{job_id}/stream")
async def stream_job_events(
    job_id: uuid.UUID,
    current_user: AuthDep,
    db: DbDep,
    request: Request,
) -> StreamingResponse:
    """Server-Sent Events stream for real-time job progress via Redis pub/sub."""
    # Verify access
    result = await db.execute(
        text("SELECT state FROM jobs WHERE id = :id AND user_id = :user_id"),
        {"id": str(job_id), "user_id": current_user.user_id},
    )
    row = result.mappings().first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    async def event_generator() -> AsyncGenerator[str, None]:
        redis = get_redis()
        pubsub = redis.pubsub()
        channel = f"job:{job_id}:events"

        await pubsub.subscribe(channel)

        # Send current state immediately
        yield _sse_event(
            {
                "type": "JOB_STATE_CHANGED",
                "jobId": str(job_id),
                "state": row["state"],
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        )

        try:
            while True:
                if await request.is_disconnected():
                    break

                message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=25.0)

                if message and message["type"] == "message":
                    data = json.loads(message["data"])
                    yield _sse_event(data)

                    # Stop streaming on terminal state
                    if data.get("state") in {"SUCCEEDED", "FAILED", "CANCELLED"}:
                        break
                else:
                    # Keepalive comment
                    yield ": keepalive\n\n"
                    await asyncio.sleep(0)
        finally:
            await pubsub.unsubscribe(channel)
            await pubsub.aclose()

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/{job_id}/cancel", response_model=JobResponse)
async def cancel_job(
    job_id: uuid.UUID,
    body: CancelJobRequest,
    current_user: AuthDep,
    db: DbDep,
) -> JobResponse:
    result = await db.execute(
        text("SELECT * FROM jobs WHERE id = :id AND user_id = :user_id"),
        {"id": str(job_id), "user_id": current_user.user_id},
    )
    row = result.mappings().first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    current_state = row["state"]
    if current_state in {"SUCCEEDED", "FAILED", "CANCELLED"}:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Job is already in terminal state: {current_state}",
        )

    updated = await transition_job_state(
        db,
        job_id=str(job_id),
        from_state=current_state,
        to_state="CANCELLED",
        actor=current_user.user_id,
        meta={"reason": body.reason},
    )

    await db.execute(
        text("""
            INSERT INTO audit_events (id, user_id, action, resource_type, resource_id, meta, created_at)
            VALUES (:id, :user_id, 'JOB_CANCELLED', 'job', :resource_id, :meta, :now)
        """),
        {
            "id": str(uuid.uuid4()),
            "user_id": current_user.user_id,
            "resource_id": str(job_id),
            "meta": json.dumps({"reason": body.reason}),
            "now": datetime.now(timezone.utc),
        },
    )
    await db.commit()

    log.info("job.cancelled", job_id=str(job_id), user_id=current_user.user_id)
    return JobResponse.model_validate(updated)


def _sse_event(data: dict) -> str:
    return f"data: {json.dumps(data)}\n\n"
