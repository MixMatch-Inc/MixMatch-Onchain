import pytest
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from src.core.database import Base
from src.db.models import User
from src.modules.payments.escrow_service import EscrowService, EscrowFailedError

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
async def test_escrow_service_spec(session_factory):
    """Issue #1129: Port escrow.service.spec.ts scenarios to pytest."""
    async with session_factory() as session:
        user = User(id="u_esc_spec", email="escspec@mixmatch.com")
        session.add(user)
        await session.commit()

        svc = EscrowService(db=session)

        # 1. Deposit
        payee = "G" + "P" * 55
        token = "C" + "T" * 55
        escrow = await svc.deposit_for_user(
            user_id=user.id,
            payee_public_key=payee,
            token_contract_id=token,
            amount="100.0",
        )
        assert escrow.status == "LOCKED"
        assert escrow.amount == "100.0000000"

        # 2. Refund
        refunded = await svc.refund_for_user(user.id, escrow.id)
        assert refunded.status == "REFUNDED"

        # 3. Cannot release already refunded escrow
        with pytest.raises(EscrowFailedError):
            await svc.release_for_user(user.id, escrow.id)
