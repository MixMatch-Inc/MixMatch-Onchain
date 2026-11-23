import math
from typing import Any, Dict, List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models import TasteProfile


def _cosine(a: List[float], b: List[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)


def _shared_artists(a: List[str], b: List[str]) -> List[str]:
    sa = {x.strip().lower() for x in (a or []) if x}
    sb = {x.strip().lower() for x in (b or []) if x}
    return sorted(sa.intersection(sb))


def score_compatibility(profile_a: Dict[str, Any], profile_b: Dict[str, Any]) -> Dict[str, Any]:
    emb_a = profile_a.get("embedding") or []
    emb_b = profile_b.get("embedding") or []
    emb_sim = _cosine(emb_a, emb_b) if emb_a and emb_b else 0.0

    artists_a = profile_a.get("top_artists") or []
    artists_b = profile_b.get("top_artists") or []
    shared = _shared_artists(artists_a, artists_b)
    artist_score = min(len(shared) / 5.0, 1.0)

    # Weighted score: embedding similarity + shared artists
    score = (0.7 * max(0.0, emb_sim)) + (0.3 * artist_score)
    score = max(0.0, min(1.0, score))
    return {
        "score": round(score, 6),
        "embedding_similarity": round(max(0.0, emb_sim), 6),
        "shared_artists": shared,
        "shared_artist_count": len(shared),
    }


class MatchService:
    def __init__(self, db: Optional[AsyncSession] = None):
        self.db = db

    async def get_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        if self.db is None:
            return None
        result = await self.db.execute(select(TasteProfile).where(TasteProfile.user_id == user_id))
        row = result.scalars().first()
        if not row:
            return None
        return {
            "user_id": row.user_id,
            "top_artists": row.top_artists or [],
            "top_genres": row.top_genres or [],
            "embedding": row.embedding or [],
        }

    async def candidates(self, user_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        if self.db is None:
            return []
        me = await self.get_profile(user_id)
        if not me:
            return []
        result = await self.db.execute(select(TasteProfile).where(TasteProfile.user_id != user_id))
        rows = result.scalars().all()
        scored: List[Dict[str, Any]] = []
        for row in rows:
            other = {
                "user_id": row.user_id,
                "top_artists": row.top_artists or [],
                "top_genres": row.top_genres or [],
                "embedding": row.embedding or [],
            }
            compat = score_compatibility(me, other)
            scored.append({
                "user_id": row.user_id,
                "compatibility_score": compat["score"],
                "shared_artists": compat["shared_artists"],
                "embedding_similarity": compat["embedding_similarity"],
            })
        scored.sort(key=lambda x: (-x["compatibility_score"], x["user_id"]))
        return scored[: max(1, min(limit, 100))]

    async def compatibility(self, user_id: str, other_user_id: str) -> Optional[Dict[str, Any]]:
        if self.db is None:
            return None
        me = await self.get_profile(user_id)
        other = await self.get_profile(other_user_id)
        if not me or not other:
            return None
        compat = score_compatibility(me, other)
        return {
            "user_id": user_id,
            "other_user_id": other_user_id,
            **compat,
        }
