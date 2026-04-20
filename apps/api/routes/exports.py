"""Exports routes."""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone

import structlog
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import text

from auth import AuthDep, DbDep
from schemas.misc import CreateExportRequest, ExportResponse

log = structlog.get_logger(__name__)
router = APIRouter(prefix="/api/exports", tags=["exports"])


@router.post("", response_model=ExportResponse, status_code=status.HTTP_201_CREATED)
async def create_export(
    body: CreateExportRequest,
    current_user: AuthDep,
    db: DbDep,
) -> ExportResponse:
    proj = await db.execute(
        text("SELECT id FROM projects WHERE id = :id AND user_id = :user_id"),
        {"id": str(body.project_id), "user_id": current_user.user_id},
    )
    if not proj.first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    export_id = str(uuid.uuid4())
    version_ids_str = [str(v) for v in body.version_ids]
    now = datetime.now(timezone.utc)

    await db.execute(
        text("""
            INSERT INTO exports (id, project_id, user_id, version_ids, format, resolution, fps, status, created_at)
            VALUES (:id, :project_id, :user_id, :version_ids, :format, :resolution, :fps, 'PENDING', :now)
        """),
        {
            "id": export_id,
            "project_id": str(body.project_id),
            "user_id": current_user.user_id,
            "version_ids": json.dumps(version_ids_str),
            "format": body.format,
            "resolution": body.resolution,
            "fps": body.fps,
            "now": now,
        },
    )

    await db.execute(
        text("""
            INSERT INTO audit_events (id, user_id, action, resource_type, resource_id, meta, created_at)
            VALUES (:id, :user_id, 'EXPORT_CREATED', 'export', :resource_id, :meta, :now)
        """),
        {
            "id": str(uuid.uuid4()),
            "user_id": current_user.user_id,
            "resource_id": export_id,
            "meta": json.dumps({"format": body.format, "resolution": body.resolution}),
            "now": now,
        },
    )
    await db.commit()

    result = await db.execute(
        text("SELECT * FROM exports WHERE id = :id"),
        {"id": export_id},
    )
    row = result.mappings().first()
    assert row is not None
    log.info("export.created", export_id=export_id)
    return ExportResponse.model_validate(dict(row))


@router.get("/{export_id}", response_model=ExportResponse)
async def get_export(export_id: uuid.UUID, current_user: AuthDep, db: DbDep) -> ExportResponse:
    result = await db.execute(
        text("SELECT * FROM exports WHERE id = :id AND user_id = :user_id"),
        {"id": str(export_id), "user_id": current_user.user_id},
    )
    row = result.mappings().first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Export not found")
    return ExportResponse.model_validate(dict(row))
