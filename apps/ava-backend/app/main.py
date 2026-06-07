from __future__ import annotations

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI

from app import database
from app.config import get_settings
from app.routers import health, jobs, webhooks

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncGenerator[None, None]:
    settings = get_settings()
    await database.init_pool(settings.database_url)
    logger.info("ava_backend_started")
    yield
    await database.close_pool()
    logger.info("ava_backend_stopped")


def create_app() -> FastAPI:
    app = FastAPI(
        title="AVA Backend",
        description="AI Video Agent — production backend API",
        version="0.1.0",
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url=None,
    )
    app.include_router(health.router, tags=["system"])
    app.include_router(jobs.router, prefix="/api/v1", tags=["jobs"])
    app.include_router(webhooks.router, prefix="/api/v1", tags=["webhooks"])
    return app


app = create_app()
