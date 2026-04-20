"""Version, export, audit, and control Pydantic schemas."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


# ── Versions ──────────────────────────────────────────────────

class VersionResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    job_id: uuid.UUID
    asset_id: uuid.UUID
    version_number: int
    label: str | None
    metadata: dict[str, Any]
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Exports ───────────────────────────────────────────────────

class CreateExportRequest(BaseModel):
    project_id: uuid.UUID
    version_ids: list[uuid.UUID] = Field(..., min_length=1)
    format: Literal["MP4", "MOV", "WEBM"] = "MP4"
    resolution: Literal["1080p", "4K", "720p"] = "1080p"
    fps: Literal[24, 30, 60] = 24


class ExportResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    user_id: uuid.UUID
    version_ids: list[str]
    format: str
    resolution: str
    fps: int
    status: str
    output_url: str | None
    created_at: datetime
    completed_at: datetime | None

    model_config = {"from_attributes": True}


# ── Audit Events ──────────────────────────────────────────────

class AuditEventResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID | None
    action: str
    resource_type: str
    resource_id: uuid.UUID | None
    meta: dict[str, Any]
    ip_address: str | None
    user_agent: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── QNEO Control Snapshot ─────────────────────────────────────

class QNEOMetricSchema(BaseModel):
    name: str
    value: float
    unit: str
    timestamp: str


class QNEOProviderHealthSchema(BaseModel):
    provider: str
    healthy: bool
    latency_ms: float | None
    error_rate: float
    last_checked_at: str


class QNEOJobQueueStatsSchema(BaseModel):
    queue_depth: int
    processing_count: int
    dlq_depth: int
    avg_wait_ms: float | None


class QNEOControlSnapshotResponse(BaseModel):
    snapshot_id: str
    computed_at: str
    ttl_seconds: int
    system_health_score: int
    provider_health: list[QNEOProviderHealthSchema]
    job_queue_stats: QNEOJobQueueStatsSchema
    active_job_count: int
    metrics: list[QNEOMetricSchema]
    alerts: list[str]
