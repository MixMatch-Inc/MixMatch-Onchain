from datetime import datetime, timezone
import pytest
import uuid
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from src.core.database import Base, get_db
from src.core.config import Settings
from src.db.models import User, StellarAccount, AnchorTransaction
from src.modules.payments.anchor_service import AnchorService, CircuitBreakerOpenError, CIRCUIT_BREAKER
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

def test_settings_enforce_anchor_home_domain_in_public():
    """Issue #1117: Enforce ANCHOR_HOME_DOMAIN as required for public network with no testnet fallback."""
    # Allowed in testnet without anchor domain
    s_testnet = Settings(STELLAR_NETWORK="testnet", ANCHOR_HOME_DOMAIN=None)
    assert s_testnet.STELLAR_NETWORK == "testnet"

    # Strictly raises in public network if anchor domain is missing
    with pytest.raises(ValueError, match="ANCHOR_HOME_DOMAIN is strictly required"):
        Settings(STELLAR_NETWORK="public", ANCHOR_HOME_DOMAIN=None)

    # Allowed in public when anchor domain is specified
    s_public = Settings(STELLAR_NETWORK="public", ANCHOR_HOME_DOMAIN="anchor.mixmatch.org")
    assert s_public.ANCHOR_HOME_DOMAIN == "anchor.mixmatch.org"

@pytest.mark.asyncio
async def test_anchor_refresh_logging_and_circuit_breaker(session_factory, caplog):
    """Issue #1115 & #1116: Logging on refresh failure, exponential backoff, and circuit breaker."""
    async with session_factory() as session:
        domain = f"fail_anchor_{uuid.uuid4().hex[:6]}.com"
        tx = AnchorTransaction(
            id=str(uuid.uuid4()),
            stellar_account_id="acc_cb_test",
            kind="deposit",
            asset_code="USDC",
            home_domain=domain,
            sep24_transaction_id="sep_cb_1",
            status="pending_user_transfer_start",
            amount_in="100.0", started_at=datetime.now(timezone.utc),
        )
        session.add(tx)
        await session.commit()

        svc = AnchorService(db=session)

        # Trigger refresh with failure simulation
        with caplog.at_level("ERROR"):
            res = await svc.refresh_from_anchor(tx, max_retries=3, initial_backoff=0.01)
        
        assert res is None
        # Verify logging context
        assert "Anchor refresh failed: tx_id=" in caplog.text
        assert domain in caplog.text
        assert "503 Service Unavailable" in caplog.text

        # Verify circuit breaker opened
        assert CIRCUIT_BREAKER[domain]["state"] == "OPEN"

        # Subsequent call raises CircuitBreakerOpenError
        with pytest.raises(CircuitBreakerOpenError):
            await svc.refresh_from_anchor(tx)

@pytest.mark.asyncio
async def test_list_history_async_background(client: AsyncClient, session_factory):
    """Issue #1114: listHistoryForUser serves cached state immediately without blocking on refresh."""
    async with session_factory() as session:
        user = User(id="00000000-0000-0000-0000-000000000001", email="smubarak@mixmatch.com")
        session.add(user)
        await session.commit()

        acc = StellarAccount(user_id=user.id, public_key="GSMUBARAK123", network="testnet")
        session.add(acc)
        await session.commit()

        tx = AnchorTransaction(
            stellar_account_id=acc.id,
            kind="deposit",
            asset_code="XLM",
            home_domain="testanchor.stellar.org",
            sep24_transaction_id="sep_quick_1",
            status="completed",
            amount_in="200.0", started_at=datetime.now(timezone.utc),
        )
        session.add(tx)
        await session.commit()

    resp = await client.get("/api/anchor/history")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert data["transactions"][0]["sep24_transaction_id"] == "sep_quick_1"
