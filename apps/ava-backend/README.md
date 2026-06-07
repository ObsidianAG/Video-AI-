# AVA Backend

Production FastAPI backend for AVA storyboard generation and artifact integrity verification.

## Setup

```bash
cd /tmp/workspace/ObsidianAG/Video-AI-/apps/ava-backend
python -m venv .venv
source .venv/bin/activate
python -m pip install -U pip
pip install -e ".[dev]"
cp .env.example .env
```

## Run

```bash
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

## Verify

```bash
ruff check .
black --check .
mypy app tests
pytest -q
```
