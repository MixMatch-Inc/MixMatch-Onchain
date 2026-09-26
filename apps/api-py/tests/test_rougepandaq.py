import pytest
import uuid
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from src.core.database import Base, get_db
from src.db.models import User, StellarAccount, Transaction
from src.main import app
from src.modules.payments.schemas import SSETransactionEvent
from src.modules.payments.repository import TransactionRepository

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
async def test_uuid_validation_status_route(client: AsyncClient):
    """Issue #1109: Port PaymentsController routes with typed UUID validation.
    
    Malformed UUIDs must return 422 Unprocessable Entity.
    Valid UUIDs not found must return 404.
    """
    # Malformed ID: not a valid UUID -> must return 422
    resp = await client.get("/api/payments/not-a-valid-uuid/status")
    assert resp.status_code == 422
    data = resp.json()
    assert "detail" in data

    # Malformed ID on reconcile route -> must return 422
    resp_rec = await client.post("/api/payments/invalid_1234/reconcile")
    assert resp_rec.status_code == 422

    # Valid UUID but not existing -> must return 404
    valid_uuid = str(uuid.uuid4())
    resp_404 = await client.get(f"/api/payments/{valid_uuid}/status")
    assert resp_404.status_code == 404

@pytest.mark.asyncio
async def test_transaction_repository_pagination(session_factory):
    """Issue #1108: Port transaction.repository.ts pagination logic to SQLAlchemy."""
    async with session_factory() as session:
        user = User(id="00000000-0000-0000-0000-000000000001", email="paginated@mixmatch.com")
        session.add(user)
        await session.commit()

        acc = StellarAccount(user_id=user.id, public_key="GPAGINATED123", network="testnet")
        session.add(acc)
        await session.commit()

        # Seed 15 transactions
        for i in range(15):
            tx = Transaction(
                idempotency_key=f"page_tx_{i}",
                stellar_account_id=acc.id,
                destination_public_key="GDEST_PAGINATE",
                amount=f"{i + 1}.0000000",
                status="SUCCESS",
            )
            session.add(tx)
        await session.commit()

        repo = TransactionRepository(session)
        # Page 1, limit 10
        page1, total = await repo.list_paginated(acc.id, page=1, limit=10)
        assert total == 15
        assert len(page1) == 10

        # Page 2, limit 10
        page2, total2 = await repo.list_paginated(acc.id, page=2, limit=10)
        assert total2 == 15
        assert len(page2) == 5

@pytest.mark.asyncio
async def test_sse_event_wire_format_and_streaming(client: AsyncClient, session_factory):
    """Issue #1106 & #1107: Port streamTransactionUpdates with sse-starlette and versioned SSE schema."""
    async with session_factory() as session:
        user = User(id="00000000-0000-0000-0000-000000000001", email="sse@mixmatch.com")
        session.add(user)
        await session.commit()

    # Verify SSETransactionEvent Pydantic schema validation
    event = SSETransactionEvent(
        version="1.0",
        event_type="test_event",
    )
    assert event.version == "1.0"
    dumped = event.model_dump()
    assert dumped["version"] == "1.0"
    assert dumped["event_type"] == "test_event"

    # Call SSE stream endpoint
    resp = await client.get("/api/payments/stream")
    assert resp.status_code == 200
    assert "text/event-stream" in resp.headers["content-type"]
    assert "version" in resp.text
