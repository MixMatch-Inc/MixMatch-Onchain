import pytest
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from src.core.database import Base
from src.modules.users.repository import UsersRepository
from src.modules.users.service import UsersService

@pytest.fixture
async def users_db_session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with session_factory() as session:
        yield session
    await engine.dispose()

@pytest.mark.asyncio
async def test_users_repository_crud_and_edge_cases(users_db_session):
    """Issue #1154: Unit tests for Users repository CRUD and edge cases."""
    repo = UsersRepository(users_db_session)

    # 1. Create User
    user = await repo.create_user(
        email="producer@mixmatch.app",
        password_hash="fake_hash_123",
        display_name="Producer Alice"
    )
    assert user.id is not None
    assert user.email == "producer@mixmatch.app"
    assert user.display_name == "Producer Alice"

    # 2. Get by email & ID
    by_email = await repo.get_by_email("producer@mixmatch.app")
    assert by_email is not None
    assert by_email.id == user.id

    by_id = await repo.get_by_id(user.id)
    assert by_id is not None
    assert by_id.email == "producer@mixmatch.app"

    # 3. Not found edge cases
    not_found = await repo.get_by_email("nonexistent@mixmatch.app")
    assert not_found is None
    not_found_id = await repo.get_by_id("nonexistent-id")
    assert not_found_id is None

    # 4. Update profile
    updated = await repo.update_profile(
        user_id=user.id,
        display_name="Producer Alice (Live)",
        bio="Analog synth enthusiast",
        avatar_url="https://mixmatch.app/avatar.jpg"
    )
    assert updated.display_name == "Producer Alice (Live)"
    assert updated.bio == "Analog synth enthusiast"

    # 5. Delete User
    deleted = await repo.delete_user(user.id)
    assert deleted is True
    assert await repo.get_by_id(user.id) is None
    assert await repo.delete_user("nonexistent-id") is False

@pytest.mark.asyncio
async def test_users_service_business_logic(users_db_session):
    """Issue #1154: Unit tests for Users service business rules, password hashing, and duplicates."""
    svc = UsersService(users_db_session)

    # Register
    user = await svc.register_user(
        email="beatmaker@mixmatch.app",
        password="ValidPassword!123",
        display_name="BeatMaker Bob"
    )
    assert user.id is not None
    assert svc.verify_password("ValidPassword!123", user.password_hash) is True
    assert svc.verify_password("WrongPassword!", user.password_hash) is False

    # Duplicate email prevention
    with pytest.raises(ValueError, match="already exists"):
        await svc.register_user(
            email="beatmaker@mixmatch.app",
            password="AnotherPassword!123",
            display_name="Clone"
        )
