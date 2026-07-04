from __future__ import annotations

from collections.abc import AsyncGenerator
from typing import Annotated, Any

from fastapi import Depends

from app.auth import get_current_user_id, get_service_token
from app.database import get_pool


async def get_db() -> AsyncGenerator[Any, None]:
    """Yield an asyncpg connection from the shared pool."""
    pool = get_pool()
    async with pool.acquire() as conn:
        yield conn


DbDep = Annotated[Any, Depends(get_db)]
AuthDep = Annotated[str, Depends(get_current_user_id)]
ServiceTokenDep = Annotated[str, Depends(get_service_token)]
