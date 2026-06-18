# AGENTS.md

## Repository expectations

- Keep changes minimal and focused.
- Prefer existing patterns over new abstractions.
- Do not add production dependencies without approval.
- Run targeted tests after code changes.
- Run lint/typecheck when touching shared modules.
- Include command output in final responses.
- No proof, no PASS.

## Validation commands

Run from the repo root (pnpm monorepo):

```
pnpm lint        # ESLint across all workspaces
pnpm typecheck   # tsc --noEmit across all workspaces
pnpm test        # AVA test runner
pnpm build       # Full build
pnpm proof       # All 7 proof gates — MUST pass before opening a PR
```

For `apps/ava-backend` (Python/FastAPI):

```
ruff check .
black --check .
mypy app tests
pytest -q
```

## Hard rules (see CLAUDE.md for full detail)

1. Never mark a video ready without all 7 proof gates passed and `audit_event_id` set.
2. Never wire a real provider or storage without verifying live docs and access first.
3. Never put provider keys in client components or files without `'server-only'` / `runtime = 'nodejs'`.
4. Never use `localStorage` / `sessionStorage` for sensitive state.
5. Never add mock providers or fake video data to runtime code — test doubles in test files only.
6. Never set `video_jobs.state = 'READY_FOR_USER'` without passing through `ARTIFACT_VERIFIED` and `AUDIT_RECORDED` first.
7. Run `pnpm proof` before opening a PR.

## TypeScript / Node rules

- Use `export const runtime = 'nodejs'` on any route that touches files, streams, crypto, or provider calls.
- Do not mix Node streams with Web `ReadableStream` without an explicit adapter.
- Preserve public APIs unless the task explicitly requires a breaking change.
- Prefer explicit error handling over broad exception swallowing.

## Python rules (apps/ava-backend)

- Do not convert sync code/tests/fakes to async unless the source is already async.
- Preserve public APIs unless the task explicitly requires a breaking change.
- Prefer explicit error handling over broad exception swallowing.

## SRE rules

- Consider timeout, retry, idempotency, observability, and rollback impact for any service change.
- Any behavior change must include test coverage or a clear validation plan.
- State machine changes (`packages/core/src/states.ts`) require a new DB migration and must stay in sync with the Postgres enum in `packages/db/migrations/`.

## VIP operating method

**V — Verify:** Confirm every answer with tests, lint, typecheck, logs, or repro steps.  
**I — Isolate:** Work only in the named file/module/function. Do not wander or refactor unrelated code.  
**P — Prove:** Provide root cause, changed files, patch summary, commands run, test output, and risks.

No proof, no PASS.

## Pre-submission checklist

- [ ] Named the exact goal?
- [ ] Provided the failing command, logs, or expected vs. actual behavior?
- [ ] Identified the relevant files/modules?
- [ ] Stated what must not change?
- [ ] Required tests or validation?
- [ ] Required proof?
- [ ] Asked for a small plan before large edits?
- [ ] Ran `pnpm proof`?
