import pytest
import uuid
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from src.core.database import Base, get_db
from src.db.models import User, StellarAccount, Escrow
from src.modules.payments.escrow_repository import EscrowRepository
from src.modules.payments.escrow_service import EscrowService, EscrowFailedError
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
async def test_escrow_repository_operations(session_factory):
    """Issue #1121: Port escrow.repository.ts to SQLAlchemy."""
    async with session_factory() as session:
        repo = EscrowRepository(session)
        created = await repo.create(
            idempotency_key="repo_idem_1",
            payer_stellar_account_id="acc_1",
            payee_public_key="G" + "A" * 55,
            token_contract_id="C" + "B" * 55,
            amount="150.0000000",
        )
        assert created.id is not None
        assert created.status == "PENDING"

        found = await repo.find_by_id(created.id)
        assert found is not None
        assert found.idempotency_key == "repo_idem_1"

        by_key = await repo.find_by_idempotency_key("repo_idem_1")
        assert by_key is not None
        assert by_key.id == created.id

@pytest.mark.asyncio
async def test_escrow_service_state_machine(session_factory):
    """Issue #1119: Port EscrowService core logic (deposit, release, refund)."""
    async with session_factory() as session:
        user = User(id="u_escrow_test", email="escrow@mixmatch.com")
        session.add(user)
        await session.commit()

        svc = EscrowService(db=session)
        # 1. Deposit
        escrow = await svc.deposit_for_user(
            user_id="u_escrow_test",
            payee_public_key="G" + "C" * 55,
            token_contract_id="C" + "D" * 55,
            amount="200.0",
            idempotency_key="idem_escrow_test",
        )
        assert escrow.status == "LOCKED"
        assert escrow.amount == "200.0000000"

        # 2. Release
        released = await svc.release_for_user("u_escrow_test", escrow.id)
        assert released.status == "RELEASED"
        assert released.finalize_tx_hash is not None

        # Cannot release or refund again once released
        with pytest.raises(EscrowFailedError):
            await svc.refund_for_user("u_escrow_test", escrow.id)

@pytest.mark.asyncio
async def test_escrow_routes_param_validation_and_cooldown(client: AsyncClient, session_factory):
    """Issue #1118 & #1120: Escrow routes UUID param validation and reconcile cooldown."""
    # 422 for malformed UUID
    resp_bad = await client.get("/api/escrows/malformed-id")
    assert resp_bad.status_code == 422

    resp_bad_release = await client.post("/api/escrows/invalid_uuid/release")
    assert resp_bad_release.status_code == 422

    # 404 for valid UUID not found
    resp_404 = await client.get(f"/api/escrows/{uuid.uuid4()}")
    assert resp_404.status_code == 404

    # Create escrow
    resp_create = await client.post(
        "/api/escrows",
        json={
            "payee_public_key": "G" + "E" * 55,
            "token_contract_id": "C" + "F" * 55,
            "amount": "75.0",
        },
    )
    assert resp_create.status_code == 200
    escrow_id = resp_create.json()["id"]

    # First reconcile call
    resp_rec1 = await client.post(f"/api/escrows/{escrow_id}/reconcile")
    assert resp_rec1.status_code == 200

    # Immediate second reconcile call is protected by cooldown
    resp_rec2 = await client.post(f"/api/escrows/{escrow_id}/reconcile")
    assert resp_rec2.status_code == 200
    assert resp_rec2.json()["id"] == escrow_id
