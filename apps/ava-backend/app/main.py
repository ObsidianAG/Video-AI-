from __future__ import annotations

from fastapi import FastAPI

from app.routes import artifacts, health, storyboard


def create_app() -> FastAPI:
    app = FastAPI(
        title="AVA Backend",
        version="0.1.0",
        description=(
            "Production FastAPI backend for AVA storyboard generation and artifact integrity "
            "verification."
        ),
    )
    app.include_router(health.router)
    app.include_router(storyboard.router)
    app.include_router(artifacts.router)
    return app


app = create_app()
