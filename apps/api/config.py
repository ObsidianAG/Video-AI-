"""Application settings with fail-loud validation via pydantic-settings."""
from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import AnyHttpUrl, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # App
    app_env: Literal["development", "staging", "production"] = "development"
    api_base_url: AnyHttpUrl = Field(default="http://localhost:8000")
    web_base_url: AnyHttpUrl = Field(default="http://localhost:3000")
    allowed_origins: str = "http://localhost:3000"

    # Database
    database_url: str = Field(...)

    # Redis
    redis_url: str = Field(...)

    # JWT
    jwt_secret: str = Field(..., min_length=32)
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60

    # AWS / S3
    aws_region: str = Field(...)
    aws_access_key_id: str = Field(...)
    aws_secret_access_key: str = Field(...)
    s3_bucket: str = Field(...)
    s3_presigned_expire_seconds: int = 900

    # Google Cloud / Vertex AI
    google_cloud_project: str = Field(...)
    google_cloud_region: str = "us-central1"
    vertex_ai_endpoint: str = "us-central1-aiplatform.googleapis.com"
    veo_model: str = "veo-3.0-generate-preview"

    # Anthropic
    anthropic_api_key: str = Field(...)

    # Kling
    kling_api_key: str = Field(...)
    kling_api_base_url: str = "https://api.klingai.com"

    # vLLM
    vllm_base_url: str = Field(...)
    vllm_model: str = "meta-llama/Llama-3-8b-instruct"

    # Gemini (optional verifier)
    gemini_api_key: str | None = None
    gemini_model: str = "gemini-2.5-pro"

    # Media service
    media_service_url: AnyHttpUrl = Field(default="http://localhost:3001")
    media_service_secret: str = Field(...)

    # OpenTelemetry
    otel_exporter_otlp_endpoint: str = "http://localhost:4317"
    otel_service_name: str = "veo3-api"
    otel_traces_sampler: str = "parentbased_traceidratio"
    otel_traces_sampler_arg: float = 0.1

    # QNEO Digital Twin
    qneo_snapshot_ttl_seconds: int = 30
    qneo_redis_key_prefix: str = "qneo:snapshot:"

    # Queue
    job_queue_key: str = "jobs:queue"
    job_dlq_key: str = "jobs:dlq"
    job_processing_key: str = "jobs:processing"

    @field_validator("allowed_origins")
    @classmethod
    def parse_origins(cls, v: str) -> str:
        """Validate that origins are non-empty."""
        origins = [o.strip() for o in v.split(",") if o.strip()]
        if not origins:
            raise ValueError("ALLOWED_ORIGINS must contain at least one origin")
        return v

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return cached application settings. Raises on missing required vars."""
    return Settings()
