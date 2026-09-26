from typing import Dict, Any
from fastapi import APIRouter, HTTPException, Path, status
from pydantic import BaseModel
from src.core.config import settings
from src.modules.taste.service import TasteService

router = APIRouter(prefix="/taste", tags=["Taste"])
taste_service = TasteService()


class TasteProfileResponse(BaseModel):
    user_id: str
    top_genres: list[str]
    acousticness: float
    danceability: float
    energy: float
    valence: float
    is_mock: bool


class TasteHealthResponse(BaseModel):
    status: str
    cron_enabled: bool
    service: str
    is_stub: bool


@router.get("/health", response_model=TasteHealthResponse, summary="Taste module health and configuration status")
async def taste_health():
    return {
        "status": "healthy",
        "cron_enabled": settings.ENABLE_TASTE_CRON,
        "service": "taste-profiler",
        "is_stub": True
    }


@router.get(
    "/profile/{user_id}",
    response_model=TasteProfileResponse,
    summary="Get user music taste profile (stub ported from NestJS)"
)
async def get_taste_profile(user_id: str = Path(...)):
    profile = await taste_service.compute_user_taste_profile(user_id)
    return profile
