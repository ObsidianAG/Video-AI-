"""S3 presigned URL generation via boto3."""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

import boto3
import structlog
from botocore.exceptions import BotoCoreError, ClientError

from config import get_settings

log = structlog.get_logger(__name__)


def _get_s3_client() -> Any:
    settings = get_settings()
    return boto3.client(
        "s3",
        region_name=settings.aws_region,
        aws_access_key_id=settings.aws_access_key_id,
        aws_secret_access_key=settings.aws_secret_access_key,
    )


def generate_upload_url(
    *,
    project_id: str,
    filename: str,
    content_type: str,
    asset_id: str,
) -> tuple[str, str, datetime]:
    """
    Generate a presigned S3 PUT URL.

    Returns (upload_url, storage_key, expires_at).
    """
    settings = get_settings()
    s3 = _get_s3_client()

    storage_key = f"projects/{project_id}/assets/{asset_id}/{filename}"
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=settings.s3_presigned_expire_seconds)

    try:
        upload_url = s3.generate_presigned_url(
            ClientMethod="put_object",
            Params={
                "Bucket": settings.s3_bucket,
                "Key": storage_key,
                "ContentType": content_type,
            },
            ExpiresIn=settings.s3_presigned_expire_seconds,
        )
    except (BotoCoreError, ClientError) as exc:
        log.error("s3.presign_failed", error=str(exc))
        raise RuntimeError(f"Failed to generate presigned URL: {exc}") from exc

    log.info("s3.presigned_url_generated", asset_id=asset_id, storage_key=storage_key)
    return upload_url, storage_key, expires_at


def get_public_url(storage_key: str) -> str:
    """Return the public HTTPS URL for a stored asset."""
    settings = get_settings()
    return f"https://{settings.s3_bucket}.s3.{settings.aws_region}.amazonaws.com/{storage_key}"


def generate_download_url(storage_key: str, expire_seconds: int = 3600) -> str:
    """Generate a presigned GET URL for downloading an asset."""
    settings = get_settings()
    s3 = _get_s3_client()

    try:
        return s3.generate_presigned_url(
            ClientMethod="get_object",
            Params={"Bucket": settings.s3_bucket, "Key": storage_key},
            ExpiresIn=expire_seconds,
        )
    except (BotoCoreError, ClientError) as exc:
        log.error("s3.download_presign_failed", error=str(exc))
        raise RuntimeError(f"Failed to generate download URL: {exc}") from exc
