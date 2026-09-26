import pytest
import asyncio
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from src.core.database import Base
from src.db.models import User, StellarAccount, Transaction
from src.modules.payments.normalize import normalize_amount
from src.modules.payments.service import PaymentsService, HORIZON_ERROR_METRICS
from src.modules.payments.stellar_client import StellarClient, HorizonError

@pytest.fixture
async def db_engine():
    test_engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield test_engine
    await test_engine.dispose()

@pytest.fixture
def session_factory(db_engine):
    return async_sessionmaker(db_engine, expire_on_commit=False, class_=AsyncSession)

@pytest.fixture
async def db_session(session_factory):
    async with session_factory() as session:
        yield session


def test_normalize_amount_precision_bug_fixed():
    """Issue #1102: Port normalizeAmount with Decimal, fixing floating-point precision loss."""
    # Standard values
    assert normalize_amount("10.5") == "10.5000000"
    assert normalize_amount("0.0000001") == "0.0000001"
    
    # Regression test for JavaScript Number(amount).toFixed(7) precision bug:
    # In JS: Number("1000000000000000.1234567").toFixed(7) results in '1000000000000000.1250000'
    # due to IEEE 754 64-bit float mantissa limitation!
    large_val = "1000000000000000.1234567"
    normalized = normalize_amount(large_val)
    assert normalized == "1000000000000000.1234567"

    # Decimal input
    assert normalize_amount(Decimal("5.12345678")) == "5.1234568"

@pytest.mark.asyncio
async def test_send_payment_core_and_idempotency(db_session: AsyncSession):
    """Issue #1103: Core payment submission logic with durable idempotency."""
    # Create test user
    user = User(email="test@mixmatch.com")
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    service = PaymentsService(db=db_session)
    
    # Send payment
    tx1 = await service.send_payment(
        user_id=user.id,
        destination_public_key="GDESTINATION1234567890",
        amount="25.5",
        idempotency_key="unique_key_001",
        memo="First payment",
    )
    assert tx1.id is not None
    assert tx1.amount == "25.5000000"
    assert tx1.status == "SUCCESS"
    assert tx1.idempotency_key == "unique_key_001"

    # Duplicate call with same idempotency key returns existing row without resubmitting
    tx2 = await service.send_payment(
        user_id=user.id,
        destination_public_key="GDESTINATION1234567890",
        amount="25.5",
        idempotency_key="unique_key_001",
    )
    assert tx2.id == tx1.id
    assert tx2.stellar_tx_hash == tx1.stellar_tx_hash

@pytest.mark.asyncio
async def test_reconcile_pending_transactions_parallel(db_session: AsyncSession, session_factory):
    """Issue #1104: Parallel reconciliation with bounded semaphore."""
    user = User(email="reconcile@mixmatch.com")
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    account = StellarAccount(user_id=user.id, public_key="GACCOUNT123", network="testnet")
    db_session.add(account)
    await db_session.commit()
    await db_session.refresh(account)

    # Seed 5 pending stale transactions
    tx_ids = []
    stale_time = datetime.now(timezone.utc) - timedelta(minutes=10)
    for i in range(5):
        t = Transaction(
            idempotency_key=f"stale_tx_{i}",
            stellar_account_id=account.id,
            destination_public_key=f"GDEST_{i}",
            amount="10.0000000",
            status="PENDING",
            last_reconciled_at=stale_time,
        )
        db_session.add(t)
        await db_session.commit()
        await db_session.refresh(t)
        tx_ids.append(t.id)

    service = PaymentsService(session_factory=session_factory, concurrency_limit=2)
    reconciled = await service.reconcile_pending_transactions()
    
    assert len(reconciled) == 5
    for r in reconciled:
        assert r.retry_count >= 1
        assert r.last_reconciled_at is not None

@pytest.mark.asyncio
async def test_find_matching_payment_logs_horizon_errors(db_session: AsyncSession, caplog):
    """Issue #1105: findMatchingPayment logs Horizon errors and records metrics instead of silent swallow."""
    class FailingStellarClient(StellarClient):
        async def get_account_payments(self, account_public_key: str, limit: int = 10):
            raise HorizonError("504 Gateway Timeout connecting to Horizon")

    service = PaymentsService(db=db_session, stellar_client=FailingStellarClient())
    
    dummy_tx = Transaction(
        id="dummy_tx_123",
        idempotency_key="dummy_key",
        stellar_account_id="acc_1",
        destination_public_key="GDEST_FAIL",
        amount="10.0000000",
        status="PENDING",
    )
    
    initial_errors = HORIZON_ERROR_METRICS["find_matching_payment_errors"]
    with caplog.at_level("ERROR"):
        res = await service.find_matching_payment(dummy_tx)
    
    assert res is None
    assert HORIZON_ERROR_METRICS["find_matching_payment_errors"] == initial_errors + 1
    assert "Horizon error querying account payments during reconciliation" in caplog.text
    assert "504 Gateway Timeout connecting to Horizon" in caplog.text
