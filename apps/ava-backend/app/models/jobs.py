from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, field_validator

from app.services.state_machine import VIDEO_JOB_STATES


class CreateJobRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=4000)
    settings: dict[str, Any] = Field(default_factory=dict)


class JobResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    prompt: str
    settings: dict[str, Any]
    state: str
    state_reason: str | None
    state_updated_at: datetime
    provider_label: str | None
    provider_model_id: str | None
    failure_reason: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class JobListResponse(BaseModel):
    items: list[JobResponse]
    total: int
    limit: int
    offset: int


class AdvanceStateRequest(BaseModel):
    """Internal-only request body — worker advances job state via service token."""

    to_state: str = Field(..., description="Target state from the video job state machine")
    reason: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)

    @field_validator("to_state")
    @classmethod
    def _validate_state(cls, v: str) -> str:
        if v not in VIDEO_JOB_STATES:
            raise ValueError(f"Unknown state: {v!r}")
        return v
