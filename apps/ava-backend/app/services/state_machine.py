"""
Video job state machine — exact mirror of packages/core/src/states.ts.

Both MUST remain in sync. Any change here requires:
  1. A new DB migration updating the ``video_job_state`` Postgres enum.
  2. A matching change in the TypeScript source (packages/core/src/states.ts).
  3. This file updated to match.
"""

from __future__ import annotations

from typing import Final

VIDEO_JOB_STATES: Final[tuple[str, ...]] = (
    "PROMPT_RECEIVED",
    "SAFETY_REVIEWED",
    "JOB_CREATED",
    "PROVIDER_SELECTED",
    "PROVIDER_SUBMITTED",
    "PROVIDER_RUNNING",
    "PROVIDER_COMPLETED",
    "ARTIFACT_DOWNLOADED",
    "ARTIFACT_STORED",
    "ARTIFACT_HASHED",
    "ARTIFACT_VERIFIED",
    "AUDIT_RECORDED",
    "READY_FOR_USER",
    "FAILED",
    "BLOCKED",
    "EXPIRED",
)

TERMINAL_STATES: Final[frozenset[str]] = frozenset(
    {"READY_FOR_USER", "FAILED", "BLOCKED", "EXPIRED"}
)

_HAPPY_PATH: Final[tuple[tuple[str, str], ...]] = (
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
)


def _build_transitions() -> dict[str, frozenset[str]]:
    transitions: dict[str, set[str]] = {s: set() for s in VIDEO_JOB_STATES}
    for from_state, to_state in _HAPPY_PATH:
        transitions[from_state].add(to_state)
    # Any non-terminal state may transition to the three failure terminals.
    for state in VIDEO_JOB_STATES:
        if state not in TERMINAL_STATES:
            transitions[state].update({"FAILED", "BLOCKED", "EXPIRED"})
    return {k: frozenset(v) for k, v in transitions.items()}


_TRANSITIONS: Final[dict[str, frozenset[str]]] = _build_transitions()


def can_transition(from_state: str, to_state: str) -> bool:
    """Return True iff the transition is permitted by the state machine."""
    if from_state == to_state:
        return False
    return to_state in _TRANSITIONS.get(from_state, frozenset())


def allowed_next_states(from_state: str) -> frozenset[str]:
    """Return the full set of permitted next states from ``from_state``."""
    return _TRANSITIONS.get(from_state, frozenset())


def is_terminal(state: str) -> bool:
    """Return True if ``state`` is a terminal state with no outgoing transitions."""
    return state in TERMINAL_STATES
