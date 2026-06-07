from __future__ import annotations

import asyncio
import io

from fastapi import UploadFile
from _pytest.monkeypatch import MonkeyPatch
from pydantic import SecretStr

from app.artifact_integrity import ArtifactIntegrityVerifier
from app.schemas import JobState
from app.settings import Settings


def _settings(min_bytes: int = 8, max_bytes: int = 32, ffprobe_path: str = "/bin/true") -> Settings:
    return Settings(
        OPENAI_API_KEY=SecretStr("k"),
        OPENAI_MODEL="gpt-5.5",
        AVA_API_KEY=SecretStr("k2"),
        MIN_ARTIFACT_BYTES=min_bytes,
        MAX_ARTIFACT_BYTES=max_bytes,
        FFPROBE_PATH=ffprobe_path,
    )


def _upload(data: bytes, filename: str = "video.mp4") -> UploadFile:
    return UploadFile(filename=filename, file=io.BytesIO(data))


def test_empty_upload_returns_hold_state() -> None:
    verifier = ArtifactIntegrityVerifier(_settings())
    result = asyncio.run(verifier.verify_upload(_upload(b"")))
    assert result.next_state == JobState.HOLD_NO_REAL_VIDEO_ARTIFACT
    assert result.artifact_integrity_verified is False


def test_too_small_upload_fails() -> None:
    verifier = ArtifactIntegrityVerifier(_settings(min_bytes=20, max_bytes=128))
    small_mp4 = b"\x00\x00\x00\x18ftypisom1234"
    result = asyncio.run(verifier.verify_upload(_upload(small_mp4)))
    assert result.next_state == JobState.ARTIFACT_CHECK_FAILED
    assert result.reason == "BYTE_SIZE_TOO_SMALL"


def test_too_large_upload_fails() -> None:
    verifier = ArtifactIntegrityVerifier(_settings(min_bytes=1, max_bytes=8))
    result = asyncio.run(verifier.verify_upload(_upload(b"\x00\x00\x00\x18ftypisom000000000")))
    assert result.next_state == JobState.ARTIFACT_CHECK_FAILED
    assert result.reason == "BYTE_SIZE_TOO_LARGE"


def test_missing_ftyp_fails() -> None:
    verifier = ArtifactIntegrityVerifier(_settings(min_bytes=8, max_bytes=64))
    result = asyncio.run(verifier.verify_upload(_upload(b"1234567890abcdef")))
    assert result.next_state == JobState.ARTIFACT_CHECK_FAILED
    assert result.reason == "FTYP_MISSING"


def test_ffprobe_missing_fails_closed() -> None:
    verifier = ArtifactIntegrityVerifier(_settings(ffprobe_path="/definitely/missing/ffprobe"))
    result = asyncio.run(verifier.verify_upload(_upload(b"\x00\x00\x00\x18ftypisom1234")))
    assert result.next_state == JobState.ARTIFACT_CHECK_FAILED
    assert result.reason == "FFPROBE_UNAVAILABLE"


def _has_video_stream(_path: object) -> bool:
    return True


def _no_video_stream(_path: object) -> bool:
    return False


def test_valid_mp4_returns_artifact_bytes_verified(monkeypatch: MonkeyPatch) -> None:
    verifier = ArtifactIntegrityVerifier(_settings(min_bytes=8, max_bytes=64))
    monkeypatch.setattr(verifier, "_ffprobe_has_video_stream", _has_video_stream)

    valid_like_mp4 = b"\x00\x00\x00\x18ftypisom1234567890"
    result = asyncio.run(verifier.verify_upload(_upload(valid_like_mp4)))

    assert result.next_state == JobState.ARTIFACT_BYTES_VERIFIED
    assert result.artifact_integrity_verified is True
    assert result.sha256 is not None


def test_deepfake_verified_is_always_false() -> None:
    verifier = ArtifactIntegrityVerifier(_settings(min_bytes=8, max_bytes=64))
    verifier._ffprobe_has_video_stream = _has_video_stream  # type: ignore[method-assign]
    valid_like_mp4 = b"\x00\x00\x00\x18ftypisom1234567890"
    result = asyncio.run(verifier.verify_upload(_upload(valid_like_mp4)))
    assert result.deepfake_verified is False


def test_result_never_reports_ready_for_user() -> None:
    verifier = ArtifactIntegrityVerifier(_settings(min_bytes=8, max_bytes=64))
    verifier._ffprobe_has_video_stream = _no_video_stream  # type: ignore[method-assign]
    valid_like_mp4 = b"\x00\x00\x00\x18ftypisom1234567890"
    result = asyncio.run(verifier.verify_upload(_upload(valid_like_mp4)))
    assert result.next_state != JobState.READY_FOR_USER
