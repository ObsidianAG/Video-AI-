"""
Tests for app.services.job_service — focused on the advance_state TOCTOU fix.

The critical invariant: advance_state must NEVER allow a terminal state to be
overwritten, even when two callers race on the same job row.  The fix uses
SELECT … FOR UPDATE so concurrent workers are serialized inside the transaction.

These tests use a hand-rolled async mock that exercises the locking protocol
without a real database.
"""
from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.job_service import advance_state
from app.services.state_machine import TERMINAL_STATES

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_conn(initial_state: str) -> AsyncMock:
    """
    Return an asyncpg-like async mock whose fetchrow returns a row with the
    given state for the SELECT … FOR UPDATE, and the updated row for the UPDATE.

    In real asyncpg ``connection.transaction()`` is a *synchronous* call that
    returns a context manager (not a coroutine).  We must therefore set
    ``conn.transaction`` to a regular ``MagicMock`` rather than letting
    ``AsyncMock`` auto-wire it as an async method.
    """
    conn = AsyncMock()

    job_id = uuid.uuid4()
    select_row = MagicMock()
    select_row.__getitem__ = lambda self, k: initial_state if k == "state" else str(job_id)

    # Simulate the RETURNING row after UPDATE
    update_row = {
        "id": job_id,
        "user_id": uuid.uuid4(),
        "prompt": "test",
        "settings": {},
        "state": "PROVIDER_COMPLETED",
        "state_reason": None,
        "state_updated_at": None,
        "provider_label": None,
        "provider_model_id": None,
        "failure_reason": None,
        "created_at": None,
        "updated_at": None,
    }

    # First fetchrow call (SELECT FOR UPDATE) returns the current-state row.
    # Second fetchrow call (UPDATE RETURNING) returns update_row.
    conn.fetchrow.side_effect = [select_row, update_row]

    # asyncpg's transaction() is a sync call returning an async context manager.
    txn_ctx = MagicMock()
    txn_ctx.__aenter__ = AsyncMock(return_value=None)
    txn_ctx.__aexit__ = AsyncMock(return_value=False)
    conn.transaction = MagicMock(return_value=txn_ctx)

    return conn


# ---------------------------------------------------------------------------
# Basic advance_state correctness
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_advance_state_selects_for_update() -> None:
    """SELECT must include FOR UPDATE to serialise concurrent workers."""
    conn = _make_conn("PROVIDER_RUNNING")
    job_id = str(uuid.uuid4())

    await advance_state(
        conn,
        job_id=job_id,
        to_state="PROVIDER_COMPLETED",
        reason=None,
        metadata={},
    )

    # Verify the first fetchrow call used FOR UPDATE
    first_call_sql: str = conn.fetchrow.call_args_list[0][0][0]
    assert "FOR UPDATE" in first_call_sql.upper(), (
        "advance_state must lock the row with SELECT … FOR UPDATE to prevent concurrent races"
    )


@pytest.mark.asyncio
async def test_advance_state_select_inside_transaction() -> None:
    """The SELECT FOR UPDATE must be issued *inside* the transaction block."""
    conn = _make_conn("PROVIDER_RUNNING")
    job_id = str(uuid.uuid4())

    call_order: list[str] = []

    original_fetchrow = conn.fetchrow.side_effect
    results = list(original_fetchrow)

    async def tracked_fetchrow(*args: object, **kwargs: object) -> object:
        call_order.append("fetchrow")
        result = results.pop(0)
        return result

    conn.fetchrow.side_effect = tracked_fetchrow

    ctx = MagicMock()

    async def enter(*_: object) -> None:
        call_order.append("transaction_enter")

    async def exit_(*_: object) -> bool:
        call_order.append("transaction_exit")
        return False

    ctx.__aenter__ = enter  # type: ignore[assignment]
    ctx.__aexit__ = exit_  # type: ignore[assignment]
    conn.transaction = MagicMock(return_value=ctx)

    await advance_state(
        conn,
        job_id=job_id,
        to_state="PROVIDER_COMPLETED",
        reason=None,
        metadata={},
    )

    # transaction must be entered before any fetchrow is called
    assert call_order[0] == "transaction_enter", (
        "Transaction must be opened before the SELECT FOR UPDATE to ensure the lock is held"
    )


@pytest.mark.asyncio
async def test_advance_state_rejects_terminal_state() -> None:
    """A job already in a terminal state must raise ValueError."""
    for terminal in TERMINAL_STATES:
        conn = _make_conn(terminal)
        job_id = str(uuid.uuid4())

        with pytest.raises(ValueError, match="terminal state"):
            await advance_state(
                conn,
                job_id=job_id,
                to_state="PROMPT_RECEIVED",  # any non-terminal target
                reason=None,
                metadata={},
            )


@pytest.mark.asyncio
async def test_advance_state_rejects_invalid_transition() -> None:
    """An illegal state-machine transition must raise ValueError."""
    conn = _make_conn("PROMPT_RECEIVED")
    job_id = str(uuid.uuid4())

    # PROMPT_RECEIVED → READY_FOR_USER is not in the state machine
    with pytest.raises(ValueError, match="not permitted"):
        await advance_state(
            conn,
            job_id=job_id,
            to_state="READY_FOR_USER",
            reason=None,
            metadata={},
        )


@pytest.mark.asyncio
async def test_advance_state_not_found() -> None:
    """A missing job_id must raise ValueError."""
    conn = AsyncMock()
    conn.fetchrow.return_value = None
    txn_ctx = MagicMock()
    txn_ctx.__aenter__ = AsyncMock(return_value=None)
    txn_ctx.__aexit__ = AsyncMock(return_value=False)
    conn.transaction = MagicMock(return_value=txn_ctx)

    with pytest.raises(ValueError, match="Job not found"):
        await advance_state(
            conn,
            job_id=str(uuid.uuid4()),
            to_state="PROVIDER_COMPLETED",
            reason=None,
            metadata={},
        )
