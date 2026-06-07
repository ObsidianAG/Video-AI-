from __future__ import annotations

from secrets import compare_digest
from typing import Annotated

from fastapi import Depends, Header, HTTPException, status

from app.settings import Settings, get_settings


def require_api_key(
    x_ava_api_key: Annotated[str | None, Header(alias="X-AVA-API-Key")] = None,
    settings: Settings = Depends(get_settings),
) -> None:
    expected = settings.ava_api_key.get_secret_value()
    if x_ava_api_key is None or not compare_digest(x_ava_api_key, expected):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
