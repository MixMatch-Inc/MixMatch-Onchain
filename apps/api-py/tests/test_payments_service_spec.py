import pytest
import uuid
from decimal import Decimal
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from src.core.database import Base
from src.db.models import User, StellarAccount, Transaction
from src.modules.payments.service import PaymentsService
from src.modules.payments.stellar_client import StellarClient

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
async def test_payments_service_core_scenarios(session_factory):
    """Issue #1127: Port payments.service.spec.ts scenarios to pytest."""
    async with session_factory() as session:
        user = User(id="u_pay_spec", email="payspec@mixmatch.com")
        session.add(user)
        await session.commit()

        service = PaymentsService(db=session)

        # 1. get_or_create_stellar_account creates account on first call and retrieves on second
        acc1 = await service.get_or_create_stellar_account(user.id)
        assert acc1.user_id == user.id
        assert acc1.public_key.startswith("G")

        acc2 = await service.get_or_create_stellar_account(user.id)
        assert acc2.id == acc1.id
        assert acc2.public_key == acc1.public_key

        # 2. send_payment creates record, normalizes amount, sets SUCCESS status
        dest = "G" + "X" * 55
        tx = await service.send_payment(
            user_id=user.id,
            destination_public_key=dest,
            amount="12.3456",
            memo="Test Memo",
        )
        assert tx.status == "SUCCESS"
        assert tx.amount == "12.3456000"
        assert tx.stellar_tx_hash is not None

        # 3. reconcile_transaction updates status
        reconciled = await service.reconcile_transaction(tx)
        assert reconciled.id == tx.id
        assert reconciled.last_reconciled_at is not None
