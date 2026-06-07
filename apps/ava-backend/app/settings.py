from __future__ import annotations

from functools import lru_cache

from pydantic import Field, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    openai_api_key: SecretStr = Field(alias="OPENAI_API_KEY")
    openai_model: str = Field(alias="OPENAI_MODEL", min_length=1)
    ava_api_key: SecretStr = Field(alias="AVA_API_KEY")
    min_artifact_bytes: int = Field(alias="MIN_ARTIFACT_BYTES", ge=1)
    max_artifact_bytes: int = Field(alias="MAX_ARTIFACT_BYTES", ge=1)
    ffprobe_path: str = Field(alias="FFPROBE_PATH", min_length=1)

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="forbid",
        case_sensitive=True,
    )

    @model_validator(mode="after")
    def validate_artifact_bounds(self) -> "Settings":
        if self.max_artifact_bytes < self.min_artifact_bytes:
            raise ValueError("MAX_ARTIFACT_BYTES must be >= MIN_ARTIFACT_BYTES")
        return self


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
