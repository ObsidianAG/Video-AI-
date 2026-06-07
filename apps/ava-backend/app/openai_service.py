from __future__ import annotations

from anyio import to_thread
from openai import OpenAI

from app.schemas import StoryboardPlan, StoryboardRequest
from app.settings import Settings


class OpenAIStoryboardService:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._client = OpenAI(api_key=settings.openai_api_key.get_secret_value())

    async def create_storyboard(self, request: StoryboardRequest) -> StoryboardPlan:
        return await to_thread.run_sync(self._create_storyboard_sync, request)

    def _create_storyboard_sync(self, request: StoryboardRequest) -> StoryboardPlan:
        response = self._client.responses.parse(
            model=self._settings.openai_model,
            input=[
                {
                    "role": "system",
                    "content": (
                        "You create production-ready video storyboards. "
                        "Return only the requested structured output. "
                        "Do not invent provider completion. "
                        "Do not claim that video was generated."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Business goal: {request.business_goal}\n"
                        f"Audience: {request.audience}\n"
                        f"Video style: {request.video_style}\n"
                        f"Duration seconds: {request.duration_seconds}\n"
                    ),
                },
            ],
            text_format=StoryboardPlan,
        )
        parsed = response.output_parsed
        if parsed is None:
            raise RuntimeError("OpenAI returned no structured storyboard.")
        return parsed
