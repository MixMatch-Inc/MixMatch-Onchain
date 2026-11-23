from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.security import CurrentUser, get_current_user
from src.db.models import Match, Swipe, TasteProfile, User

router = APIRouter(tags=["Swipes"])

DAILY_SWIPE_LIMIT = 25


class SwipeRequest(BaseModel):
    swiped_id: str = Field(..., min_length=1)
    direction: str = Field(..., pattern="^(like|pass)$")


@router.get("/deck")
async def get_deck(
    user_id: Optional[str] = Query(default=None),
    limit: int = Query(20, ge=1, le=100),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    uid = user_id or current_user.id
    # enforce daily limit awareness
    start_of_day = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    swipe_count_res = await db.execute(
        select(func.count(Swipe.id)).where(Swipe.swiper_id == uid, Swipe.created_at >= start_of_day)
    )
    swipe_count = int(swipe_count_res.scalar() or 0)
    remaining = max(0, DAILY_SWIPE_LIMIT - swipe_count)

    swiped_res = await db.execute(select(Swipe.swiped_id).where(Swipe.swiper_id == uid))
    swiped_ids = {r[0] for r in swiped_res.all()}
    swiped_ids.add(uid)

    users_res = await db.execute(select(User).where(User.id.notin_(swiped_ids)).limit(limit))
    users = users_res.scalars().all()

    deck = []
    for u in users:
        tp_res = await db.execute(select(TasteProfile).where(TasteProfile.user_id == u.id).order_by(TasteProfile.last_ingested_at.desc()))
        tp = tp_res.scalars().first()
        deck.append(
            {
                "user_id": u.id,
                "display_name": u.display_name or u.handle or u.email,
                "avatar_url": u.avatar_url,
                "top_artists": (tp.top_artists if tp else []) or [],
                "top_genres": (tp.top_genres if tp else []) or [],
            }
        )

    return {
        "user_id": uid,
        "deck": deck,
        "daily_limit": DAILY_SWIPE_LIMIT,
        "swipes_today": swipe_count,
        "remaining_today": remaining,
    }


@router.post("/swipes", status_code=status.HTTP_201_CREATED)
async def create_swipe(
    body: SwipeRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    uid = current_user.id
    if body.swiped_id == uid:
        raise HTTPException(status_code=400, detail="Cannot swipe on yourself")

    start_of_day = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    swipe_count_res = await db.execute(
        select(func.count(Swipe.id)).where(Swipe.swiper_id == uid, Swipe.created_at >= start_of_day)
    )
    swipe_count = int(swipe_count_res.scalar() or 0)
    if swipe_count >= DAILY_SWIPE_LIMIT:
        raise HTTPException(status_code=429, detail="Daily swipe limit reached")

    existing = await db.execute(
        select(Swipe).where(Swipe.swiper_id == uid, Swipe.swiped_id == body.swiped_id)
    )
    if existing.scalars().first():
        raise HTTPException(status_code=409, detail="Already swiped on this user")

    swipe = Swipe(swiper_id=uid, swiped_id=body.swiped_id, direction=body.direction)
    db.add(swipe)
    await db.flush()

    match_created = None
    if body.direction == "like":
        reciprocal = await db.execute(
            select(Swipe).where(
                Swipe.swiper_id == body.swiped_id,
                Swipe.swiped_id == uid,
                Swipe.direction == "like",
            )
        )
        if reciprocal.scalars().first():
            a, b = sorted([uid, body.swiped_id])
            existing_match = await db.execute(
                select(Match).where(Match.user_a_id == a, Match.user_b_id == b)
            )
            m = existing_match.scalars().first()
            if not m:
                m = Match(user_a_id=a, user_b_id=b)
                db.add(m)
                await db.flush()
            match_created = {"id": m.id, "user_a_id": m.user_a_id, "user_b_id": m.user_b_id}

    await db.commit()
    return {
        "ok": True,
        "swipe": {
            "id": swipe.id,
            "swiper_id": swipe.swiper_id,
            "swiped_id": swipe.swiped_id,
            "direction": swipe.direction,
        },
        "match": match_created,
    }
