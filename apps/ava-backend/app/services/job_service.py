from __future__ import annotations

import json
import uuid
from typing import Any

import structlog

from app.services.state_machine import TERMINAL_STATES, can_transition

logger = structlog.get_logger()


async def create_job(
    conn: Any,
    *,
    user_id: str,
    prompt: str,
    settings: dict[str, Any],
) -> dict[str, Any]:
    """
    Insert a new ``video_jobs`` row at state ``PROMPT_RECEIVED``.

    Also upserts a ``users`` row for the JWT sub so any valid JWT is accepted on
    first use.  Real user registration (with email, display name, etc.) belongs
    in the auth flow and must replace this placeholder before going to production.
    """
    user_uuid = uuid.UUID(user_id)
    job_id = uuid.uuid4()

    async with conn.transaction():
        await conn.execute(
            """
            INSERT INTO users (id, email)
            VALUES ($1, $2)
            ON CONFLICT (id) DO NOTHING
            """,
            user_uuid,
            f"jwt:{user_id}",
        )

        row = await conn.fetchrow(
            """
            INSERT INTO video_jobs (id, user_id, prompt, settings, state)
            VALUES ($1, $2, $3, $4::jsonb, 'PROMPT_RECEIVED')
            RETURNING
              id, user_id, prompt, settings, state, state_reason,
              state_updated_at, provider_label, provider_model_id,
              failure_reason, created_at, updated_at
            """,
            job_id,
            user_uuid,
            prompt,
            json.dumps(settings),
        )

        await conn.execute(
            """
            INSERT INTO video_job_state_history (job_id, from_state, to_state, reason)
            VALUES ($1, NULL, 'PROMPT_RECEIVED', 'job created')
            """,
            job_id,
        )

    result: dict[str, Any] = dict(row)
    logger.info("job_created", job_id=str(job_id), user_id=user_id)
    return result


async def get_job(
    conn: Any,
    *,
    job_id: str,
    user_id: str,
) -> dict[str, Any] | None:
    """Return a job row if it exists and is owned by ``user_id``, else None."""
    row = await conn.fetchrow(
        """
        SELECT
          id, user_id, prompt, settings, state, state_reason,
          state_updated_at, provider_label, provider_model_id,
          failure_reason, created_at, updated_at
        FROM video_jobs
        WHERE id = $1 AND user_id = $2
        """,
        uuid.UUID(job_id),
        uuid.UUID(user_id),
    )
    return dict(row) if row else None


async def list_jobs(
    conn: Any,
    *,
    user_id: str,
    limit: int = 20,
    offset: int = 0,
) -> tuple[list[dict[str, Any]], int]:
    """Return a paginated list of jobs for ``user_id``, newest first."""
    rows = await conn.fetch(
        """
        SELECT
          id, user_id, prompt, settings, state, state_reason,
          state_updated_at, provider_label, provider_model_id,
          failure_reason, created_at, updated_at
        FROM video_jobs
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
        """,
        uuid.UUID(user_id),
        limit,
        offset,
    )
    total = await conn.fetchval(
        "SELECT COUNT(*) FROM video_jobs WHERE user_id = $1",
        uuid.UUID(user_id),
    )
    return [dict(r) for r in rows], int(total or 0)


async def advance_state(
    conn: Any,
    *,
    job_id: str,
    to_state: str,
    reason: str | None,
    metadata: dict[str, Any],
) -> dict[str, Any]:
    """
    Advance a ``video_job`` to ``to_state``.

    Validates the transition against the state machine *before* writing.
    Raises ``ValueError`` if the transition is not permitted.
    All DB writes occur inside a single transaction.
    """
    job_uuid = uuid.UUID(job_id)
    row = await conn.fetchrow(
        "SELECT id, state FROM video_jobs WHERE id = $1",
        job_uuid,
    )
    if row is None:
        raise ValueError(f"Job not found: {job_id!r}")

    current_state: str = row["state"]
    if current_state in TERMINAL_STATES:
        raise ValueError(f"Job {job_id!r} is already in terminal state {current_state!r}")

    if not can_transition(current_state, to_state):
        raise ValueError(f"Transition {current_state!r} → {to_state!r} is not permitted")

    async with conn.transaction():
        updated = await conn.fetchrow(
            """
            UPDATE video_jobs
            SET state = $2, state_updated_at = now(), updated_at = now()
            WHERE id = $1
            RETURNING
              id, user_id, prompt, settings, state, state_reason,
              state_updated_at, provider_label, provider_model_id,
              failure_reason, created_at, updated_at
            """,
            job_uuid,
            to_state,
        )
        await conn.execute(
            """
            INSERT INTO video_job_state_history
              (job_id, from_state, to_state, reason, metadata)
            VALUES ($1, $2, $3, $4, $5::jsonb)
            """,
            job_uuid,
            current_state,
            to_state,
            reason,
            json.dumps(metadata),
        )

    result: dict[str, Any] = dict(updated)
    logger.info(
        "job_state_advanced",
        job_id=job_id,
        from_state=current_state,
        to_state=to_state,
    )
    return result
