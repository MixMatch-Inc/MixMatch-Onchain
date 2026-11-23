from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Path, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.modules.matches.service import MatchService

router = APIRouter(prefix="/matches", tags=["Matches"])


async def _get_db_optional():
    try:
        async for session in get_db():
            yield session
    except Exception:
        yield None


@router.get("/candidates")
async def get_candidates(
    user_id: str = Query(..., description="User to get candidates for"),
    limit: int = Query(20, ge=1, le=100),
    db: Optional[AsyncSession] = Depends(_get_db_optional),
) -> Dict[str, Any]:
    svc = MatchService(db=db)
    candidates = await svc.candidates(user_id=user_id, limit=limit)
    return {"user_id": user_id, "candidates": candidates}


@router.get("/{id}/compatibility")
async def get_compatibility(
    id: str = Path(..., description="Other user ID or match target ID"),
    user_id: str = Query(..., description="Current user ID"),
    db: Optional[AsyncSession] = Depends(_get_db_optional),
) -> Dict[str, Any]:
    svc = MatchService(db=db)
    result = await svc.compatibility(user_id=user_id, other_user_id=id)
    if not result:
        raise HTTPException(status_code=404, detail="Compatibility could not be computed")
    return result
