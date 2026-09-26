import pytest
import uuid
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from src.core.database import Base, get_db
from src.db.models import User, StellarAccount, Transaction
from src.modules.payments.errors import (
    PaymentFailedError,
    AnchorError,
    EscrowFailedError,
    WalletResolutionError,
)
from src.modules.payments.wallet_resolver import WalletResolver
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
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c

def test_domain_errors_and_status_codes():
    """Issue #1125: Port payment-errors.ts domain error types to Python exception classes."""
    err_pay = PaymentFailedError("Insufficient balance", kind="insufficient_balance", status_code=422)
    assert err_pay.code == "INSUFFICIENT_BALANCE"
    assert err_pay.status_code == 422

    err_anc = AnchorError("Anchor gateway error", status_code=502)
    assert err_anc.code == "ANCHOR_ERROR"
    assert err_anc.status_code == 502

    err_esc = EscrowFailedError("Escrow contract timeout", status_code=422)
    assert err_esc.code == "ESCROW_FAILED"
    assert err_esc.status_code == 422

    err_wal = WalletResolutionError("Key corrupted", status_code=422)
    assert err_wal.code == "WALLET_RESOLUTION_ERROR"
    assert err_wal.status_code == 422

@pytest.mark.asyncio
async def test_wallet_resolver_success_and_malformed_key(session_factory):
    """Issue #1124: Port wallet-resolver.ts and ensure malformed key raises controlled WalletResolutionError."""
    resolver = WalletResolver()
    
    # 1. Round-trip encrypt & decrypt
    secret_key = "SCMOCKSECRETKEY1234567890"
    encrypted = resolver.encrypt_secret_key(secret_key)
    decrypted = resolver.decrypt_secret_key(encrypted)
    assert decrypted == secret_key

    # 2. Account resolution with valid encrypted key
    account = StellarAccount(
        id="acc_valid_wal",
        user_id="u_wal",
        public_key="GVALID123",
        encrypted_secret_key=encrypted,
    )
    wallet = await resolver.resolve_wallet(account)
    assert wallet.public_key == "GVALID123"
    assert wallet.secret_key == secret_key
    assert not wallet.is_vault

    # 3. Controlled error path on malformed encrypted payload (doesn't raise unhandled 500)
    bad_account = StellarAccount(
        id="acc_bad_wal",
        user_id="u_wal",
        public_key="GBAD123",
        encrypted_secret_key="malformed_not_base64_or_too_short",
    )
    with pytest.raises(WalletResolutionError) as exc_info:
        await resolver.resolve_wallet(bad_account)
    assert exc_info.value.code == "MALFORMED_ENCRYPTED_KEY"
    assert exc_info.value.status_code == 422

@pytest.mark.asyncio
async def test_reconciliation_job_terminal_failure_policy(session_factory):
    """Issue #1122 & #1123: Reconciliation job execution and terminal FAILED state after max retries."""
    async with session_factory() as session:
        user = User(id="u_inteee", email="inteee@mixmatch.com")
        session.add(user)
        await session.commit()

        acc = StellarAccount(user_id=user.id, public_key="GINTEEE123")
        session.add(acc)
        await session.commit()

        # Seed transaction with retry_count = 4 (approaching max of 5)
        tx = Transaction(
            id=str(uuid.uuid4()),
            idempotency_key="tx_stuck_forever",
            stellar_account_id=acc.id,
            destination_public_key="GDEST_NOWHERE",
            amount="100.0000000",
            status="PENDING",
            retry_count=4,
        )
        session.add(tx)
        await session.commit()
        tx_id = tx.id

    job = ReconciliationJob(session_factory=session_factory, poll_interval_seconds=60)
    # Execute single reconciliation cycle
    processed = await job.run_once()
    assert processed >= 1

    # Check that transaction transitioned to terminal FAILED state
    async with session_factory() as session:
        from sqlalchemy import select
        res = await session.execute(select(Transaction).where(Transaction.id == tx_id))
        stuck_tx = res.scalar_one()
        assert stuck_tx.status == "FAILED"
        assert stuck_tx.failure_code == "RECONCILIATION_EXPIRED"
        assert stuck_tx.retry_count >= 5
