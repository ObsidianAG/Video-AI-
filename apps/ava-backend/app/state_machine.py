from __future__ import annotations

from app.schemas import JobState

ALLOWED_TRANSITIONS: dict[JobState, set[JobState]] = {
    JobState.DRAFT: {JobState.QUEUED, JobState.FAILED_VALIDATION},
    JobState.QUEUED: {JobState.SUBMITTED_TO_PROVIDER, JobState.PROVIDER_UNCONFIGURED},
    JobState.SUBMITTED_TO_PROVIDER: {JobState.IN_PROGRESS, JobState.FAILED_VALIDATION},
    JobState.IN_PROGRESS: {JobState.COMPLETED_BY_PROVIDER, JobState.FAILED_VALIDATION},
    JobState.COMPLETED_BY_PROVIDER: {
        JobState.ARTIFACT_BYTES_VERIFIED,
        JobState.ARTIFACT_CHECK_FAILED,
        JobState.HOLD_NO_REAL_VIDEO_ARTIFACT,
    },
    JobState.ARTIFACT_BYTES_VERIFIED: {JobState.STORED_AND_RETRIEVABLE},
    JobState.STORED_AND_RETRIEVABLE: {JobState.READY_FOR_USER},
}


def assert_transition_allowed(current: JobState, next_state: JobState) -> None:
    allowed = ALLOWED_TRANSITIONS.get(current, set())
    if next_state not in allowed:
        raise ValueError(f"Illegal transition: {current} -> {next_state}")
