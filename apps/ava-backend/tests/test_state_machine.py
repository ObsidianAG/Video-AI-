from __future__ import annotations

import pytest

from app.schemas import JobState
from app.state_machine import assert_transition_allowed


@pytest.mark.parametrize(
    ("current", "next_state"),
    [
        (JobState.DRAFT, JobState.QUEUED),
        (JobState.QUEUED, JobState.SUBMITTED_TO_PROVIDER),
        (JobState.COMPLETED_BY_PROVIDER, JobState.ARTIFACT_BYTES_VERIFIED),
        (JobState.ARTIFACT_BYTES_VERIFIED, JobState.STORED_AND_RETRIEVABLE),
        (JobState.STORED_AND_RETRIEVABLE, JobState.READY_FOR_USER),
    ],
)
def test_legal_transitions_pass(current: JobState, next_state: JobState) -> None:
    assert_transition_allowed(current, next_state)


@pytest.mark.parametrize(
    ("current", "next_state"),
    [
        (JobState.DRAFT, JobState.READY_FOR_USER),
        (JobState.IN_PROGRESS, JobState.READY_FOR_USER),
        (JobState.QUEUED, JobState.READY_FOR_USER),
    ],
)
def test_illegal_transitions_throw(current: JobState, next_state: JobState) -> None:
    with pytest.raises(ValueError):
        assert_transition_allowed(current, next_state)


def test_completed_by_provider_cannot_transition_directly_to_ready_for_user() -> None:
    with pytest.raises(ValueError):
        assert_transition_allowed(JobState.COMPLETED_BY_PROVIDER, JobState.READY_FOR_USER)


def test_artifact_bytes_verified_cannot_transition_directly_to_ready_for_user() -> None:
    with pytest.raises(ValueError):
        assert_transition_allowed(JobState.ARTIFACT_BYTES_VERIFIED, JobState.READY_FOR_USER)
