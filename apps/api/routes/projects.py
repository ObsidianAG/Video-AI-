"""Project CRUD routes."""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone

import structlog
from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import text

from auth import AuthDep, DbDep
from schemas.projects import (
    CreateProjectRequest,
    PaginatedProjectsResponse,
    ProjectResponse,
    UpdateProjectRequest,
)

log = structlog.get_logger(__name__)
router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    body: CreateProjectRequest,
    current_user: AuthDep,
    db: DbDep,
) -> ProjectResponse:
    project_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    await db.execute(
        text("""
            INSERT INTO projects (id, user_id, name, description, status, created_at, updated_at)
            VALUES (:id, :user_id, :name, :description, 'ACTIVE', :now, :now)
        """),
        {
            "id": project_id,
            "user_id": current_user.user_id,
            "name": body.name,
            "description": body.description,
            "now": now,
        },
    )

    await db.execute(
        text("""
            INSERT INTO audit_events (id, user_id, action, resource_type, resource_id, meta, created_at)
            VALUES (:id, :user_id, 'PROJECT_CREATED', 'project', :resource_id, :meta, :now)
        """),
        {
            "id": str(uuid.uuid4()),
            "user_id": current_user.user_id,
            "resource_id": project_id,
            "meta": json.dumps({"name": body.name}),
            "now": now,
        },
    )
    await db.commit()

    result = await db.execute(
        text("SELECT * FROM projects WHERE id = :id"),
        {"id": project_id},
    )
    row = result.mappings().first()
    assert row is not None
    log.info("project.created", project_id=project_id, user_id=current_user.user_id)
    return ProjectResponse.model_validate(dict(row))


@router.get("", response_model=PaginatedProjectsResponse)
async def list_projects(
    current_user: AuthDep,
    db: DbDep,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    status_filter: str | None = Query(default=None, alias="status"),
) -> PaginatedProjectsResponse:
    offset = (page - 1) * page_size
    where = "WHERE user_id = :user_id"
    params: dict = {"user_id": current_user.user_id, "limit": page_size, "offset": offset}

    if status_filter:
        where += " AND status = :status"
        params["status"] = status_filter

    count_result = await db.execute(
        text(f"SELECT COUNT(*) FROM projects {where}"),
        params,
    )
    total = count_result.scalar() or 0

    rows_result = await db.execute(
        text(f"SELECT * FROM projects {where} ORDER BY created_at DESC LIMIT :limit OFFSET :offset"),
        params,
    )
    rows = rows_result.mappings().all()

    return PaginatedProjectsResponse(
        items=[ProjectResponse.model_validate(dict(r)) for r in rows],
        total=total,
        page=page,
        page_size=page_size,
        has_more=(page * page_size) < total,
    )


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: uuid.UUID, current_user: AuthDep, db: DbDep) -> ProjectResponse:
    result = await db.execute(
        text("SELECT * FROM projects WHERE id = :id AND user_id = :user_id"),
        {"id": str(project_id), "user_id": current_user.user_id},
    )
    row = result.mappings().first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return ProjectResponse.model_validate(dict(row))


@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: uuid.UUID,
    body: UpdateProjectRequest,
    current_user: AuthDep,
    db: DbDep,
) -> ProjectResponse:
    existing = await db.execute(
        text("SELECT * FROM projects WHERE id = :id AND user_id = :user_id"),
        {"id": str(project_id), "user_id": current_user.user_id},
    )
    if not existing.mappings().first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    updates: dict = {}
    if body.name is not None:
        updates["name"] = body.name
    if body.description is not None:
        updates["description"] = body.description
    if body.status is not None:
        updates["status"] = body.status

    if not updates:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update")

    now = datetime.now(timezone.utc)
    updates["updated_at"] = now
    set_clause = ", ".join(f"{k} = :{k}" for k in updates)

    await db.execute(
        text(f"UPDATE projects SET {set_clause} WHERE id = :id AND user_id = :user_id"),
        {**updates, "id": str(project_id), "user_id": current_user.user_id},
    )

    await db.execute(
        text("""
            INSERT INTO audit_events (id, user_id, action, resource_type, resource_id, meta, created_at)
            VALUES (:id, :user_id, 'PROJECT_UPDATED', 'project', :resource_id, :meta, :now)
        """),
        {
            "id": str(uuid.uuid4()),
            "user_id": current_user.user_id,
            "resource_id": str(project_id),
            "meta": json.dumps(updates),
            "now": now,
        },
    )
    await db.commit()

    result = await db.execute(
        text("SELECT * FROM projects WHERE id = :id"),
        {"id": str(project_id)},
    )
    row = result.mappings().first()
    assert row is not None
    return ProjectResponse.model_validate(dict(row))


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(project_id: uuid.UUID, current_user: AuthDep, db: DbDep) -> None:
    result = await db.execute(
        text("DELETE FROM projects WHERE id = :id AND user_id = :user_id RETURNING id"),
        {"id": str(project_id), "user_id": current_user.user_id},
    )
    if not result.first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    await db.execute(
        text("""
            INSERT INTO audit_events (id, user_id, action, resource_type, resource_id, meta, created_at)
            VALUES (:id, :user_id, 'PROJECT_DELETED', 'project', :resource_id, :meta, :now)
        """),
        {
            "id": str(uuid.uuid4()),
            "user_id": current_user.user_id,
            "resource_id": str(project_id),
            "meta": json.dumps({}),
            "now": datetime.now(timezone.utc),
        },
    )
    await db.commit()
    log.info("project.deleted", project_id=str(project_id))
