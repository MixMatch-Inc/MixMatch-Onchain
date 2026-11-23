import pytest
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from src.core.database import Base
from src.db.models import StreamingConnection, TasteProfile, User
from src.modules.matches.service import MatchService, score_compatibility
from src.modules.taste.service import TasteService


@pytest.fixture
async def db_session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with session_factory() as session:
        yield session
    await engine.dispose()


@pytest.mark.asyncio
async def test_taste_embedding_nearest_neighbors(db_session):
    """#1372: nearest-neighbour query returns similar users."""
    svc = TasteService(db=db_session)
    p1 = TasteProfile(
        user_id="u1", top_artists=["A", "B"], top_genres=["rock"],
        acousticness=0.1, danceability=0.8, energy=0.9, valence=0.7,
        source="spotify",
    )
    p1.embedding = svc._compute_embedding if False else None
    # compute embeddings via service helper
    from src.modules.taste.service import _compute_embedding
    p1.embedding = _compute_embedding({"top_artists": ["A", "B"], "top_genres": ["rock"], "acousticness": 0.1, "danceability": 0.8, "energy": 0.9, "valence": 0.7})
    p2 = TasteProfile(
        user_id="u2", top_artists=["A", "B"], top_genres=["rock"],
        acousticness=0.1, danceability=0.8, energy=0.85, valence=0.7,
        source="spotify",
        embedding=_compute_embedding({"top_artists": ["A", "B"], "top_genres": ["rock"], "acousticness": 0.1, "danceability": 0.8, "energy": 0.85, "valence": 0.7}),
    )
    p3 = TasteProfile(
        user_id="u3", top_artists=["X"], top_genres=["classical"],
        acousticness=0.9, danceability=0.1, energy=0.1, valence=0.2,
        source="spotify",
        embedding=_compute_embedding({"top_artists": ["X"], "top_genres": ["classical"], "acousticness": 0.9, "danceability": 0.1, "energy": 0.1, "valence": 0.2}),
    )
    db_session.add_all([p1, p2, p3])
    await db_session.commit()

    neighbors = await TasteService(db=db_session).nearest_neighbors("u1", limit=10)
    assert len(neighbors) >= 2
    assert neighbors[0]["user_id"] == "u2"
    assert neighbors[0]["similarity"] > neighbors[1]["similarity"]


@pytest.mark.asyncio
async def test_match_candidates_deterministic_ranking(db_session):
    """#1373: deterministic ranking covered by tests."""
    from src.modules.taste.service import _compute_embedding
    me = TasteProfile(user_id="me", top_artists=["A", "B"], top_genres=["rock"], acousticness=0.2, danceability=0.7, energy=0.8, valence=0.6, source="spotify",
                      embedding=_compute_embedding({"top_artists":["A","B"],"top_genres":["rock"],"acousticness":0.2,"danceability":0.7,"energy":0.8,"valence":0.6}))
    c1 = TasteProfile(user_id="c1", top_artists=["A", "B", "C"], top_genres=["rock"], acousticness=0.2, danceability=0.7, energy=0.8, valence=0.6, source="spotify",
                      embedding=_compute_embedding({"top_artists":["A","B","C"],"top_genres":["rock"],"acousticness":0.2,"danceability":0.7,"energy":0.8,"valence":0.6}))
    c2 = TasteProfile(user_id="c2", top_artists=["Z"], top_genres=["ambient"], acousticness=0.9, danceability=0.1, energy=0.1, valence=0.2, source="spotify",
                      embedding=_compute_embedding({"top_artists":["Z"],"top_genres":["ambient"],"acousticness":0.9,"danceability":0.1,"energy":0.1,"valence":0.2}))
    db_session.add_all([me, c1, c2])
    await db_session.commit()

    svc = MatchService(db=db_session)
    first = await svc.candidates("me", limit=10)
    second = await svc.candidates("me", limit=10)
    assert first == second
    assert [c["user_id"] for c in first] == ["c1", "c2"]
    assert first[0]["compatibility_score"] >= first[1]["compatibility_score"]

    compat = await svc.compatibility("me", "c1")
    assert compat is not None
    assert compat["other_user_id"] == "c1"
    assert 0.0 <= compat["score"] <= 1.0


@pytest.mark.asyncio
async def test_apple_music_connection_persisted(db_session):
    """#1370: Apple Music connection persisted/visible."""
    from src.modules.streaming.router import apple_music_connect, AppleMusicConnectRequest

    body = AppleMusicConnectRequest(user_id="u1", music_user_token="music-user-token", provider_account_id="apple-acc-1")
    res = await apple_music_connect(body=body, db=db_session)
    assert res["ok"] is True
    assert res["connection"]["provider"] == "apple_music"

    row = (await db_session.execute(
        __import__('sqlalchemy').select(StreamingConnection).where(StreamingConnection.user_id == "u1")
    )).scalars().first()
    assert row is not None
    assert row.provider == "apple_music"


@pytest.mark.asyncio
async def test_connected_account_produces_non_mock_profile(db_session, monkeypatch):
    """#1371: connected account produces a non-mock profile."""
    import httpx
    from src.modules.taste.service import TasteService

    db_session.add(User(id="u1", email="u1@example.com", password_hash="x", role="USER"))
    db_session.add(StreamingConnection(
        user_id="u1", provider="spotify", provider_account_id="sp1",
        access_token="tok", refresh_token="ref", expires_at=None,
    ))
    await db_session.commit()

    class FakeResp:
        def __init__(self, data, ok=True):
            self._data = data
            self.is_success = ok
        def json(self):
            return self._data

    class FakeClient:
        def __init__(self, *args, **kwargs):
            pass
        async def __aenter__(self):
            return self
        async def __aexit__(self, exc_type, exc, tb):
            return False
        async def get(self, url, headers=None):
            if "top/artists" in url:
                return FakeResp({"items": [{"name": "Artist A", "genres": ["pop"]}]})
            if "top/tracks" in url:
                return FakeResp({"items": [{"id": "t1", "name": "Track 1"}]})
            if "audio-features" in url:
                return FakeResp({"audio_features": [{"acousticness": 0.2, "danceability": 0.8, "energy": 0.7, "valence": 0.6}]})
            return FakeResp({}, ok=False)
        async def post(self, url, data=None, headers=None):
            return FakeResp({}, ok=False)

    monkeypatch.setattr(httpx, "AsyncClient", FakeClient)
    svc = TasteService(db=db_session)
    profile = await svc.ingest_streaming_history("u1")
    assert profile is not None
    assert profile["is_mock"] is False
    assert "Artist A" in profile["top_artists"]

    got = await svc.compute_user_taste_profile("u1")
    assert got["is_mock"] is False
