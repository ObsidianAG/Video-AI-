from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import create_app


@pytest.mark.asyncio
async def test_health_ok(client: AsyncClient) -> None:
    """Health endpoint returns ok when the pool is reachable (pool is mocked)."""
    resp = await client.get("/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert body["database"] == "connected"


@pytest.mark.asyncio
async def test_health_degraded_when_pool_unavailable() -> None:
    """Health endpoint degrades gracefully when the pool is not initialised."""
    with (
        patch("app.database.init_pool", AsyncMock()),
        patch("app.database.close_pool", AsyncMock()),
        patch("app.database._pool", None),
    ):
        _app = create_app()
        async with AsyncClient(
            transport=ASGITransport(app=_app),
            base_url="http://test",
        ) as ac:
            resp = await ac.get("/health")
            assert resp.status_code == 200
            body = resp.json()
            assert body["status"] == "degraded"
            assert body["database"] == "unavailable"


@pytest.mark.asyncio
async def test_jobs_requires_auth(client: AsyncClient) -> None:
    """Job endpoints require a ******"""
    resp = await client.post("/api/v1/jobs", json={"prompt": "hello"})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_webhook_unknown_provider(client: AsyncClient) -> None:
    """Webhooks from unknown providers are rejected with 400."""
    resp = await client.post("/api/v1/webhooks/unknown_provider", json={})
    assert resp.status_code == 400
    assert "Unknown provider" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_webhook_known_provider_stores_event(client: AsyncClient) -> None:
    """A webhook from a known provider is accepted and stored."""
    # mock_db.execute is an AsyncMock — it will be called by the webhook handler.
    pool_mock = MagicMock()
    db_mock = AsyncMock()
    pool_mock.acquire.return_value.__aenter__ = AsyncMock(return_value=db_mock)
    pool_mock.acquire.return_value.__aexit__ = AsyncMock(return_value=False)

    with (
        patch("app.database.init_pool", AsyncMock()),
        patch("app.database.close_pool", AsyncMock()),
        patch("app.database._pool", pool_mock),
    ):
        _app = create_app()
        async with AsyncClient(
            transport=ASGITransport(app=_app),
            base_url="http://test",
        ) as ac:
            resp = await ac.post(
                "/api/v1/webhooks/replicate",
                json={"id": "evt-123", "status": "succeeded"},
            )

    assert resp.status_code == 200
    body = resp.json()
    assert body["received"] is True
    assert "event_id" in body
    # Verify the INSERT was issued
    db_mock.execute.assert_awaited_once()
