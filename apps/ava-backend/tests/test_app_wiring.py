from __future__ import annotations

from app.main import create_app


def test_expected_routes_are_mounted() -> None:
    app = create_app()
    paths = {getattr(route, "path", "") for route in app.router.routes}
    assert "/healthz" in paths
    assert "/v1/storyboards" in paths
    assert "/v1/artifacts/verify" in paths
