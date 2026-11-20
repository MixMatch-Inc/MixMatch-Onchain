"""Blocking, reporting and the review queue (#1408)."""
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from src.core.database import Base, get_db
from src.db.models import User
from src.main import app
from src.modules.moderation import service

ALICE, BOB, CAROL, ADMIN = "u-alice", "u-bob", "u-carol", "u-admin"


@pytest.fixture
async def session_factory():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with factory() as session:
        for uid in (ALICE, BOB, CAROL, ADMIN):
            session.add(User(id=uid, email=f"{uid}@example.com", display_name=uid))
        await session.commit()
    yield factory
    await engine.dispose()


@pytest.fixture
async def db(session_factory):
    async with session_factory() as session:
        yield session


@pytest.fixture
async def client(session_factory):
    async def override_get_db():
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
    app.dependency_overrides.pop(get_db, None)


async def test_block_is_idempotent_and_not_self(db):
    first = await service.block_user(db, ALICE, BOB)
    again = await service.block_user(db, ALICE, BOB)
    assert first.id == again.id
    with pytest.raises(service.ModerationError):
        await service.block_user(db, ALICE, ALICE)


async def test_blocking_hides_both_ways_in_deck_queries(db):
    await service.block_user(db, ALICE, BOB)
    assert await service.hidden_user_ids(db, ALICE) == {BOB}
    assert await service.hidden_user_ids(db, BOB) == {ALICE}

    deck_for_alice = (await db.execute(service.exclude_blocked(select(User.id), User.id, ALICE))).scalars().all()
    deck_for_bob = (await db.execute(service.exclude_blocked(select(User.id), User.id, BOB))).scalars().all()
    assert BOB not in deck_for_alice and CAROL in deck_for_alice
    assert ALICE not in deck_for_bob and CAROL in deck_for_bob


async def test_chat_is_refused_between_blocked_users(db):
    await service.block_user(db, ALICE, BOB)
    assert not await service.can_interact(db, ALICE, BOB)
    assert not await service.can_interact(db, BOB, ALICE)
    assert await service.can_interact(db, ALICE, CAROL)


async def test_unblock_restores_visibility(db):
    await service.block_user(db, ALICE, BOB)
    assert await service.unblock_user(db, ALICE, BOB)
    assert not await service.unblock_user(db, ALICE, BOB)
    assert await service.can_interact(db, ALICE, BOB)


async def test_report_validation(db):
    with pytest.raises(service.ModerationError):
        await service.create_report(db, ALICE, BOB, "NOT_A_REASON", None)
    with pytest.raises(service.ModerationError):
        await service.create_report(db, ALICE, ALICE, "SPAM", None)


async def test_http_block_report_and_admin_queue(client):
    headers = {"X-User-Id": ALICE}
    assert (await client.post("/api/blocks", json={"user_id": BOB}, headers=headers)).status_code == 201
    assert [b["blocked_id"] for b in (await client.get("/api/blocks", headers=headers)).json()] == [BOB]

    created = await client.post("/api/reports", json={"user_id": CAROL, "reason": "SPAM"}, headers=headers)
    assert created.status_code == 201
    report_id = created.json()["id"]

    # Normal users cannot see the queue.
    assert (await client.get("/api/admin/reports", headers=headers)).status_code == 403

    admin = {"X-User-Id": ADMIN, "X-User-Role": "ADMIN"}
    queue = await client.get("/api/admin/reports", headers=admin)
    assert [r["id"] for r in queue.json()] == [report_id]

    resolved = await client.post(
        f"/api/admin/reports/{report_id}/resolve", json={"outcome": "ACTIONED", "deactivate_user": True}, headers=admin
    )
    assert resolved.status_code == 200 and resolved.json()["status"] == "ACTIONED"
    assert (await client.get("/api/admin/reports", headers=admin)).json() == []
    again = await client.post(f"/api/admin/reports/{report_id}/resolve", json={"outcome": "DISMISSED"}, headers=admin)
    assert again.status_code == 409

    assert (await client.delete(f"/api/blocks/{BOB}", headers=headers)).status_code == 204
    assert (await client.delete(f"/api/blocks/{BOB}", headers=headers)).status_code == 404
