from __future__ import annotations

import os
from collections.abc import Generator

import pytest

from app.settings import get_settings


@pytest.fixture(autouse=True)
def base_env() -> Generator[None, None, None]:
    env = {
        "OPENAI_API_KEY": "test-openai-key",
        "OPENAI_MODEL": "gpt-5.5",
        "AVA_API_KEY": "test-ava-key",
        "MIN_ARTIFACT_BYTES": "8",
        "MAX_ARTIFACT_BYTES": "1048576",
        "FFPROBE_PATH": "/bin/true",
    }

    original: dict[str, str | None] = {key: os.environ.get(key) for key in env}
    os.environ.update(env)
    get_settings.cache_clear()

    yield

    for key, value in original.items():
        if value is None:
            os.environ.pop(key, None)
        else:
            os.environ[key] = value
    get_settings.cache_clear()
