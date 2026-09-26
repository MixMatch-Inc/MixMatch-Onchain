import pytest
import json
from decimal import Decimal
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from src.core.database import Base, get_db
from src.core.metrics import reconciliation_metrics
from src.modules.payments.normalize import normalize_amount
from src.modules.payments.validators import parse_history_query, MAX_HISTORY_LIMIT
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
async def test_sse_endpoint_integration_e2e(client: AsyncClient):
    """Issue #1134: Integration test exercising the ported SSE endpoint end-to-end."""
    resp = await client.get("/api/payments/stream")
    assert resp.status_code == 200
    assert "text/event-stream" in resp.headers["content-type"]
    
    # Verify stream body content
    text = resp.text
    assert "event: open" in text
    assert '"version":"1.0"' in text
    assert '"event_type":"connected"' in text

def test_max_history_limit_boundary_100_vs_101():
    """Issue #1135: Boundary test for MAX_HISTORY_LIMIT (100 vs 101)."""
    # Exactly at limit 100 -> stays 100
    page, limit = parse_history_query({"page": "1", "limit": "100"})
    assert limit == 100

    # Over limit 101 -> capped at MAX_HISTORY_LIMIT (100)
    page, limit = parse_history_query({"page": "1", "limit": "101"})
    assert limit == MAX_HISTORY_LIMIT
    assert limit == 100

    # Large values are also safely capped
    page, limit = parse_history_query({"page": "1", "limit": "5000"})
    assert limit == 100

def test_decimal_precision_production_values():
    """Issue #1136: Verify Decimal-based amount handling against production-like values.
    
    In Stellar: 1 XLM = 10,000,000 stroops (7 decimals).
    Standard floating-point in JS/Python degrades with values like:
    1000000000000000.1234567 or repetitive decimal additions (0.1 + 0.2).
    """
    # 1. 1 stroop (smallest on-chain unit)
    one_stroop = "0.0000001"
    assert normalize_amount(one_stroop) == "0.0000001"

    # 2. Maximum Stellar network supply-scale amount with exact 7 decimals
    max_amount = "100000000000.1234567"
    assert normalize_amount(max_amount) == "100000000000.1234567"

    # 3. High-precision rounding (8th digit round half-up)
    assert normalize_amount("10.12345675") == "10.1234568"
    assert normalize_amount("10.12345674") == "10.1234567"

    # 4. Converting to integer stroops without float corruption
    val = Decimal(normalize_amount("10.1234567"))
    stroops = int(val * 10_000_000)
    assert stroops == 101234567

def test_reconciliation_failure_rate_metrics_and_alerts(caplog):
    """Issue #1137: Add metrics/alerting on ported reconciliation failure rate."""
    reconciliation_metrics.reset()
    assert reconciliation_metrics.failure_rate == 0.0
    assert not reconciliation_metrics.alert_triggered

    # Record 4 successes and 0 failures -> rate = 0%
    for _ in range(4):
        reconciliation_metrics.record_success()
    assert reconciliation_metrics.failure_rate == 0.0
    assert not reconciliation_metrics.alert_triggered

    # Record 2 failures -> 2/6 = 33.3% > threshold of 20%
    with caplog.at_level("CRITICAL"):
        reconciliation_metrics.record_failure("tx_fail_1", "HORIZON_TIMEOUT")
        reconciliation_metrics.record_failure("tx_fail_2", "SEQUENCE_CONFLICT")

    assert reconciliation_metrics.failure_rate > 0.20
    assert reconciliation_metrics.alert_triggered
    assert "ALERT: High reconciliation failure rate detected!" in caplog.text
