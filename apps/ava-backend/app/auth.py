from __future__ import annotations

from typing import Annotated, Any

import jwt
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import Settings, get_settings

_bearer = HTTPBearer(auto_error=True)


def verify_jwt(
    credentials: Annotated[HTTPAuthorizationCredentials, Security(_bearer)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, Any]:
    """Decode and validate a JWT bearer token; raise 401 on any failure."""
    try:
        payload: dict[str, Any] = jwt.decode(
            credentials.credentials,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
            audience=settings.jwt_audience,
        )
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Token expired") from exc
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc
    return payload


def get_current_user_id(
    payload: Annotated[dict[str, Any], Depends(verify_jwt)],
) -> str:
    """Extract the ``sub`` claim from a verified JWT payload."""
    sub = payload.get("sub")
    if not isinstance(sub, str) or not sub:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Token missing sub claim")
    return sub


def get_service_token(
    credentials: Annotated[HTTPAuthorizationCredentials, Security(_bearer)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> str:
    """Verify the internal service token used by the worker process."""
    if credentials.credentials != settings.service_token:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Invalid service token")
    return credentials.credentials
