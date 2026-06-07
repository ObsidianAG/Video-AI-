from __future__ import annotations

from dataclasses import dataclass

from fastapi.testclient import TestClient

from app.main import create_app
from app.routes.storyboard import get_storyboard_service
from app.schemas import Scene, StoryboardPlan, StoryboardRequest


@dataclass
class OkService:
    async def create_storyboard(self, request: StoryboardRequest) -> StoryboardPlan:
        return StoryboardPlan(
            title="Storyboard",
            scenes=[
                Scene(
                    scene_number=1,
                    visual=f"Visual for {request.video_style}",
                    narration="Narration",
                    camera_direction="Camera",
                )
            ],
            final_video_prompt="Prompt",
            safety_notes=["No unsafe claims"],
        )


@dataclass
class FailService:
    async def create_storyboard(self, request: StoryboardRequest) -> StoryboardPlan:
        raise RuntimeError("provider down")


def _payload() -> dict[str, object]:
    return {
        "business_goal": "Create onboarding launch clip",
        "audience": "Creators",
        "video_style": "Cinematic",
        "duration_seconds": 30,
    }


def test_success_returns_not_ready_for_user() -> None:
    app = create_app()
    app.dependency_overrides[get_storyboard_service] = lambda: OkService()
    client = TestClient(app)

    response = client.post(
        "/v1/storyboards",
        headers={"X-AVA-API-Key": "test-ava-key"},
        json=_payload(),
    )

    assert response.status_code == 200
    body = response.json()
    assert body["ready_for_user"] is False
    assert body["state"] == "DRAFT"


def test_openai_failure_returns_502_fail_closed() -> None:
    app = create_app()
    app.dependency_overrides[get_storyboard_service] = lambda: FailService()
    client = TestClient(app)

    response = client.post(
        "/v1/storyboards",
        headers={"X-AVA-API-Key": "test-ava-key"},
        json=_payload(),
    )

    assert response.status_code == 502


def test_malformed_output_path_returns_502() -> None:
    class MalformedService:
        async def create_storyboard(self, request: StoryboardRequest) -> StoryboardPlan:
            raise ValueError("malformed")

    app = create_app()
    app.dependency_overrides[get_storyboard_service] = lambda: MalformedService()
    client = TestClient(app)

    response = client.post(
        "/v1/storyboards",
        headers={"X-AVA-API-Key": "test-ava-key"},
        json=_payload(),
    )

    assert response.status_code == 502
