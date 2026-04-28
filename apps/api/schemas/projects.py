"""Project-related Pydantic schemas."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class CreateProjectRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=4096)


class UpdateProjectRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=4096)
    status: Literal["ACTIVE", "ARCHIVED"] | None = None


class ProjectResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    description: str | None
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PaginatedProjectsResponse(BaseModel):
    items: list[ProjectResponse]
    total: int
    page: int
    page_size: int
    has_more: bool
