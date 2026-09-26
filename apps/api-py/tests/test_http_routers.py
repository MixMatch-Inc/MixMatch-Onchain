import pytest
import uuid
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from src.core.database import Base, get_db
from src.db.models import User, StellarAccount, Transaction, Escrow, AnchorTransaction
from src.main import app

@pytest.fixture
async def db_engine():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()

@pytest.fixture
def session_factory(db_engine):
    return async_sessionmaker(db_engine, expire_on_commit=False, class_=AsyncSession)

@pytest.fixture
async def client(session_factory):
    async def override_get_db():
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()

@pytest.mark.asyncio
async def test_http_payments_router(client: AsyncClient, session_factory):
    """Issue #1130: HTTP-level tests for the ported payments router."""
    dest_pub = "G" + "K" * 55

    # 1. Send payment
    resp_send = await client.post(
        "/api/payments/send",
        json={
            "destination_public_key": dest_pub,
            "amount": "250.75",
            "memo": "HTTP test payment",
        },
    )
    assert resp_send.status_code == 200
    tx_data = resp_send.json()
    tx_id = tx_data["id"]
    assert tx_data["status"] == "SUCCESS"
    assert tx_data["amount"] == "250.7500000"

    # 2. Get status (200 success)
    resp_status = await client.get(f"/api/payments/{tx_id}/status")
    assert resp_status.status_code == 200
    assert resp_status.json()["id"] == tx_id

    # 3. Get status (422 malformed UUID)
    resp_bad = await client.get("/api/payments/not-a-valid-uuid/status")
    assert resp_bad.status_code == 422

    # 4. History endpoint
    resp_hist = await client.get("/api/payments/history?page=1&limit=10")
    assert resp_hist.status_code == 200
    hist_data = resp_hist.json()
    assert hist_data["total"] >= 1
    assert len(hist_data["transactions"]) >= 1

    # 5. Reconcile endpoint
    resp_rec = await client.post(f"/api/payments/{tx_id}/reconcile")
    assert resp_rec.status_code == 200

    # 6. Stream endpoint
    resp_stream = await client.get("/api/payments/stream")
    assert resp_stream.status_code == 200
    assert "text/event-stream" in resp_stream.headers["content-type"]

@pytest.mark.asyncio
async def test_http_admin_router(client: AsyncClient, session_factory, caplog):
    """Issue #1131: HTTP-level tests for the ported admin router."""
    tx_id = str(uuid.uuid4())
    async with session_factory() as session:
        acc = StellarAccount(id="acc_admin_http", user_id="u_admin_h", public_key="GADMINH123")
        session.add(acc)
        tx = Transaction(
            id=tx_id,
            idempotency_key="admin_http_pending",
            stellar_account_id=acc.id,
            destination_public_key="GDEST",
            amount="10000.0000000",
            status="PENDING_SIGNATURE",
        )
        session.add(tx)
        await session.commit()

    # 1. Non-admin forbidden (403)
    resp_user = await client.get(
        "/api/admin/transactions/pending-signature",
        headers={"x-user-role": "USER"},
    )
    assert resp_user.status_code == 403

    # 2. Admin success (200)
    resp_admin = await client.get(
        "/api/admin/transactions/pending-signature",
        headers={"x-user-role": "ADMIN"},
    )
    assert resp_admin.status_code == 200
    items = resp_admin.json()
    assert any(i["id"] == tx_id for i in items)

    # 3. Admin approve with audit log
    with caplog.at_level("INFO"):
        resp_app = await client.post(
            f"/api/admin/transactions/{tx_id}/approve",
            headers={"x-user-role": "ADMIN"},
        )
    assert resp_app.status_code == 200
    assert resp_app.json()["status"] == "SUCCESS"
    assert "AUDIT_TRAIL: Admin" in caplog.text

@pytest.mark.asyncio
async def test_http_anchor_router(client: AsyncClient, session_factory):
    """Issue #1132: HTTP-level tests for the ported anchor router."""
    # 1. Deposit
    resp_dep = await client.post(
        "/api/anchor/deposit",
        json={"asset_code": "USDC", "amount": "100.00"},
    )
    assert resp_dep.status_code == 200
    dep_data = resp_dep.json()
    dep_id = dep_data["id"]
    assert dep_data["status"] == "pending_user_transfer_start"

    # 2. Withdraw
    resp_wth = await client.post(
        "/api/anchor/withdraw",
        json={"asset_code": "USDC", "amount": "50.00"},
    )
    assert resp_wth.status_code == 200
    assert resp_wth.json()["kind"] == "withdrawal"

    # 3. Status with UUID validation (422 on invalid, 200 on valid)
    resp_bad = await client.get("/api/anchor/bad-uuid-format/status")
    assert resp_bad.status_code == 422

    resp_ok = await client.get(f"/api/anchor/{dep_id}/status")
    assert resp_ok.status_code == 200
    assert resp_ok.json()["id"] == dep_id

    # 4. History
    resp_hist = await client.get("/api/anchor/history?page=1&limit=5")
    assert resp_hist.status_code == 200
    assert resp_hist.json()["total"] >= 2

@pytest.mark.asyncio
async def test_http_escrow_router(client: AsyncClient, session_factory):
    """Issue #1133: HTTP-level tests for the ported escrow router."""
    payee = "G" + "M" * 55
    token = "C" + "N" * 55

    # 1. Create escrow
    resp_create = await client.post(
        "/api/escrows",
        json={
            "payee_public_key": payee,
            "token_contract_id": token,
            "amount": "500.0",
        },
    )
    assert resp_create.status_code == 200
    escrow = resp_create.json()
    escrow_id = escrow["id"]
    assert escrow["status"] == "LOCKED"

    # 2. Get escrow by id
    resp_get = await client.get(f"/api/escrows/{escrow_id}")
    assert resp_get.status_code == 200
    assert resp_get.json()["id"] == escrow_id

    # 3. Param validation 422
    resp_bad = await client.get("/api/escrows/not-valid-uuid")
    assert resp_bad.status_code == 422

    # 4. Release escrow
    resp_rel = await client.post(f"/api/escrows/{escrow_id}/release")
    assert resp_rel.status_code == 200
    assert resp_rel.json()["status"] == "RELEASED"

    # 5. Invalid release again returns 422
    resp_rel2 = await client.post(f"/api/escrows/{escrow_id}/release")
    assert resp_rel2.status_code == 422
