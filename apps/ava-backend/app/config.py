from __future__ import annotations

from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Fail-loud configuration.

    Every field without a default is required from the environment (or .env).
    Missing required values raise ``ValidationError`` at startup — no silent defaults.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # ── Database ──────────────────────────────────────────────────────────────
    database_url: str

    # ── Auth ─────────────────────────────────────────────────────────────────
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    jwt_audience: str = "ava-backend"

    # ── Internal service token (worker → API) ─────────────────────────────────
    service_token: str

    # ── Optional integrations ─────────────────────────────────────────────────
    openai_api_key: str | None = None

    # ── Server ───────────────────────────────────────────────────────────────
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = False

    @field_validator("jwt_secret")
    @classmethod
    def _jwt_secret_length(cls, v: str) -> str:
        if len(v) < 32:
            raise ValueError("jwt_secret must be at least 32 characters")
        return v

    @field_validator("service_token")
    @classmethod
    def _service_token_length(cls, v: str) -> str:
        if len(v) < 32:
            raise ValueError("service_token must be at least 32 characters")
        return v


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
