"""Asset-related Pydantic schemas."""
from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class UploadUrlRequest(BaseModel):
    filename: str = Field(..., min_length=1, max_length=512)
    content_type: str = Field(..., min_length=1, max_length=255)
    project_id: uuid.UUID


class UploadUrlResponse(BaseModel):
    upload_url: str
    asset_id: uuid.UUID
    expires_at: datetime


class ConfirmAssetRequest(BaseModel):
    asset_id: uuid.UUID


class AssetResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    user_id: uuid.UUID
    filename: str
    content_type: str
    size_bytes: int | None
    storage_key: str
    public_url: str | None
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}
