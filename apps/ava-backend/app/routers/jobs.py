from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.auth import get_service_token
from app.dependencies import AuthDep, DbDep
from app.models.jobs import (
    AdvanceStateRequest,
    CreateJobRequest,
    JobListResponse,
    JobResponse,
)
from app.services import job_service

router = APIRouter()


@router.post("/jobs", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
async def create_job(
    body: CreateJobRequest,
    db: DbDep,
    user_id: AuthDep,
) -> JobResponse:
    """Submit a new video generation job. Returns the job at state PROMPT_RECEIVED."""
    row = await job_service.create_job(
        db,
        user_id=user_id,
        prompt=body.prompt,
        settings=body.settings,
    )
    return JobResponse.model_validate(row)


@router.get("/jobs", response_model=JobListResponse)
async def list_jobs(
    db: DbDep,
    user_id: AuthDep,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> JobListResponse:
    """List the authenticated user's video jobs, newest first."""
    rows, total = await job_service.list_jobs(db, user_id=user_id, limit=limit, offset=offset)
    return JobListResponse(
        items=[JobResponse.model_validate(r) for r in rows],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/jobs/{job_id}", response_model=JobResponse)
async def get_job(
    job_id: str,
    db: DbDep,
    user_id: AuthDep,
) -> JobResponse:
    """Fetch a single video job by ID. Returns 404 if not found or not owned by caller."""
    row = await job_service.get_job(db, job_id=job_id, user_id=user_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Job not found")
    return JobResponse.model_validate(row)


@router.patch(
    "/jobs/{job_id}/state",
    response_model=JobResponse,
    summary="Advance job state (internal — requires service token)",
)
async def advance_job_state(
    job_id: str,
    body: AdvanceStateRequest,
    db: DbDep,
    _svc: Annotated[str, Depends(get_service_token)],
) -> JobResponse:
    """
    Advance a video_job to the requested state.

    Validates the transition against the state machine before writing.
    Requires the ``SERVICE_TOKEN`` bearer credential — for worker use only.
    """
    try:
        row = await job_service.advance_state(
            db,
            job_id=job_id,
            to_state=body.to_state,
            reason=body.reason,
            metadata=body.metadata,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    return JobResponse.model_validate(row)
