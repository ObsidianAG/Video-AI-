from __future__ import annotations

import hashlib
import json
import os
import shutil
import subprocess
import tempfile
from pathlib import Path

from fastapi import UploadFile

from app.schemas import ArtifactVerificationResult, JobState
from app.settings import Settings


class ArtifactIntegrityVerifier:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    async def verify_upload(self, upload: UploadFile) -> ArtifactVerificationResult:
        if not self._ffprobe_available():
            return ArtifactVerificationResult(
                artifact_integrity_verified=False,
                reason="FFPROBE_UNAVAILABLE",
                bytes=None,
                sha256=None,
                next_state=JobState.ARTIFACT_CHECK_FAILED,
            )

        with tempfile.NamedTemporaryFile(delete=True, suffix=".mp4") as tmp:
            total_bytes = 0
            sha256 = hashlib.sha256()

            while chunk := await upload.read(1024 * 1024):
                total_bytes += len(chunk)
                if total_bytes > self._settings.max_artifact_bytes:
                    return ArtifactVerificationResult(
                        artifact_integrity_verified=False,
                        reason="BYTE_SIZE_TOO_LARGE",
                        bytes=total_bytes,
                        sha256=None,
                        next_state=JobState.ARTIFACT_CHECK_FAILED,
                    )
                sha256.update(chunk)
                tmp.write(chunk)

            tmp.flush()
            path = Path(tmp.name)

            if total_bytes == 0:
                return ArtifactVerificationResult(
                    artifact_integrity_verified=False,
                    reason="EMPTY_ARTIFACT",
                    bytes=total_bytes,
                    sha256=None,
                    next_state=JobState.HOLD_NO_REAL_VIDEO_ARTIFACT,
                )

            if total_bytes < self._settings.min_artifact_bytes:
                return ArtifactVerificationResult(
                    artifact_integrity_verified=False,
                    reason="BYTE_SIZE_TOO_SMALL",
                    bytes=total_bytes,
                    sha256=sha256.hexdigest(),
                    next_state=JobState.ARTIFACT_CHECK_FAILED,
                )

            if not self._has_mp4_ftyp(path):
                return ArtifactVerificationResult(
                    artifact_integrity_verified=False,
                    reason="FTYP_MISSING",
                    bytes=total_bytes,
                    sha256=sha256.hexdigest(),
                    next_state=JobState.ARTIFACT_CHECK_FAILED,
                )

            if not self._ffprobe_has_video_stream(path):
                return ArtifactVerificationResult(
                    artifact_integrity_verified=False,
                    reason="FFPROBE_NO_VIDEO_STREAM",
                    bytes=total_bytes,
                    sha256=sha256.hexdigest(),
                    next_state=JobState.HOLD_NO_REAL_VIDEO_ARTIFACT,
                )

            return ArtifactVerificationResult(
                artifact_integrity_verified=True,
                reason=None,
                bytes=total_bytes,
                sha256=sha256.hexdigest(),
                next_state=JobState.ARTIFACT_BYTES_VERIFIED,
            )

    def _ffprobe_available(self) -> bool:
        configured = self._settings.ffprobe_path
        if os.path.sep in configured:
            return os.path.isfile(configured) and os.access(configured, os.X_OK)
        return shutil.which(configured) is not None

    @staticmethod
    def _has_mp4_ftyp(path: Path) -> bool:
        with path.open("rb") as file:
            header = file.read(8)
        return len(header) >= 8 and header[4:8] == b"ftyp"

    def _ffprobe_has_video_stream(self, path: Path) -> bool:
        result = subprocess.run(
            [
                self._settings.ffprobe_path,
                "-v",
                "error",
                "-show_streams",
                "-select_streams",
                "v:0",
                "-of",
                "json",
                str(path),
            ],
            check=False,
            capture_output=True,
            text=True,
            timeout=30,
        )
        if result.returncode != 0:
            return False
        try:
            payload = json.loads(result.stdout)
        except json.JSONDecodeError:
            return False
        streams = payload.get("streams")
        return isinstance(streams, list) and len(streams) > 0
