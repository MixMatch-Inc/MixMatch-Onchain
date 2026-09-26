import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from src.core.database import Base
from src.main import app
from src.stellar.sep10 import SEP10WebAuthService
from src.kms.client import VaultKmsClient
from src.modules.users.service import UsersService
from src.db.models import User


@pytest.fixture
async def db_session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with session_factory() as session:
        yield session
    await engine.dispose()


def test_sep10_challenge_and_verification_flow():
    """Issue #1150: Verify SEP-10 challenge build and JWT auth issuance."""
    sep10 = SEP10WebAuthService(jwt_secret="super-secret-key-32-chars-minimum!!")
    server_acc = "GDSERVERACCOUNTTEST12345678901234567890123456789012345678"
    client_acc = "GDCLIENTACCOUNTTEST12345678901234567890123456789012345678"

    challenge = sep10.build_challenge_tx(
        server_account_id=server_acc,
        client_account_id=client_acc,
        home_domain="mixmatch.app"
    )
    assert "transaction" in challenge
    assert challenge["challenge_data"]["client_account"] == client_acc

    # Verify challenge and issue JWT
    token = sep10.verify_challenge_and_issue_token(
        challenge_xdr=challenge["transaction"],
        expected_client=client_acc,
        expected_server=server_acc
    )
    assert isinstance(token, str)
    assert len(token) > 20


def test_kms_signing_and_ts_compatibility():
    """Issue #1151 & #1152: Verify Vault KMS client produces signature compatible with TS transit engine."""
    kms_client = VaultKmsClient(mock_mode=True)
    payload = b"mixmatch:payment:envelope:xdr:hash:test"
    sig = kms_client.sign(key_name="custodial-stellar-key", payload_bytes=payload)
    
    # TS Vault transit format produces 'vault:v<version>:<base64-sig>'
    assert sig.startswith("vault:v")
    assert kms_client.verify(key_name="custodial-stellar-key", payload_bytes=payload, signature=sig) is True


@pytest.mark.asyncio
async def test_users_repository_and_service_crud(db_session):
    """Issue #1153: Verify Users repository and service CRUD operations in SQLAlchemy."""
    svc = UsersService(db_session)
    user = await svc.register_user(
        email="test_musician@mixmatch.app",
        password="securePassword123!",
        display_name="DJ Harmony"
    )
    assert user.id is not None
    assert user.email == "test_musician@mixmatch.app"
    assert svc.verify_password("securePassword123!", user.password_hash) is True

    # Update profile
    updated = await svc.update_user_profile(
        user_id=user.id,
        bio="Electronic producer and sound designer",
        avatar_url="https://mixmatch.app/avatars/dj-harmony.png"
    )
    assert updated.bio == "Electronic producer and sound designer"
    assert updated.avatar_url == "https://mixmatch.app/avatars/dj-harmony.png"

    # Duplicate registration should raise
    with pytest.raises(ValueError, match="already exists"):
        await svc.register_user(
            email="test_musician@mixmatch.app",
            password="otherPassword!",
            display_name="Impostor"
        )
