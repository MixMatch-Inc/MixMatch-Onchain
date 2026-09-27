from typing import Optional, Union
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from src.db.models import StellarAccount

class StellarAccountRepository:
    """Port #1069: SQLAlchemy repository for Stellar accounts, mirroring stellar-account.repository.ts."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def find_by_user_id(self, user_id: str) -> Optional[StellarAccount]:
        stmt = select(StellarAccount).where(StellarAccount.user_id == user_id).limit(1)
        return (await self.db.execute(stmt)).scalar_one_or_none()

    async def find_by_id(self, account_id: str) -> Optional[StellarAccount]:
        stmt = select(StellarAccount).where(StellarAccount.id == account_id).limit(1)
        return (await self.db.execute(stmt)).scalar_one_or_none()

    async def create(
        self,
        user_id: str,
        public_key: str,
        network: str,
        encrypted_secret_key: Optional[str] = None,
        signing_key_id: Optional[str] = None,
    ) -> StellarAccount:
        if (encrypted_secret_key is None) == (signing_key_id is None):
            raise ValueError("Exactly one of encrypted_secret_key or signing_key_id must be provided")
        account = StellarAccount(
            user_id=user_id,
            public_key=public_key,
            network=network,
            encrypted_secret_key=encrypted_secret_key,
            signing_key_id=signing_key_id,
        )
        self.db.add(account)
        await self.db.commit()
        await self.db.refresh(account)
        return account

    async def mark_multisig_configured(self, account_id: str) -> Optional[StellarAccount]:
        stmt = (
            update(StellarAccount)
            .where(StellarAccount.id == account_id)
            .values(multisig_configured=True)
            .returning(StellarAccount)
        )
        row = (await self.db.execute(stmt)).scalar_one_or_none()
        if row is None:
            return None
        await self.db.commit()
        return row