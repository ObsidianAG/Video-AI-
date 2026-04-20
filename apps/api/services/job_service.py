"""Job service — creation, state transitions, audit logging."""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Any

import structlog
from sqlalchemy import select, update, func
from sqlalchemy.ext.asyncio import AsyncSession

from config import get_settings
from redis_client import get_redis

log = structlog.get_logger(__name__)

# Valid state machine edges (mirrors contracts/src/index.ts)
VALID_TRANSITIONS: dict[str, set[str]] = {
    "CREATED": {"QUEUED", "CANCELLED"},
    "QUEUED": {"STARTED", "CANCELLED"},
    "STARTED": {"PROVIDER_RUNNING", "FAILED", "CANCELLED"},
    "PROVIDER_RUNNING": {"UPLOADING", "FAILED", "CANCELLED"},
    "UPLOADING": {"SUCCEEDED", "FAILED"},
    "SUCCEEDED": set(),
    "FAILED": {"QUEUED"},
    "CANCELLED": set(),
}

TERMINAL_STATES = {"SUCCEEDED", "FAILED", "CANCELLED"}


class InvalidStateTransitionError(Exception):
    def __init__(self, current: str, target: str):
        super().__init__(f"Cannot transition from {current} → {target}")
        self.current = current
        self.target = target


async def create_job(
    db: AsyncSession,
    *,
    project_id: str,
    user_id: str,
    prompt_id: str,
    provider: str,
    job_type: str,
    input_asset_id: str | None,
    params: dict[str, Any],
    idempotency_key: str,
    max_attempts: int = 3,
) -> dict[str, Any]:
    """Create a job row idempotently. Returns existing row if idempotency_key matches."""
    from sqlalchemy import text  # noqa: PLC0415

    # Idempotency check
    existing = await db.execute(
        text("SELECT * FROM jobs WHERE idempotency_key = :key"),
        {"key": idempotency_key},
    )
    row = existing.mappings().first()
    if row:
        log.info("job.idempotent_hit", idempotency_key=idempotency_key, job_id=str(row["id"]))
        return dict(row)

    job_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    await db.execute(
        text("""
            INSERT INTO jobs (
                id, project_id, user_id, prompt_id, provider, job_type,
                state, input_asset_id, params, idempotency_key,
                attempt_count, max_attempts, created_at, updated_at
            ) VALUES (
                :id, :project_id, :user_id, :prompt_id, :provider, :job_type,
                'CREATED', :input_asset_id, :params, :idempotency_key,
                0, :max_attempts, :now, :now
            )
        """),
        {
            "id": job_id,
            "project_id": project_id,
            "user_id": user_id,
            "prompt_id": prompt_id,
            "provider": provider,
            "job_type": job_type,
            "input_asset_id": input_asset_id,
            "params": json.dumps(params),
            "idempotency_key": idempotency_key,
            "max_attempts": max_attempts,
            "now": now,
        },
    )
    await db.commit()

    await _audit_job_event(
        db,
        user_id=user_id,
        action="JOB_CREATED",
        job_id=job_id,
        meta={"provider": provider, "job_type": job_type},
    )

    log.info("job.created", job_id=job_id, provider=provider)
    return await get_job(db, job_id=job_id, user_id=user_id)  # type: ignore[return-value]


async def transition_job_state(
    db: AsyncSession,
    *,
    job_id: str,
    from_state: str,
    to_state: str,
    actor: str = "system",
    meta: dict[str, Any] | None = None,
    error_code: str | None = None,
    error_message: str | None = None,
    provider_operation_id: str | None = None,
    output_asset_id: str | None = None,
) -> dict[str, Any]:
    """Transition job state with validation. Raises on invalid transition."""
    if to_state not in VALID_TRANSITIONS.get(from_state, set()):
        raise InvalidStateTransitionError(from_state, to_state)

    from sqlalchemy import text  # noqa: PLC0415

    now = datetime.now(timezone.utc)
    extra_fields: dict[str, Any] = {}

    if to_state in {"STARTED", "PROVIDER_RUNNING"}:
        extra_fields["started_at"] = now
    if to_state in TERMINAL_STATES:
        extra_fields["completed_at"] = now
    if error_code:
        extra_fields["error_code"] = error_code
    if error_message:
        extra_fields["error_message"] = error_message
    if provider_operation_id:
        extra_fields["provider_operation_id"] = provider_operation_id
    if output_asset_id:
        extra_fields["output_asset_id"] = output_asset_id

    set_clause = ", ".join(f"{k} = :{k}" for k in extra_fields)
    if set_clause:
        set_clause = ", " + set_clause

    result = await db.execute(
        text(f"""
            UPDATE jobs
            SET state = :to_state, updated_at = :now {set_clause}
            WHERE id = :job_id AND state = :from_state
            RETURNING *
        """),
        {"to_state": to_state, "now": now, "job_id": job_id, "from_state": from_state, **extra_fields},
    )
    updated = result.mappings().first()
    if not updated:
        raise RuntimeError(
            f"Job {job_id} state transition failed: expected state={from_state} not found"
        )
    await db.commit()

    # Audit every transition
    await _audit_job_event(
        db,
        user_id=actor if actor != "system" else None,
        action="JOB_STATE_CHANGED",
        job_id=job_id,
        meta={
            "from_state": from_state,
            "to_state": to_state,
            "actor": actor,
            **(meta or {}),
        },
    )

    # Publish SSE event to Redis pub/sub
    await _publish_job_event(
        job_id=job_id,
        state=to_state,
        error_code=error_code,
        error_message=error_message,
        output_asset_id=output_asset_id,
    )

    log.info("job.state_changed", job_id=job_id, from_state=from_state, to_state=to_state)
    return dict(updated)


async def get_job(
    db: AsyncSession,
    *,
    job_id: str,
    user_id: str,
) -> dict[str, Any] | None:
    from sqlalchemy import text  # noqa: PLC0415

    result = await db.execute(
        text("SELECT * FROM jobs WHERE id = :job_id AND user_id = :user_id"),
        {"job_id": job_id, "user_id": user_id},
    )
    row = result.mappings().first()
    return dict(row) if row else None


async def _audit_job_event(
    db: AsyncSession,
    *,
    user_id: str | None,
    action: str,
    job_id: str,
    meta: dict[str, Any],
) -> None:
    from sqlalchemy import text  # noqa: PLC0415

    await db.execute(
        text("""
            INSERT INTO audit_events (id, user_id, action, resource_type, resource_id, meta, created_at)
            VALUES (:id, :user_id, :action, 'job', :resource_id, :meta, :now)
        """),
        {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "action": action,
            "resource_id": job_id,
            "meta": json.dumps(meta),
            "now": datetime.now(timezone.utc),
        },
    )
    await db.commit()


async def _publish_job_event(
    *,
    job_id: str,
    state: str,
    error_code: str | None = None,
    error_message: str | None = None,
    output_asset_id: str | None = None,
) -> None:
    redis = get_redis()
    channel = f"job:{job_id}:events"
    payload = {
        "type": "JOB_STATE_CHANGED",
        "jobId": job_id,
        "state": state,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    if error_code:
        payload["errorCode"] = error_code
    if error_message:
        payload["errorMessage"] = error_message
    if output_asset_id:
        payload["outputAssetId"] = output_asset_id

    await redis.publish(channel, json.dumps(payload))
