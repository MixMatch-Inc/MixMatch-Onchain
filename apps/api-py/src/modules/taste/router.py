from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Path
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.modules.taste.service import TasteService

try:
    from src.core.config import settings
    _ENABLE_TASTE_CRON = bool(getattr(settings, "ENABLE_TASTE_CRON", False))
except Exception:
    settings = None  # type: ignore
    _ENABLE_TASTE_CRON = False

router = APIRouter(prefix="/taste", tags=["Taste"])


class TasteProfileResponse(BaseModel):
    user_id: str
    top_artists: list[str] = []
    top_genres: list[str] = []
    top_tracks: list[str] = []
    acousticness: float = 0.0
    danceability: float = 0.0
    energy: float = 0.0
    valence: float = 0.0
    embedding: Optional[list[float]] = None
    source: str = "mock"
    is_mock: bool


class TasteHealthResponse(BaseModel):
    status: str
    cron_enabled: bool
    service: str
    is_stub: bool


async def _get_db_optional():
    try:
        async for session in get_db():
            yield session
    except Exception:
        yield None


@router.get("/health", response_model=TasteHealthResponse, summary="Taste module health and configuration status")
async def taste_health():
    return {
        "status": "healthy",
        "cron_enabled": _ENABLE_TASTE_CRON,
        "service": "taste-profiler",
        "is_stub": False,
    }


@router.get(
    "/profile/{user_id}",
    response_model=TasteProfileResponse,
    summary="Get user music taste profile"
)
async def get_taste_profile(user_id: str = Path(...), db: Optional[AsyncSession] = Depends(_get_db_optional)):
    svc = TasteService(db=db)
    profile = await svc.compute_user_taste_profile(user_id)
    return profile


@router.post(
    "/ingest/{user_id}",
    summary="Ingest streaming history and compute taste profile"
)
async def ingest_taste_profile(user_id: str = Path(...), db: Optional[AsyncSession] = Depends(_get_db_optional)):
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    svc = TasteService(db=db)
    profile = await svc.ingest_streaming_history(user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="No connected streaming account or no data ingested")
    return profile


@router.get("/neighbors/{user_id}")
async def nearest_neighbors(
    user_id: str = Path(...),
    limit: int = 10,
    db: Optional[AsyncSession] = Depends(_get_db_optional),
):
    if db is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    svc = TasteService(db=db)
    neighbors = await svc.nearest_neighbors(user_id=user_id, limit=limit)
    return {"user_id": user_id, "neighbors": neighbors}
