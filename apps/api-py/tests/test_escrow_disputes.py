"""Escrow dispute and arbiter flow (#1400)."""
import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from src.core.database import Base, get_db
from src.db.models import Escrow, StellarAccount, User
from src.main import app

PAYER, PAYEE, ARBITER, OUTSIDER = "u-payer", "u-payee", "u-arbiter", "u-outsider"
PAYEE_KEY = "G" + "B" * 55


@pytest.fixture
async def session_factory():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with factory() as session:
        for uid in (PAYER, PAYEE, ARBITER, OUTSIDER):
            session.add(User(id=uid, email=f"{uid}@example.com", display_name=uid))
        session.add(StellarAccount(id="acct-payer", user_id=PAYER, public_key="G" + "A" * 55, network="testnet"))
        session.add(StellarAccount(id="acct-payee", user_id=PAYEE, public_key=PAYEE_KEY, network="testnet"))
        await session.commit()
    yield factory
    await engine.dispose()


@pytest.fixture
async def client(session_factory):
    async def override_get_db():
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
    app.dependency_overrides.pop(get_db, None)


async def make_escrow(session_factory, status="LOCKED") -> str:
    async with session_factory() as session:
        escrow = Escrow(
            idempotency_key=str(uuid.uuid4()),
            payer_stellar_account_id="acct-payer",
            payee_public_key=PAYEE_KEY,
            token_contract_id="C" + "A" * 55,
            amount="1000",
            status=status,
        )
        session.add(escrow)
        await session.commit()
        return escrow.id


def as_user(uid, role="USER"):
    return {"X-User-Id": uid, "X-User-Role": role}


async def test_full_dispute_flow_refund(client, session_factory):
    escrow_id = await make_escrow(session_factory)

    opened = await client.post(f"/api/escrows/{escrow_id}/dispute", json={"reason": "Item never arrived"}, headers=as_user(PAYER))
    assert opened.status_code == 201
    dispute_id = opened.json()["id"]

    # Normal release is blocked while disputed.
    released = await client.post(f"/api/escrows/{escrow_id}/release", headers=as_user(PAYER))
    assert released.status_code == 422

    # Both parties can add evidence; outsiders cannot.
    assert (await client.post(f"/api/escrows/{escrow_id}/dispute/evidence", json={"note": "Tracking shows lost"}, headers=as_user(PAYER))).status_code == 201
    assert (await client.post(f"/api/escrows/{escrow_id}/dispute/evidence", json={"note": "Shipped on the 3rd"}, headers=as_user(PAYEE))).status_code == 201
    assert (await client.post(f"/api/escrows/{escrow_id}/dispute/evidence", json={"note": "hi"}, headers=as_user(OUTSIDER))).status_code == 403

    # Arbiter queue is role-guarded; parties cannot settle.
    assert (await client.get("/api/arbiter/disputes", headers=as_user(PAYER))).status_code == 403
    queue = await client.get("/api/arbiter/disputes", headers=as_user(ARBITER, "ARBITER"))
    assert [d["id"] for d in queue.json()] == [dispute_id]
    assert len(queue.json()[0]["evidence"]) == 2

    resolved = await client.post(
        f"/api/arbiter/disputes/{dispute_id}/resolve",
        json={"resolution": "REFUND", "note": "Carrier confirmed loss"},
        headers=as_user(ARBITER, "ARBITER"),
    )
    assert resolved.status_code == 200 and resolved.json()["status"] == "RESOLVED"

    escrow = await client.get(f"/api/escrows/{escrow_id}", headers=as_user(PAYER))
    assert escrow.json()["status"] == "REFUNDED"

    again = await client.post(
        f"/api/arbiter/disputes/{dispute_id}/resolve", json={"resolution": "RELEASE", "note": "x"}, headers=as_user(ARBITER, "ARBITER")
    )
    assert again.status_code == 409


async def test_release_resolution(client, session_factory):
    escrow_id = await make_escrow(session_factory)
    dispute = await client.post(f"/api/escrows/{escrow_id}/dispute", json={"reason": "Buyer is unresponsive"}, headers=as_user(PAYEE))
    resolved = await client.post(
        f"/api/arbiter/disputes/{dispute.json()['id']}/resolve",
        json={"resolution": "RELEASE", "note": "Delivered"},
        headers=as_user(ARBITER, "ADMIN"),
    )
    assert resolved.json()["resolution"] == "RELEASE"
    async with session_factory() as session:
        assert (await session.get(Escrow, escrow_id)).status == "RELEASED"


async def test_cannot_dispute_unlocked_escrow_or_as_outsider(client, session_factory):
    pending = await make_escrow(session_factory, status="RELEASED")
    assert (await client.post(f"/api/escrows/{pending}/dispute", json={"reason": "x"}, headers=as_user(PAYER))).status_code == 422
    locked = await make_escrow(session_factory)
    assert (await client.post(f"/api/escrows/{locked}/dispute", json={"reason": "x"}, headers=as_user(OUTSIDER))).status_code == 403
