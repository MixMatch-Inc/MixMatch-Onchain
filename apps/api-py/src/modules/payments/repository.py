from typing import List, Tuple, Optional
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from src.db.models import Transaction

class TransactionRepository:
    """Port #1108: SQLAlchemy repository for transactions with optimized pagination."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def count_by_account(self, stellar_account_id: str) -> int:
        """Count total transactions for an account."""
        stmt = (
            select(func.count())
            .select_from(Transaction)
            .where(Transaction.stellar_account_id == stellar_account_id)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one() or 0

    async def list_paginated(
        self,
        stellar_account_id: str,
        page: int = 1,
        limit: int = 20,
    ) -> Tuple[List[Transaction], int]:
        """Fetch a paginated slice of transactions ordered by created_at DESC."""
        offset = max(0, (page - 1) * limit)
        
        # Total count
        total = await self.count_by_account(stellar_account_id)

        # Query using the composite index (stellar_account_id, created_at DESC)
        stmt = (
            select(Transaction)
            .where(Transaction.stellar_account_id == stellar_account_id)
            .order_by(desc(Transaction.created_at))
            .offset(offset)
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        transactions = list(result.scalars().all())
        return transactions, total

    async def find_by_id(self, transaction_id: str) -> Optional[Transaction]:
        stmt = select(Transaction).where(Transaction.id == transaction_id)
        return (await self.db.execute(stmt)).scalar_one_or_none()
