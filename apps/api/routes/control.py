"""QNEO control snapshot route — read-only digital twin view."""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone

import structlog
from fastapi import APIRouter
from sqlalchemy import text

from auth import AuthDep, DbDep
from schemas.misc import QNEOControlSnapshotResponse
from services.qneo_service import get_control_snapshot

log = structlog.get_logger(__name__)
router = APIRouter(prefix="/api/control", tags=["control"])


@router.get("/snapshot", response_model=QNEOControlSnapshotResponse)
async def get_snapshot(current_user: AuthDep, db: DbDep) -> QNEOControlSnapshotResponse:
    """Return the latest QNEO control snapshot. Read-only; computed server-side."""
    snapshot = await get_control_snapshot()

    # Audit the read
    await db.execute(
        text("""
            INSERT INTO audit_events (id, user_id, action, resource_type, resource_id, meta, created_at)
            VALUES (:id, :user_id, 'CONTROL_SNAPSHOT_READ', 'control_snapshot', NULL, :meta, :now)
        """),
        {
            "id": str(uuid.uuid4()),
            "user_id": current_user.user_id,
            "meta": json.dumps({"snapshot_id": snapshot["snapshot_id"]}),
            "now": datetime.now(timezone.utc),
        },
    )
    await db.commit()

    return QNEOControlSnapshotResponse(**snapshot)
