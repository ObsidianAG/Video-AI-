from __future__ import annotations

import os
from typing import Any

import pytest
from pydantic import ValidationError
from pydantic import SecretStr

from app.settings import Settings


@pytest.mark.parametrize(
    "missing_key",
    [
        "OPENAI_API_KEY",
        "OPENAI_MODEL",
        "AVA_API_KEY",
        "MIN_ARTIFACT_BYTES",
        "MAX_ARTIFACT_BYTES",
        "FFPROBE_PATH",
    ],
)
def test_missing_required_env_fails_closed(missing_key: str) -> None:
    payload: dict[str, Any] = {
        "OPENAI_API_KEY": SecretStr("k"),
        "OPENAI_MODEL": "gpt-5.5",
        "AVA_API_KEY": SecretStr("k2"),
        "MIN_ARTIFACT_BYTES": 8,
        "MAX_ARTIFACT_BYTES": 16,
        "FFPROBE_PATH": "/bin/true",
    }
    payload.pop(missing_key)
    for key in (
        "OPENAI_API_KEY",
        "OPENAI_MODEL",
        "AVA_API_KEY",
        "MIN_ARTIFACT_BYTES",
        "MAX_ARTIFACT_BYTES",
        "FFPROBE_PATH",
    ):
        os.environ.pop(key, None)

    with pytest.raises(ValidationError):
        Settings.model_validate(payload)


def test_invalid_numeric_bounds_fail_validation() -> None:
    with pytest.raises(ValidationError):
        Settings(
            OPENAI_API_KEY=SecretStr("k"),
            OPENAI_MODEL="gpt-5.5",
            AVA_API_KEY=SecretStr("k2"),
            MIN_ARTIFACT_BYTES=100,
            MAX_ARTIFACT_BYTES=99,
            FFPROBE_PATH="/bin/true",
        )


def test_invalid_config_rejected() -> None:
    os.environ["OPENAI_API_KEY"] = "k"
    os.environ["OPENAI_MODEL"] = "gpt-5.5"
    os.environ["AVA_API_KEY"] = "k2"
    os.environ["MIN_ARTIFACT_BYTES"] = "not-an-int"
    os.environ["MAX_ARTIFACT_BYTES"] = "16"
    os.environ["FFPROBE_PATH"] = "/bin/true"
    with pytest.raises(ValidationError):
        Settings()  # type: ignore[call-arg]
