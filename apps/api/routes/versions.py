"""Versions routes."""
from __future__ import annotations

import uuid

import structlog
from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import text

from auth import AuthDep, DbDep
from schemas.misc import VersionResponse

log = structlog.get_logger(__name__)
router = APIRouter(prefix="/api/projects", tags=["versions"])


@router.get("/{project_id}/versions", response_model=list[VersionResponse])
async def list_versions(
    project_id: uuid.UUID,
    current_user: AuthDep,
    db: DbDep,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
) -> list[VersionResponse]:
    proj = await db.execute(
        text("SELECT id FROM projects WHERE id = :id AND user_id = :user_id"),
        {"id": str(project_id), "user_id": current_user.user_id},
    )
    if not proj.first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    offset = (page - 1) * page_size
    rows_result = await db.execute(
        text("""
            SELECT * FROM versions
            WHERE project_id = :project_id
            ORDER BY version_number DESC
            LIMIT :limit OFFSET :offset
        """),
        {"project_id": str(project_id), "limit": page_size, "offset": offset},
    )
    rows = rows_result.mappings().all()
    return [VersionResponse.model_validate(dict(r)) for r in rows]
