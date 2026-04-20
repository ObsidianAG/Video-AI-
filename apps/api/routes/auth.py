"""Auth routes — login, logout, me."""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone

import structlog
from fastapi import APIRouter, HTTPException, Request, Response, status
from sqlalchemy import text

from auth import AuthDep, DbDep, create_access_token, hash_password, verify_password
from schemas.users import AuthResponse, LoginRequest

log = structlog.get_logger(__name__)
router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=AuthResponse)
async def login(
    body: LoginRequest,
    request: Request,
    response: Response,
    db: DbDep,
) -> AuthResponse:
    result = await db.execute(
        text("SELECT id, email, name, role, password_hash FROM users WHERE email = :email"),
        {"email": body.email},
    )
    row = result.mappings().first()

    if not row or not verify_password(body.password, row["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    token = create_access_token(str(row["id"]), row["email"])

    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=3600,
    )

    # Audit
    await db.execute(
        text("""
            INSERT INTO audit_events (id, user_id, action, resource_type, resource_id, meta, ip_address, user_agent, created_at)
            VALUES (:id, :user_id, 'USER_LOGIN', 'user', :resource_id, :meta, :ip, :ua, :now)
        """),
        {
            "id": str(uuid.uuid4()),
            "user_id": str(row["id"]),
            "resource_id": str(row["id"]),
            "meta": json.dumps({}),
            "ip": request.client.host if request.client else None,
            "ua": request.headers.get("user-agent"),
            "now": datetime.now(timezone.utc),
        },
    )
    await db.commit()

    log.info("auth.login", user_id=str(row["id"]))
    return AuthResponse(
        user_id=str(row["id"]),
        email=row["email"],
        name=row["name"],
        role=row["role"],
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    current_user: AuthDep,
    request: Request,
    response: Response,
    db: DbDep,
) -> None:
    response.delete_cookie(key="access_token")

    await db.execute(
        text("""
            INSERT INTO audit_events (id, user_id, action, resource_type, resource_id, meta, ip_address, user_agent, created_at)
            VALUES (:id, :user_id, 'USER_LOGOUT', 'user', :resource_id, :meta, :ip, :ua, :now)
        """),
        {
            "id": str(uuid.uuid4()),
            "user_id": current_user.user_id,
            "resource_id": current_user.user_id,
            "meta": json.dumps({}),
            "ip": request.client.host if request.client else None,
            "ua": request.headers.get("user-agent"),
            "now": datetime.now(timezone.utc),
        },
    )
    await db.commit()
    log.info("auth.logout", user_id=current_user.user_id)


@router.get("/me", response_model=AuthResponse)
async def me(current_user: AuthDep, db: DbDep) -> AuthResponse:
    result = await db.execute(
        text("SELECT id, email, name, role FROM users WHERE id = :id"),
        {"id": current_user.user_id},
    )
    row = result.mappings().first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    return AuthResponse(
        user_id=str(row["id"]),
        email=row["email"],
        name=row["name"],
        role=row["role"],
    )
