from __future__ import annotations

from app.services.state_machine import (
    TERMINAL_STATES,
    VIDEO_JOB_STATES,
    allowed_next_states,
    can_transition,
    is_terminal,
)


def test_state_count() -> None:
    """Exactly 16 states — must match the Postgres enum and the TypeScript source."""
    assert len(VIDEO_JOB_STATES) == 16


def test_happy_path_transitions() -> None:
    """Every consecutive pair on the happy path must be a valid transition."""
    happy_path = [
        ("PROMPT_RECEIVED", "SAFETY_REVIEWED"),
        ("SAFETY_REVIEWED", "JOB_CREATED"),
        ("JOB_CREATED", "PROVIDER_SELECTED"),
        ("PROVIDER_SELECTED", "PROVIDER_SUBMITTED"),
        ("PROVIDER_SUBMITTED", "PROVIDER_RUNNING"),
        ("PROVIDER_RUNNING", "PROVIDER_COMPLETED"),
        ("PROVIDER_COMPLETED", "ARTIFACT_DOWNLOADED"),
        ("ARTIFACT_DOWNLOADED", "ARTIFACT_STORED"),
        ("ARTIFACT_STORED", "ARTIFACT_HASHED"),
        ("ARTIFACT_HASHED", "ARTIFACT_VERIFIED"),
        ("ARTIFACT_VERIFIED", "AUDIT_RECORDED"),
        ("AUDIT_RECORDED", "READY_FOR_USER"),
    ]
    for from_state, to_state in happy_path:
        assert can_transition(
            from_state, to_state
        ), f"Expected {from_state!r} → {to_state!r} to be allowed"


def test_non_terminal_can_reach_failure_states() -> None:
    """Every non-terminal state must be able to transition to FAILED, BLOCKED, EXPIRED."""
    non_terminal = [s for s in VIDEO_JOB_STATES if s not in TERMINAL_STATES]
    for state in non_terminal:
        assert can_transition(state, "FAILED"), f"{state!r} → FAILED must be allowed"
        assert can_transition(state, "BLOCKED"), f"{state!r} → BLOCKED must be allowed"
        assert can_transition(state, "EXPIRED"), f"{state!r} → EXPIRED must be allowed"


def test_terminal_states_have_no_outgoing_transitions() -> None:
    for state in TERMINAL_STATES:
        assert (
            allowed_next_states(state) == frozenset()
        ), f"Terminal {state!r} must have no outgoing transitions"


def test_self_transition_forbidden() -> None:
    for state in VIDEO_JOB_STATES:
        assert not can_transition(state, state), f"Self-transition of {state!r} must be forbidden"


def test_reverse_transition_forbidden() -> None:
    assert not can_transition("SAFETY_REVIEWED", "PROMPT_RECEIVED")
    assert not can_transition("READY_FOR_USER", "AUDIT_RECORDED")
    assert not can_transition("ARTIFACT_VERIFIED", "ARTIFACT_STORED")


def test_skip_step_forbidden() -> None:
    """Steps may not be skipped on the happy path."""
    assert not can_transition("PROMPT_RECEIVED", "JOB_CREATED")
    assert not can_transition("PROVIDER_SUBMITTED", "PROVIDER_COMPLETED")
    assert not can_transition("ARTIFACT_STORED", "ARTIFACT_VERIFIED")


def test_is_terminal() -> None:
    for state in ("READY_FOR_USER", "FAILED", "BLOCKED", "EXPIRED"):
        assert is_terminal(state), f"{state!r} must be terminal"
    for state in ("PROMPT_RECEIVED", "PROVIDER_RUNNING", "ARTIFACT_HASHED"):
        assert not is_terminal(state), f"{state!r} must not be terminal"


def test_allowed_next_states_prompt_received() -> None:
    nexts = allowed_next_states("PROMPT_RECEIVED")
    assert "SAFETY_REVIEWED" in nexts
    assert "FAILED" in nexts
    assert "BLOCKED" in nexts
    assert "EXPIRED" in nexts
    # Must not be able to jump ahead
    assert "READY_FOR_USER" not in nexts
    assert "JOB_CREATED" not in nexts


def test_ready_for_user_requires_full_chain() -> None:
    """READY_FOR_USER must only be reachable from AUDIT_RECORDED, never earlier."""
    for state in VIDEO_JOB_STATES:
        if state == "AUDIT_RECORDED":
            assert can_transition(
                state, "READY_FOR_USER"
            ), "AUDIT_RECORDED → READY_FOR_USER must be allowed"
        else:
            assert not can_transition(
                state, "READY_FOR_USER"
            ), f"{state!r} → READY_FOR_USER must be forbidden"
