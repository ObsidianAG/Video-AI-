from __future__ import annotations

from enum import StrEnum

from pydantic import BaseModel, Field


class JobState(StrEnum):
    DRAFT = "DRAFT"
    QUEUED = "QUEUED"
    SUBMITTED_TO_PROVIDER = "SUBMITTED_TO_PROVIDER"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED_BY_PROVIDER = "COMPLETED_BY_PROVIDER"
    ARTIFACT_BYTES_VERIFIED = "ARTIFACT_BYTES_VERIFIED"
    STORED_AND_RETRIEVABLE = "STORED_AND_RETRIEVABLE"
    READY_FOR_USER = "READY_FOR_USER"
    FAILED_VALIDATION = "FAILED_VALIDATION"
    ARTIFACT_CHECK_FAILED = "ARTIFACT_CHECK_FAILED"
    HOLD_NO_REAL_VIDEO_ARTIFACT = "HOLD_NO_REAL_VIDEO_ARTIFACT"
    PROVIDER_UNCONFIGURED = "PROVIDER_UNCONFIGURED"


class StoryboardRequest(BaseModel):
    business_goal: str = Field(min_length=5, max_length=1000)
    audience: str = Field(min_length=2, max_length=500)
    video_style: str = Field(min_length=2, max_length=500)
    duration_seconds: int = Field(ge=3, le=120)


class Scene(BaseModel):
    scene_number: int = Field(ge=1)
    visual: str = Field(min_length=1)
    narration: str = Field(min_length=1)
    camera_direction: str = Field(min_length=1)


class StoryboardPlan(BaseModel):
    title: str = Field(min_length=1)
    scenes: list[Scene] = Field(min_length=1)
    final_video_prompt: str = Field(min_length=1)
    safety_notes: list[str] = Field(default_factory=list)


class StoryboardResponse(BaseModel):
    state: JobState
    ready_for_user: bool
    storyboard: StoryboardPlan


class ArtifactVerificationResult(BaseModel):
    artifact_integrity_verified: bool
    deepfake_verified: bool = False
    reason: str | None
    bytes: int | None
    sha256: str | None
    next_state: JobState
