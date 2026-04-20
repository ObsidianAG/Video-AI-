"""Job-related Pydantic schemas."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


ProviderName = Literal["veo", "kling", "anthropic", "vllm", "gemini"]
JobType = Literal["TEXT_TO_VIDEO", "IMAGE_TO_VIDEO", "TEXT_TO_TEXT"]
JobState = Literal[
    "CREATED", "QUEUED", "STARTED", "PROVIDER_RUNNING",
    "UPLOADING", "SUCCEEDED", "FAILED", "CANCELLED",
]


class GenerateVideoParams(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=2000)
    image_url: str | None = None
    duration_seconds: int = Field(default=5, ge=1, le=60)
    aspect_ratio: Literal["16:9", "9:16", "1:1"] = "16:9"
    fps: Literal[24, 30, 60] | None = None
    seed: int | None = None
    provider_params: dict[str, Any] = Field(default_factory=dict)


class GenerateTextParams(BaseModel):
    system_prompt: str = Field(..., min_length=1)
    user_message: str = Field(..., min_length=1)
    max_tokens: int | None = Field(default=None, ge=1, le=200000)
    temperature: float | None = Field(default=None, ge=0.0, le=2.0)


class CreateJobRequest(BaseModel):
    project_id: uuid.UUID
    prompt_id: uuid.UUID
    provider: ProviderName
    job_type: JobType
    input_asset_id: uuid.UUID | None = None
    params: GenerateVideoParams | GenerateTextParams
    idempotency_key: str = Field(..., min_length=1, max_length=255)


class CancelJobRequest(BaseModel):
    reason: str | None = Field(default=None, max_length=1024)


class JobResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    user_id: uuid.UUID
    prompt_id: uuid.UUID
    provider: str
    job_type: str
    state: str
    input_asset_id: uuid.UUID | None
    output_asset_id: uuid.UUID | None
    provider_operation_id: str | None
    params: dict[str, Any]
    idempotency_key: str
    attempt_count: int
    max_attempts: int
    error_code: str | None
    error_message: str | None
    created_at: datetime
    updated_at: datetime
    started_at: datetime | None
    completed_at: datetime | None

    model_config = {"from_attributes": True}


class PaginatedJobsResponse(BaseModel):
    items: list[JobResponse]
    total: int
    page: int
    page_size: int
    has_more: bool
