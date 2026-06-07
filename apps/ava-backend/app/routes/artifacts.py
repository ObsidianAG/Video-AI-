from __future__ import annotations

from fastapi import APIRouter, Depends, File, UploadFile

from app.artifact_integrity import ArtifactIntegrityVerifier
from app.schemas import ArtifactVerificationResult
from app.security import require_api_key
from app.settings import Settings, get_settings

router = APIRouter(
    prefix="/v1/artifacts",
    tags=["artifacts"],
    dependencies=[Depends(require_api_key)],
)


def get_verifier(settings: Settings = Depends(get_settings)) -> ArtifactIntegrityVerifier:
    return ArtifactIntegrityVerifier(settings)


@router.post("/verify", response_model=ArtifactVerificationResult)
async def verify_artifact(
    file: UploadFile = File(...),
    verifier: ArtifactIntegrityVerifier = Depends(get_verifier),
) -> ArtifactVerificationResult:
    return await verifier.verify_upload(file)
