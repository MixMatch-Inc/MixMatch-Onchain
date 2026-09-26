import pytest
import time
import jwt
from typing import AsyncGenerator, Callable
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from src.core.database import Base, get_db
from src.core.config import settings
from src.main import app

@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"

@pytest.fixture
async def shared_db_engine():
    """Isolated in-memory SQLite database per test."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()

@pytest.fixture
async def shared_db_session(shared_db_engine) -> AsyncGenerator[AsyncSession, None]:
    """Async DB session with transaction rollback per test."""
    session_factory = async_sessionmaker(shared_db_engine, expire_on_commit=False, class_=AsyncSession)
    async with session_factory() as session:
        yield session

@pytest.fixture
async def test_api_client(shared_db_session) -> AsyncGenerator[AsyncClient, None]:
    """FastAPI TestClient with get_db dependency override."""
    async def override_get_db():
        yield shared_db_session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
    app.dependency_overrides.pop(get_db, None)

@pytest.fixture
def auth_token_factory() -> Callable[[str, str, int], str]:
    """Helper to mint valid test JWT tokens with customizable user id and role."""
    def _create_token(user_id: str = "test-user-uuid", role: str = "USER", exp_seconds: int = 3600) -> str:
        payload = {
            "sub": user_id,
            "role": role,
            "iat": int(time.time()),
            "exp": int(time.time()) + exp_seconds
        }
        return jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")
    return _create_token
