from __future__ import annotations

import json
import uuid
from typing import Any

import structlog
from fastapi import APIRouter, Request, status
from fastapi.responses import JSONResponse

from app.dependencies import DbDep

logger = structlog.get_logger()

router = APIRouter()

_KNOWN_PROVIDERS: frozenset[str] = frozenset(
    {"openai_video", "google_vertex_veo", "replicate", "runway", "kling", "fal"}
)


@router.post("/webhooks/{provider_label}", status_code=status.HTTP_202_ACCEPTED)
async def receive_webhook(
    provider_label: str,
    request: Request,
    db: DbDep,
) -> JSONResponse:
    """
    Accept a raw provider webhook.

    The payload and headers are stored in ``webhook_events`` immediately.
    Signature verification is deferred (``signature_verified = false``) until
    the provider-specific HMAC key is configured and the signature logic wired.
    Processing (state advancement) is performed by the worker, not here.
    """
    if provider_label not in _KNOWN_PROVIDERS:
        return JSONResponse(
            {"detail": f"Unknown provider: {provider_label!r}"},
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    raw_body = await request.body()
    try:
        payload: dict[str, Any] = json.loads(raw_body) if raw_body else {}
    except json.JSONDecodeError:
        payload = {}

    headers_dict: dict[str, str] = dict(request.headers)
    signature_header = headers_dict.get("x-signature") or headers_dict.get(
        f"x-{provider_label}-signature"
    )

    # Strip authorization headers before persisting — never log secrets.
    safe_headers = {k: v for k, v in headers_dict.items() if "authorization" not in k.lower()}

    event_id = uuid.uuid4()
    await db.execute(
        """
        INSERT INTO webhook_events (
          id, provider_label, provider_event_id, signature_header,
          signature_verified, raw_payload, request_headers, process_status
        ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, 'received')
        """,
        event_id,
        provider_label,
        payload.get("id") or payload.get("event_id"),
        signature_header,
        False,
        json.dumps(payload),
        json.dumps(safe_headers),
    )

    logger.info("webhook_received", provider_label=provider_label, event_id=str(event_id))
    return JSONResponse({"received": True, "event_id": str(event_id)})
