import pytest
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from src.core.database import Base
from src.db.models import User, StellarAccount
from src.modules.payments.anchor_service import AnchorService

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

@pytest.mark.asyncio
async def test_anchor_service_spec(session_factory):
    """Issue #1128: Port anchor.service.spec.ts scenarios to pytest."""
    async with session_factory() as session:
        user = User(id="u_anc_spec", email="ancspec@mixmatch.com")
        session.add(user)
        await session.commit()

        svc = AnchorService(db=session)

        # Deposit
        dep = await svc.deposit_for_user(user.id, asset_code="USDC", amount="50.0")
        assert dep.kind == "deposit"
        assert dep.status == "pending_user_transfer_start"
        assert "interactive" in dep.interactive_url

        # Withdraw
        wth = await svc.withdraw_for_user(user.id, asset_code="USDC", amount="25.0")
        assert wth.kind == "withdrawal"
        assert wth.amount_out == "25.0"

        # Status check
        fetched = await svc.get_status_for_user(user.id, dep.id)
        assert fetched is not None
        assert fetched.id == dep.id

        # List history
        history, total = await svc.list_history_for_user(user.id)
        assert total == 2
        assert len(history) == 2
