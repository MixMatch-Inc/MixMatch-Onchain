import hashlib
import logging
import math
import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models import StreamingConnection, TasteProfile

logger = logging.getLogger("taste.service")


def _mock_profile(user_id: str) -> Dict[str, Any]:
    return {
        "user_id": user_id,
        "top_artists": ["Radiohead", "Daft Punk", "The Weeknd"],
        "top_genres": ["indie-rock", "synthwave", "electronic"],
        "top_tracks": [],
        "acousticness": 0.42,
        "danceability": 0.78,
        "energy": 0.85,
        "valence": 0.65,
        "embedding": None,
        "source": "mock",
        "is_mock": True,
    }


def _compute_embedding(profile: Dict[str, Any], dim: int = 32) -> List[float]:
    """Deterministic lightweight embedding from taste features and artists/genres."""
    vec = [0.0] * dim
    for idx, key in enumerate(["acousticness", "danceability", "energy", "valence"]):
        vec[idx] = float(profile.get(key) or 0.0)
    tokens: List[str] = []
    for item in (profile.get("top_artists") or []):
        tokens.append(f"artist:{item}")
    for item in (profile.get("top_genres") or []):
        tokens.append(f"genre:{item}")
    for token in tokens:
        h = hashlib.sha256(token.lower().encode("utf-8")).digest()
        for i in range(dim):
            vec[i] += ((h[i % len(h)] / 255.0) - 0.5) * 0.2
    norm = math.sqrt(sum(v * v for v in vec)) or 1.0
    return [round(v / norm, 6) for v in vec]


class TasteService:
    """Taste profile service with streaming ingestion and deterministic embeddings."""

    is_stub = False

    def __init__(self, db: Optional[AsyncSession] = None):
        self.db = db

    async def compute_user_taste_profile(self, user_id: str) -> Dict[str, Any]:
        if self.db is None:
            return _mock_profile(user_id)
        result = await self.db.execute(
            select(TasteProfile).where(TasteProfile.user_id == user_id).order_by(TasteProfile.last_ingested_at.desc())
        )
        row = result.scalars().first()
        if not row or row.source == "mock":
            return _mock_profile(user_id)
        return {
            "user_id": row.user_id,
            "top_artists": row.top_artists or [],
            "top_genres": row.top_genres or [],
            "top_tracks": row.top_tracks or [],
            "acousticness": float(row.acousticness or 0.0),
            "danceability": float(row.danceability or 0.0),
            "energy": float(row.energy or 0.0),
            "valence": float(row.valence or 0.0),
            "embedding": row.embedding,
            "source": row.source,
            "is_mock": False,
        }

    async def _refresh_spotify_token(self, conn: StreamingConnection) -> Optional[str]:
        token = conn.access_token
        if conn.expires_at and conn.expires_at > datetime.now(timezone.utc) + timedelta(seconds=30):
            return token
        if not conn.refresh_token:
            return token
        client_id = os.getenv("SPOTIFY_CLIENT_ID", "")
        client_secret = os.getenv("SPOTIFY_CLIENT_SECRET", "")
        if not client_id or not client_secret:
            return token
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                resp = await client.post(
                    "https://accounts.spotify.com/api/token",
                    data={
                        "grant_type": "refresh_token",
                        "refresh_token": conn.refresh_token,
                        "client_id": client_id,
                        "client_secret": client_secret,
                    },
                    headers={"Content-Type": "application/x-www-form-urlencoded"},
                )
            if not resp.is_success:
                return token
            data = resp.json()
            new_token = data.get("access_token")
            if not new_token:
                return token
            conn.access_token = new_token
            if data.get("refresh_token"):
                conn.refresh_token = data["refresh_token"]
            if data.get("expires_in"):
                conn.expires_at = datetime.now(timezone.utc) + timedelta(seconds=int(data["expires_in"]))
            conn.updated_at = datetime.now(timezone.utc)
            if self.db:
                await self.db.commit()
            return new_token
        except Exception:
            logger.exception("Failed to refresh spotify token for connection %s", conn.id)
            return token

    async def ingest_streaming_history(self, user_id: str) -> Optional[Dict[str, Any]]:
        if self.db is None:
            return None
        result = await self.db.execute(
            select(StreamingConnection).where(StreamingConnection.user_id == user_id)
        )
        connections = result.scalars().all()
        if not connections:
            return None

        top_artists: List[str] = []
        top_genres: List[str] = []
        top_tracks: List[str] = []
        features: List[Dict[str, float]] = []
        source = "unknown"

        for conn in connections:
            if conn.provider == "spotify":
                source = "spotify"
                token = await self._refresh_spotify_token(conn)
                if not token:
                    continue
                try:
                    async with httpx.AsyncClient(timeout=20.0) as client:
                        headers = {"Authorization": f"Bearer {token}"}
                        artists_resp = await client.get("https://api.spotify.com/v1/me/top/artists?limit=10", headers=headers)
                        tracks_resp = await client.get("https://api.spotify.com/v1/me/top/tracks?limit=10", headers=headers)
                    if artists_resp.is_success:
                        items = artists_resp.json().get("items", [])
                        for a in items:
                            name = a.get("name")
                            if name and name not in top_artists:
                                top_artists.append(name)
                            for g in (a.get("genres") or []):
                                if g and g not in top_genres:
                                    top_genres.append(g)
                    if tracks_resp.is_success:
                        items = tracks_resp.json().get("items", [])
                        track_ids = []
                        for t in items:
                            name = t.get("name")
                            if name and name not in top_tracks:
                                top_tracks.append(name)
                            if t.get("id"):
                                track_ids.append(t["id"])
                        # Audio features endpoint - best effort
                        if track_ids:
                            try:
                                async with httpx.AsyncClient(timeout=20.0) as client:
                                    feat_resp = await client.get(
                                        f"https://api.spotify.com/v1/audio-features?ids={','.join(track_ids[:20])}",
                                        headers={"Authorization": f"Bearer {token}"},
                                    )
                                if feat_resp.is_success:
                                    for f in (feat_resp.json().get("audio_features") or []):
                                        if not f:
                                            continue
                                        features.append({
                                            "acousticness": float(f.get("acousticness") or 0.0),
                                            "danceability": float(f.get("danceability") or 0.0),
                                            "energy": float(f.get("energy") or 0.0),
                                            "valence": float(f.get("valence") or 0.0),
                                        })
                            except Exception:
                                logger.debug("Audio features fetch failed", exc_info=True)
                except Exception:
                    logger.exception("Spotify ingestion failed for user %s", user_id)
            elif conn.provider == "apple_music":
                source = "apple_music"
                # MusicKit user token stored as access_token; developer token via env
                dev_token = os.getenv("APPLE_MUSIC_DEVELOPER_TOKEN", "")
                user_token = conn.access_token
                if dev_token and user_token:
                    try:
                        async with httpx.AsyncClient(timeout=20.0) as client:
                            headers = {
                                "Authorization": f"Bearer {dev_token}",
                                "Music-User-Token": user_token,
                            }
                            resp = await client.get(
                                "https://api.music.apple.com/v1/me/recent/played/tracks?limit=10",
                                headers=headers,
                            )
                        if resp.is_success:
                            for item in resp.json().get("data", []):
                                attrs = item.get("attributes", {})
                                name = attrs.get("name")
                                artist = attrs.get("artistName")
                                genre_names = attrs.get("genreNames") or []
                                if name and name not in top_tracks:
                                    top_tracks.append(name)
                                if artist and artist not in top_artists:
                                    top_artists.append(artist)
                                for g in genre_names:
                                    if g and g not in top_genres:
                                        top_genres.append(g)
                    except Exception:
                        logger.exception("Apple Music ingestion failed for user %s", user_id)

        if not top_artists and not top_tracks and not top_genres:
            return None

        def avg(key: str, default: float) -> float:
            vals = [f[key] for f in features if key in f]
            return round(sum(vals) / len(vals), 4) if vals else default

        profile_data = {
            "user_id": user_id,
            "top_artists": top_artists[:20],
            "top_genres": top_genres[:20],
            "top_tracks": top_tracks[:20],
            "acousticness": avg("acousticness", 0.5),
            "danceability": avg("danceability", 0.5),
            "energy": avg("energy", 0.5),
            "valence": avg("valence", 0.5),
            "source": source,
        }
        profile_data["embedding"] = _compute_embedding(profile_data)

        result = await self.db.execute(select(TasteProfile).where(TasteProfile.user_id == user_id))
        row = result.scalars().first()
        if row:
            row.top_artists = profile_data["top_artists"]
            row.top_genres = profile_data["top_genres"]
            row.top_tracks = profile_data["top_tracks"]
            row.acousticness = profile_data["acousticness"]
            row.danceability = profile_data["danceability"]
            row.energy = profile_data["energy"]
            row.valence = profile_data["valence"]
            row.embedding = profile_data["embedding"]
            row.source = profile_data["source"]
            row.last_ingested_at = datetime.now(timezone.utc)
        else:
            row = TasteProfile(
                user_id=user_id,
                top_artists=profile_data["top_artists"],
                top_genres=profile_data["top_genres"],
                top_tracks=profile_data["top_tracks"],
                acousticness=profile_data["acousticness"],
                danceability=profile_data["danceability"],
                energy=profile_data["energy"],
                valence=profile_data["valence"],
                embedding=profile_data["embedding"],
                source=profile_data["source"],
                last_ingested_at=datetime.now(timezone.utc),
            )
            self.db.add(row)
        await self.db.commit()
        await self.db.refresh(row)
        profile_data["is_mock"] = False
        return profile_data

    async def execute_nightly_computation_batch(self) -> int:
        """Batch computation called by cron scheduler."""
        if self.db is None:
            logger.info("Executing nightly taste profile computation batch (stub)")
            return 0
        result = await self.db.execute(select(StreamingConnection.user_id).distinct())
        user_ids = [r[0] for r in result.all()]
        processed = 0
        for uid in user_ids:
            profile = await self.ingest_streaming_history(uid)
            if profile:
                processed += 1
        logger.info("Nightly taste computation processed %d profiles", processed)
        return processed

    async def nearest_neighbors(self, user_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        if self.db is None:
            return []
        result = await self.db.execute(select(TasteProfile).where(TasteProfile.user_id == user_id))
        me = result.scalars().first()
        if not me or not me.embedding:
            return []
        others_res = await self.db.execute(select(TasteProfile).where(TasteProfile.user_id != user_id))
        scored = []
        for row in others_res.scalars().all():
            if not row.embedding:
                continue
            # cosine similarity
            a, b = me.embedding, row.embedding
            if len(a) != len(b):
                continue
            dot = sum(x*y for x, y in zip(a, b))
            na = math.sqrt(sum(x*x for x in a))
            nb = math.sqrt(sum(x*x for x in b))
            sim = (dot / (na * nb)) if na and nb else 0.0
            scored.append({"user_id": row.user_id, "similarity": round(sim, 6)})
        scored.sort(key=lambda x: (-x["similarity"], x["user_id"]))
        return scored[: max(1, min(limit, 100))]
