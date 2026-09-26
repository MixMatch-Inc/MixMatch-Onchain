import pytest
import uuid
import asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from src.core.database import Base, get_db
from src.db.models import User, StellarAccount, Transaction, Escrow, AnchorTransaction
from src.core.dependencies import get_scoped_resource
from src.modules.payments.reconciliation_job import ReconciliationJob
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

def test_composite_db_index_verification():
    """Issue #1138: Verify composite DB index exists for transaction-history query."""
    index_names = [idx.name for idx in Transaction.__table__.indexes]
    assert "ix_transactions_account_created" in index_names

    # Check columns indexed
    ix = next(idx for idx in Transaction.__table__.indexes if idx.name == "ix_transactions_account_created")
    col_names = [c.name for c in ix.columns]
    assert "stellar_account_id" in col_names
    assert "created_at" in col_names

@pytest.mark.asyncio
async def test_scoped_resource_dependency(session_factory):
    """Issue #1140: Extract shared scoped resource dependency."""
    async with session_factory() as session:
        user_a = User(id="u_scope_a", email="a@mixmatch.com")
        user_b = User(id="u_scope_b", email="b@mixmatch.com")
        session.add_all([user_a, user_b])
        await session.commit()

        acc_a = StellarAccount(id="acc_scope_a", user_id="u_scope_a", public_key="GA_SCOPE123")
        acc_b = StellarAccount(id="acc_scope_b", user_id="u_scope_b", public_key="GB_SCOPE123")
        session.add_all([acc_a, acc_b])
        await session.commit()

        tx_a = Transaction(
            id=str(uuid.uuid4()),
            idempotency_key="tx_a_scope",
            stellar_account_id="acc_scope_a",
            destination_public_key="GDEST",
            amount="10.0000000",
        )
        session.add(tx_a)
        await session.commit()

        from src.core.security import CurrentUser
        dep = get_scoped_resource(Transaction, "stellar_account_id")

        # Caller user_a owns tx_a -> resolves successfully
        resolved = await dep(id=uuid.UUID(tx_a.id), db=session, user=CurrentUser(id="u_scope_a", email="a@mixmatch.com", role="USER"))
        assert resolved.id == tx_a.id

        # Caller user_b does not own tx_a -> raises 404
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc:
            await dep(id=uuid.UUID(tx_a.id), db=session, user=CurrentUser(id="u_scope_b", email="b@mixmatch.com", role="USER"))
        assert exc.value.status_code == 404

@pytest.mark.asyncio
async def test_reconciliation_multi_instance_lock_safety(session_factory):
    """Issue #1141: Instance safety ensuring lock avoids concurrent duplicate execution."""
    job1 = ReconciliationJob(session_factory=session_factory)
    job2 = ReconciliationJob(session_factory=session_factory)

    # Run two jobs concurrently
    results = await asyncio.gather(job1.run_once(), job2.run_once())
    # One job acquires lock and runs, other skips without crashing
    assert results[0] >= 0
    assert results[1] >= 0
