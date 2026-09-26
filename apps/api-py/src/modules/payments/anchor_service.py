import uuid
import logging
from datetime import datetime, timezone
from typing import Optional, List, Tuple
from sqlalchemy import select, and_, desc, func
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.config import settings
from src.db.models import AnchorTransaction, StellarAccount

logger = logging.getLogger("anchor.service")

class AnchorService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_or_create_stellar_account(self, user_id: str) -> StellarAccount:
        stmt = select(StellarAccount).where(StellarAccount.user_id == user_id)
        result = await self.db.execute(stmt)
        account = result.scalar_one_or_none()
        if not account:
            account = StellarAccount(
                user_id=user_id,
                public_key=f"G{uuid.uuid4().hex.upper()[:55]}",
                network=settings.STELLAR_NETWORK,
            )
            self.db.add(account)
            await self.db.commit()
            await self.db.refresh(account)
        return account

    async def deposit_for_user(self, user_id: str, asset_code: str, amount: str) -> AnchorTransaction:
        account = await self.get_or_create_stellar_account(user_id)
        sep24_id = str(uuid.uuid4())
        tx = AnchorTransaction(
            stellar_account_id=account.id,
            kind="deposit",
            asset_code=asset_code,
            home_domain=settings.ANCHOR_HOME_DOMAIN or "testanchor.stellar.org",
            sep24_transaction_id=sep24_id,
            status="pending_user_transfer_start",
            amount_in=amount,
            started_at=datetime.now(timezone.utc),
            interactive_url=f"https://anchor.example.com/sep24/interactive?id={sep24_id}",
        )
        self.db.add(tx)
        await self.db.commit()
        await self.db.refresh(tx)
        return tx

    async def withdraw_for_user(self, user_id: str, asset_code: str, amount: str) -> AnchorTransaction:
        account = await self.get_or_create_stellar_account(user_id)
        sep24_id = str(uuid.uuid4())
        tx = AnchorTransaction(
            stellar_account_id=account.id,
            kind="withdrawal",
            asset_code=asset_code,
            home_domain=settings.ANCHOR_HOME_DOMAIN or "testanchor.stellar.org",
            sep24_transaction_id=sep24_id,
            status="pending_user_transfer_start",
            amount_out=amount,
            started_at=datetime.now(timezone.utc),
            interactive_url=f"https://anchor.example.com/sep24/interactive?id={sep24_id}",
        )
        self.db.add(tx)
        await self.db.commit()
        await self.db.refresh(tx)
        return tx

    async def get_status_for_user(self, user_id: str, transaction_id: str) -> Optional[AnchorTransaction]:
        account = await self.get_or_create_stellar_account(user_id)
        stmt = select(AnchorTransaction).where(
            and_(
                AnchorTransaction.id == transaction_id,
                AnchorTransaction.stellar_account_id == account.id,
            )
        )
        return (await self.db.execute(stmt)).scalar_one_or_none()

    async def list_history_for_user(self, user_id: str, page: int = 1, limit: int = 20) -> Tuple[List[AnchorTransaction], int]:
        account = await self.get_or_create_stellar_account(user_id)
        offset = max(0, (page - 1) * limit)
        count_stmt = select(func.count()).select_from(AnchorTransaction).where(
            AnchorTransaction.stellar_account_id == account.id
        )
        total = (await self.db.execute(count_stmt)).scalar_one() or 0

        stmt = (
            select(AnchorTransaction)
            .where(AnchorTransaction.stellar_account_id == account.id)
            .order_by(desc(AnchorTransaction.created_at))
            .offset(offset)
            .limit(limit)
        )
        res = await self.db.execute(stmt)
        return list(res.scalars().all()), total
