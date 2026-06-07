from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.openai_service import OpenAIStoryboardService
from app.schemas import JobState, StoryboardRequest, StoryboardResponse
from app.security import require_api_key
from app.settings import Settings, get_settings

router = APIRouter(
    prefix="/v1/storyboards",
    tags=["storyboards"],
    dependencies=[Depends(require_api_key)],
)


def get_storyboard_service(settings: Settings = Depends(get_settings)) -> OpenAIStoryboardService:
    return OpenAIStoryboardService(settings)


@router.post("", response_model=StoryboardResponse)
async def create_storyboard(
    request: StoryboardRequest,
    service: OpenAIStoryboardService = Depends(get_storyboard_service),
) -> StoryboardResponse:
    try:
        storyboard = await service.create_storyboard(request)
    except Exception as exc:  # pragma: no cover
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Storyboard generation failed closed.",
        ) from exc

    return StoryboardResponse(state=JobState.DRAFT, ready_for_user=False, storyboard=storyboard)
