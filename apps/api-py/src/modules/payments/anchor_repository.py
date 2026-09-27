from typing import Optional, List, Dict
from datetime import datetime
from sqlalchemy import select, update, desc, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from src.db.models import AnchorTransaction

class AnchorTransactionRepository:
    """Port #1072: SQLAlchemy repository for SEP-24 anchor transactions, mirroring anchor-transaction.repository.ts."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def find_by_id(self, transaction_id: str) -> Optional[AnchorTransaction]:
        stmt = select(AnchorTransaction).where(AnchorTransaction.id == transaction_id).limit(1)
        return (await self.db.execute(stmt)).scalar_one_or_none()

    async def create(
        self,
        stellar_account_id: str,
        kind: str,
        asset_code: str,
        home_domain: str,
        sep24_transaction_id: str,
        status: str,
        interactive_url: Optional[str] = None,
        more_info_url: Optional[str] = None,
        amount_in: Optional[str] = None,
        amount_out: Optional[str] = None,
        stellar_transaction_id: Optional[str] = None,
        external_transaction_id: Optional[str] = None,
        message: Optional[str] = None,
        started_at: Optional[datetime] = None,
        completed_at: Optional[datetime] = None,
    ) -> AnchorTransaction:
        tx = AnchorTransaction(
            stellar_account_id=stellar_account_id,
            kind=kind,
            asset_code=asset_code,
            home_domain=home_domain,
            sep24_transaction_id=sep24_transaction_id,
            status=status,
            interactive_url=interactive_url,
            more_info_url=more_info_url,
            amount_in=amount_in,
            amount_out=amount_out,
            stellar_transaction_id=stellar_transaction_id,
            external_transaction_id=external_transaction_id,
            message=message,
            started_at=started_at or datetime.utcnow(),
            completed_at=completed_at,
        )
        self.db.add(tx)
        await self.db.commit()
        await self.db.refresh(tx)
        return tx

    async def update_from_anchor(self, transaction_id: str, fields: Dict) -> Optional[AnchorTransaction]:
        values = {k: v for k, v in fields.items() if v is not None}
        if "status" in fields:
            values["status"] = fields["status"]
        if not values:
            return await self.find_by_id(transaction_id)
        stmt = (
            update(AnchorTransaction)
            .where(AnchorTransaction.id == transaction_id)
            .values(**values)
            .returning(AnchorTransaction)
        )
        row = (await self.db.execute(stmt)).scalar_one_or_none()
        if row is None:
            return None
        await self.db.commit()
        return row

    async def list_by_stellar_account_id(
        self, stellar_account_id: str, page: int, limit: int
    ) -> Dict:
        offset = (page - 1) * limit
        tx_stmt = (
            select(AnchorTransaction)
            .where(AnchorTransaction.stellar_account_id == stellar_account_id)
            .order_by(desc(AnchorTransaction.created_at))
            .limit(limit)
            .offset(offset)
        )
        count_stmt = (
            select(func.count())
            .select_from(AnchorTransaction)
            .where(AnchorTransaction.stellar_account_id == stellar_account_id)
        )
        rows, total = (await self.db.execute(tx_stmt)).scalars().all(), \
            (await self.db.execute(count_stmt)).scalar_one()
        return {"transactions": rows, "total": total}

    async def find_in_progress_by_stellar_account_id(
        self, stellar_account_id: str, in_progress_statuses: List[str]
    ) -> List[AnchorTransaction]:
        stmt = (
            select(AnchorTransaction)
            .where(
                and_(
                    AnchorTransaction.stellar_account_id == stellar_account_id,
                    AnchorTransaction.status.in_(in_progress_statuses),
                )
            )
        )
        return (await self.db.execute(stmt)).scalars().all()