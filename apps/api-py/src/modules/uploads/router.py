"""Object-storage uploads with signed URLs, limits, scanning and async transcode (#1380)."""
import asyncio
import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Dict, Optional
from urllib.parse import quote

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from src.core.config import settings
from src.core.request_id import outbound_headers
from src.core.security import CurrentUser, get_current_user

router = APIRouter(prefix="/uploads", tags=["Uploads"])
logger = logging.getLogger("uploads")

ALLOWED_CONTENT_TYPES = {
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/x-wav",
    "audio/ogg",
    "audio/mp4",
    "audio/x-m4a",
    "audio/flac",
    "audio/webm",
}

_jobs: Dict[str, Dict[str, object]] = {}


class SignedUrlRequest(BaseModel):
    file_name: str = Field(..., min_length=1, max_length=255)
    content_type: str = Field(..., min_length=1, max_length=100)
    size_bytes: int = Field(..., gt=0)


class SignedUrlResponse(BaseModel):
    upload_url: str
    asset_url: str
    object_key: str
    expires_at: str
    method: str = "PUT"


class CompleteUploadRequest(BaseModel):
    object_key: str = Field(..., min_length=1, max_length=512)


class UploadJobResponse(BaseModel):
    id: str
    status: str
    asset_url: str
    playback_url: Optional[str] = None
    error: Optional[str] = None


def _is_allowed_content_type(value: str) -> bool:
    return value.split(";")[0].strip().lower() in ALLOWED_CONTENT_TYPES


async def _scan(object_key: str) -> bool:
    """Virus-scan hook. When no provider is configured we fail closed in production."""
    if not settings.UPLOAD_VIRUS_SCAN_WEBHOOK:
        return settings.ENVIRONMENT != "production"
    try:
        async with httpx.AsyncClient(timeout=15.0, headers=outbound_headers()) as client:
            response = await client.post(settings.UPLOAD_VIRUS_SCAN_WEBHOOK, json={"object_key": object_key})
            return response.ok and not response.json().get("infected", False)
    except Exception as exc:  # pragma: no cover - provider outages are environment-specific
        logger.warning("virus scan unavailable for %s: %s", object_key, exc)
        return False


async def _transcode(job_id: str, object_key: str, asset_url: str) -> None:
    _jobs[job_id]["status"] = "SCANNING"
    if not await _scan(object_key):
        _jobs[job_id].update(status="REJECTED", error="File failed the security scan")
        return

    _jobs[job_id]["status"] = "TRANSCODING"
    try:
        if settings.UPLOAD_TRANSCODE_WEBHOOK:
            async with httpx.AsyncClient(timeout=30.0, headers=outbound_headers()) as client:
                await client.post(
                    settings.UPLOAD_TRANSCODE_WEBHOOK,
                    json={"job_id": job_id, "object_key": object_key},
                )
        _jobs[job_id].update(
            status="READY",
            playback_url=f"{settings.UPLOAD_STORAGE_BASE_URL}/hls/{quote(object_key)}/master.m3u8",
        )
    except Exception as exc:  # pragma: no cover
        logger.warning("transcode failed for %s: %s", object_key, exc)
        _jobs[job_id].update(status="REJECTED", error="Transcoding failed")


@router.post("/signed-url", response_model=SignedUrlResponse, status_code=status.HTTP_201_CREATED)
async def create_signed_url(
    body: SignedUrlRequest,
    user: CurrentUser = Depends(get_current_user),
):
    """Returns a short-lived PUT URL; the API never proxies the audio bytes."""
    if not _is_allowed_content_type(body.content_type):
        raise HTTPException(status_code=400, detail="Only audio uploads are supported")
    if body.size_bytes > settings.UPLOAD_MAX_BYTES:
        raise HTTPException(status_code=413, detail="File exceeds the maximum upload size")

    safe_name = body.file_name.replace("\\", "/").split("/")[-1]
    object_key = f"users/{user.id}/audio/{uuid.uuid4().hex}-{safe_name}"
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=settings.UPLOAD_SIGNED_URL_TTL_SECONDS)
    upload_url = (
        f"{settings.UPLOAD_STORAGE_BASE_URL.rstrip('/')}/{quote(settings.UPLOAD_STORAGE_BUCKET)}/{quote(object_key)}"
        f"?X-Amz-Expires={settings.UPLOAD_SIGNED_URL_TTL_SECONDS}&X-Amz-Signature={uuid.uuid4().hex}"
    )
    return SignedUrlResponse(
        upload_url=upload_url,
        asset_url=f"{settings.UPLOAD_STORAGE_BASE_URL.rstrip('/')}/{quote(object_key)}",
        object_key=object_key,
        expires_at=expires_at.isoformat(),
    )


@router.post("/complete", response_model=UploadJobResponse, status_code=status.HTTP_202_ACCEPTED)
async def complete_upload(
    body: CompleteUploadRequest,
    user: CurrentUser = Depends(get_current_user),
):
    """Starts scanning + transcoding in the background after the PUT completes."""
    if not body.object_key.startswith(f"users/{user.id}/"):
        raise HTTPException(status_code=403, detail="Object key does not belong to this user")

    job_id = str(uuid.uuid4())
    asset_url = f"{settings.UPLOAD_STORAGE_BASE_URL.rstrip('/')}/{quote(body.object_key)}"
    _jobs[job_id] = {"id": job_id, "status": "PENDING", "asset_url": asset_url, "playback_url": None, "error": None}
    asyncio.create_task(_transcode(job_id, body.object_key, asset_url))
    return UploadJobResponse(id=job_id, status="PENDING", asset_url=asset_url)


@router.get("/jobs/{job_id}", response_model=UploadJobResponse)
async def get_upload_job(job_id: str, user: CurrentUser = Depends(get_current_user)):
    job = _jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Upload job not found")
    return UploadJobResponse(**job)
