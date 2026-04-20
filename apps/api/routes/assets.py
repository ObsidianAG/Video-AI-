"""Asset routes — signed upload URLs, confirmation."""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone

import structlog
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import text

from auth import AuthDep, DbDep
from schemas.assets import AssetResponse, ConfirmAssetRequest, UploadUrlRequest, UploadUrlResponse
from services.storage_service import generate_upload_url, get_public_url

log = structlog.get_logger(__name__)
router = APIRouter(prefix="/api/assets", tags=["assets"])


@router.post("/upload-url", response_model=UploadUrlResponse, status_code=status.HTTP_201_CREATED)
async def get_upload_url(
    body: UploadUrlRequest,
    current_user: AuthDep,
    db: DbDep,
) -> UploadUrlResponse:
    # Verify project ownership
    proj = await db.execute(
        text("SELECT id FROM projects WHERE id = :id AND user_id = :user_id"),
        {"id": str(body.project_id), "user_id": current_user.user_id},
    )
    if not proj.first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    asset_id = str(uuid.uuid4())
    upload_url, storage_key, expires_at = generate_upload_url(
        project_id=str(body.project_id),
        filename=body.filename,
        content_type=body.content_type,
        asset_id=asset_id,
    )

    now = datetime.now(timezone.utc)
    await db.execute(
        text("""
            INSERT INTO assets (id, project_id, user_id, filename, content_type, storage_key, status, metadata, created_at, updated_at)
            VALUES (:id, :project_id, :user_id, :filename, :content_type, :storage_key, 'PENDING', :meta, :now, :now)
        """),
        {
            "id": asset_id,
            "project_id": str(body.project_id),
            "user_id": current_user.user_id,
            "filename": body.filename,
            "content_type": body.content_type,
            "storage_key": storage_key,
            "meta": json.dumps({}),
            "now": now,
        },
    )

    await db.execute(
        text("""
            INSERT INTO audit_events (id, user_id, action, resource_type, resource_id, meta, created_at)
            VALUES (:id, :user_id, 'ASSET_UPLOADED', 'asset', :resource_id, :meta, :now)
        """),
        {
            "id": str(uuid.uuid4()),
            "user_id": current_user.user_id,
            "resource_id": asset_id,
            "meta": json.dumps({"filename": body.filename, "content_type": body.content_type}),
            "now": now,
        },
    )
    await db.commit()

    log.info("asset.upload_url_created", asset_id=asset_id)
    return UploadUrlResponse(
        upload_url=upload_url,
        asset_id=uuid.UUID(asset_id),
        expires_at=expires_at,
    )


@router.post("/confirm", response_model=AssetResponse)
async def confirm_asset(
    body: ConfirmAssetRequest,
    current_user: AuthDep,
    db: DbDep,
) -> AssetResponse:
    result = await db.execute(
        text("SELECT * FROM assets WHERE id = :id AND user_id = :user_id"),
        {"id": str(body.asset_id), "user_id": current_user.user_id},
    )
    row = result.mappings().first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")

    if row["status"] != "PENDING":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Asset is already in state: {row['status']}",
        )

    public_url = get_public_url(row["storage_key"])
    now = datetime.now(timezone.utc)

    await db.execute(
        text("""
            UPDATE assets SET status = 'CONFIRMED', public_url = :public_url, updated_at = :now
            WHERE id = :id
        """),
        {"public_url": public_url, "now": now, "id": str(body.asset_id)},
    )

    await db.execute(
        text("""
            INSERT INTO audit_events (id, user_id, action, resource_type, resource_id, meta, created_at)
            VALUES (:id, :user_id, 'ASSET_CONFIRMED', 'asset', :resource_id, :meta, :now)
        """),
        {
            "id": str(uuid.uuid4()),
            "user_id": current_user.user_id,
            "resource_id": str(body.asset_id),
            "meta": json.dumps({}),
            "now": now,
        },
    )
    await db.commit()

    updated = await db.execute(
        text("SELECT * FROM assets WHERE id = :id"),
        {"id": str(body.asset_id)},
    )
    row = updated.mappings().first()
    assert row is not None
    log.info("asset.confirmed", asset_id=str(body.asset_id))
    return AssetResponse.model_validate(dict(row))
