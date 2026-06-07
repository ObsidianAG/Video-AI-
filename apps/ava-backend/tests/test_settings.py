from __future__ import annotations

import os

import pytest
from pydantic import ValidationError

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
    payload = {
        "OPENAI_API_KEY": "k",
        "OPENAI_MODEL": "gpt-5.5",
        "AVA_API_KEY": "k2",
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
        Settings(**payload)


def test_invalid_numeric_bounds_fail_validation() -> None:
    with pytest.raises(ValidationError):
        Settings(
            OPENAI_API_KEY="k",
            OPENAI_MODEL="gpt-5.5",
            AVA_API_KEY="k2",
            MIN_ARTIFACT_BYTES=100,
            MAX_ARTIFACT_BYTES=99,
            FFPROBE_PATH="/bin/true",
        )


def test_invalid_config_rejected() -> None:
    os.environ["MIN_ARTIFACT_BYTES"] = "not-an-int"
    with pytest.raises(ValidationError):
        Settings()
