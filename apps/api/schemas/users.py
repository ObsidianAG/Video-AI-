"""User-related Pydantic schemas."""
from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class UserRow(BaseModel):
    """Internal user row returned from DB queries."""

    id: uuid.UUID
    email: str
    name: str
    role: str
    email_verified: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)


class AuthResponse(BaseModel):
    user_id: str
    email: str
    name: str
    role: str
