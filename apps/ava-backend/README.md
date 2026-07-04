# AVA Backend

Production FastAPI backend for the AI Video Agent (AVA) platform.

AVA is the server-side component of the Video-AI monorepo. It owns:

- Job lifecycle management via the 16-state machine (`app/services/state_machine.py`)
- JWT-authenticated REST API for users
- Service-token-authenticated internal endpoints for the worker
- Provider webhook ingestion (signature capture, deferred verification)
- asyncpg connection pool wired to the shared PostgreSQL schema

## Quick start

```bash
cd apps/ava-backend
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env
# Edit .env — at minimum set DATABASE_URL, JWT_SECRET, SERVICE_TOKEN
```

## Development server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Validation

Run from `apps/ava-backend/`:

```bash
ruff check .
black --check .
mypy app
pytest -q
```

## API surface

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | /health | none | Liveness + DB probe |
| POST | /api/v1/jobs | JWT ****** Submit a new video job |
| GET | /api/v1/jobs | JWT ****** List caller's jobs |
| GET | /api/v1/jobs/{id} | JWT ****** Get one job |
| PATCH | /api/v1/jobs/{id}/state | Service Token | Advance job state (worker) |
| POST | /api/v1/webhooks/{provider} | none (sig stored) | Receive provider webhook |

## State machine

The Python state machine in `app/services/state_machine.py` is an exact mirror of
`packages/core/src/states.ts`. Both MUST stay in sync. Any change requires:

1. A new DB migration updating the `video_job_state` enum
2. A matching change in the TypeScript source
3. A matching change in the Python source

## Environment variables

See `.env.example` for the full list. Required at startup:

- `DATABASE_URL` — asyncpg-compatible PostgreSQL DSN
- `JWT_SECRET` — ≥ 32 characters; used to verify user JWTs
- `SERVICE_TOKEN` — ≥ 32 characters; used to authenticate worker calls

Missing required variables raise `ValidationError` at startup (fail-loud).
