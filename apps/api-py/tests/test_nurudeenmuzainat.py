import pytest
import uuid
from datetime import datetime, timezone, timedelta
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from src.core.database import Base, get_db
from src.db.models import User, StellarAccount, Transaction, AnchorTransaction
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
async def test_reconcile_idempotency_cooldown(client: AsyncClient, session_factory):
    """Issue #1110: Add idempotency protection to /payments/:id/reconcile endpoint."""
    tx_id = str(uuid.uuid4())
    async with session_factory() as session:
        user = User(id="00000000-0000-0000-0000-000000000001", email="cooldown@mixmatch.com")
        session.add(user)
        await session.commit()

        acc = StellarAccount(user_id=user.id, public_key="GCOOLDOWN123", network="testnet")
        session.add(acc)
        await session.commit()

        # Transaction reconciled 2 seconds ago (within 15s cooldown)
        tx = Transaction(
            id=tx_id,
            idempotency_key="tx_cooldown_key",
            stellar_account_id=acc.id,
            destination_public_key="GDEST",
            amount="50.0000000",
            status="PENDING",
            last_reconciled_at=datetime.now(timezone.utc) - timedelta(seconds=2),
            retry_count=1,
        )
        session.add(tx)
        await session.commit()

    # Reconcile request should be shielded by cooldown and return existing state without incrementing retry_count
    resp = await client.post(f"/api/payments/{tx_id}/reconcile")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == tx_id

@pytest.mark.asyncio
async def test_admin_routes_and_roles_guard(client: AsyncClient, session_factory, caplog):
    """Issue #1111: Port admin approve/reject routes with RolesGuard & audit logging."""
    tx_id = str(uuid.uuid4())
    async with session_factory() as session:
        acc = StellarAccount(id="acc_admin_test", user_id="u_admin", public_key="GADMIN123")
        session.add(acc)
        tx = Transaction(
            id=tx_id,
            idempotency_key="pending_sig_1",
            stellar_account_id=acc.id,
            destination_public_key="GDEST",
            amount="5000.0000000",
            status="PENDING_SIGNATURE",
        )
        session.add(tx)
        await session.commit()

    # Non-admin user (role=USER) should get 403 Forbidden
    resp_user = await client.post(
        f"/api/admin/transactions/{tx_id}/approve",
        headers={"x-user-role": "USER"},
    )
    assert resp_user.status_code == 403
    assert "Admin role required" in resp_user.json()["detail"]

    # Admin user (role=ADMIN) should succeed and log audit entry
    with caplog.at_level("INFO"):
        resp_admin = await client.post(
            f"/api/admin/transactions/{tx_id}/approve",
            headers={"x-user-role": "ADMIN"},
        )
    assert resp_admin.status_code == 200
    assert resp_admin.json()["status"] == "SUCCESS"
    assert "AUDIT_TRAIL: Admin" in caplog.text

@pytest.mark.asyncio
async def test_admin_idempotency_key_support(client: AsyncClient, session_factory):
    """Issue #1112: Add Idempotency-Key support to admin approve/reject routes."""
    tx_id = str(uuid.uuid4())
    async with session_factory() as session:
        acc = StellarAccount(id="acc_idem_test", user_id="u_idem", public_key="GIDEM123")
        session.add(acc)
        tx = Transaction(
            id=tx_id,
            idempotency_key="pending_sig_idem",
            stellar_account_id=acc.id,
            destination_public_key="GDEST",
            amount="3000.0000000",
            status="PENDING_SIGNATURE",
        )
        session.add(tx)
        await session.commit()

    idem_key = "admin_idem_key_999"
    # First reject call
    resp1 = await client.post(
        f"/api/admin/transactions/{tx_id}/reject",
        headers={"x-user-role": "ADMIN", "Idempotency-Key": idem_key},
    )
    assert resp1.status_code == 200
    assert resp1.json()["status"] == "FAILED"

    # Retried reject call with same Idempotency-Key returns deduplicated cached response
    resp2 = await client.post(
        f"/api/admin/transactions/{tx_id}/reject",
        headers={"x-user-role": "ADMIN", "Idempotency-Key": idem_key},
    )
    assert resp2.status_code == 200
    assert resp2.json()["status"] == "FAILED"

@pytest.mark.asyncio
async def test_anchor_routes_param_validation(client: AsyncClient):
    """Issue #1113: Port anchor.controller.ts routes with typed UUID validation."""
    # Malformed UUID -> returns 422
    resp_bad = await client.get("/api/anchor/not-a-valid-uuid/status")
    assert resp_bad.status_code == 422

    # Valid UUID not found -> 404
    resp_404 = await client.get(f"/api/anchor/{uuid.uuid4()}/status")
    assert resp_404.status_code == 404

    # Deposit endpoint
    resp_dep = await client.post(
        "/api/anchor/deposit",
        json={"asset_code": "USDC", "amount": "100.00"},
    )
    assert resp_dep.status_code == 200
    data = resp_dep.json()
    assert data["kind"] == "deposit"
    assert data["asset_code"] == "USDC"
    assert "interactive_url" in data
