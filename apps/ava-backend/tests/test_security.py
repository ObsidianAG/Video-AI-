from __future__ import annotations

from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from app.security import require_api_key


def _client() -> TestClient:
    app = FastAPI()

    @app.get("/protected", dependencies=[Depends(require_api_key)])
    def protected() -> dict[str, str]:
        return {"ok": "yes"}

    return TestClient(app)


def test_no_key_returns_401() -> None:
    client = _client()
    response = client.get("/protected")
    assert response.status_code == 401


def test_wrong_key_returns_401() -> None:
    client = _client()
    response = client.get("/protected", headers={"X-AVA-API-Key": "bad"})
    assert response.status_code == 401


def test_correct_key_passes() -> None:
    client = _client()
    response = client.get("/protected", headers={"X-AVA-API-Key": "test-ava-key"})
    assert response.status_code == 200
