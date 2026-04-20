"""FastAPI application entry point."""
from __future__ import annotations

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.trace.sampling import ParentBasedTraceIdRatio

from config import get_settings
from database import close_database, ping_database
from redis_client import close_redis, ping_redis
from routes import auth, assets, control, exports, health, jobs, projects, versions

# Configure structured logging
structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.dev.ConsoleRenderer()
        if get_settings().app_env == "development"
        else structlog.processors.JSONRenderer(),
    ]
)

log = structlog.get_logger(__name__)


def _setup_telemetry(settings) -> None:  # type: ignore[no-untyped-def]
    sampler = ParentBasedTraceIdRatio(settings.otel_traces_sampler_arg)
    resource = Resource.create({"service.name": settings.otel_service_name})
    provider = TracerProvider(resource=resource, sampler=sampler)

    exporter = OTLPSpanExporter(endpoint=settings.otel_exporter_otlp_endpoint, insecure=True)
    provider.add_span_processor(BatchSpanProcessor(exporter))
    trace.set_tracer_provider(provider)
    log.info("telemetry.configured", endpoint=settings.otel_exporter_otlp_endpoint)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    settings = get_settings()
    log.info("app.starting", env=settings.app_env)

    _setup_telemetry(settings)

    await ping_database()
    await ping_redis()
    log.info("app.ready")

    yield

    log.info("app.shutting_down")
    await close_database()
    await close_redis()
    log.info("app.stopped")


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="VEO3 Creator OS API",
        version="0.1.0",
        docs_url="/api/docs" if settings.app_env != "production" else None,
        redoc_url="/api/redoc" if settings.app_env != "production" else None,
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Routers
    app.include_router(health.router)
    app.include_router(auth.router)
    app.include_router(projects.router)
    app.include_router(assets.router)
    app.include_router(jobs.router)
    app.include_router(versions.router)
    app.include_router(exports.router)
    app.include_router(control.router)

    # Global error handler
    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        log.error("unhandled_exception", path=request.url.path, error=str(exc), exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "Internal server error"},
        )

    FastAPIInstrumentor.instrument_app(app)
    return app


app = create_app()
