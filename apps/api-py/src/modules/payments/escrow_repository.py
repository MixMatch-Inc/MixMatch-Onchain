import uuid
from typing import Optional, List
from sqlalchemy import select, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession
from src.db.models import Escrow

class EscrowRepository:
    """Port #1121: SQLAlchemy repository for Soroban escrow state."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(
        self,
        idempotency_key: str,
        payer_stellar_account_id: str,
        payee_public_key: str,
        token_contract_id: str,
        amount: str,
        timeout_ledger: Optional[int] = None,
    ) -> Escrow:
        escrow = Escrow(
            idempotency_key=idempotency_key,
            payer_stellar_account_id=payer_stellar_account_id,
            payee_public_key=payee_public_key,
            token_contract_id=token_contract_id,
            amount=amount,
            timeout_ledger=timeout_ledger,
            status="PENDING",
        )
        self.db.add(escrow)
        await self.db.commit()
        await self.db.refresh(escrow)
        return escrow

    async def find_by_id(self, escrow_id: str) -> Optional[Escrow]:
        stmt = select(Escrow).where(Escrow.id == escrow_id)
        return (await self.db.execute(stmt)).scalar_one_or_none()

    async def find_by_idempotency_key(self, idempotency_key: str) -> Optional[Escrow]:
        stmt = select(Escrow).where(Escrow.idempotency_key == idempotency_key)
        return (await self.db.execute(stmt)).scalar_one_or_none()

    async def list_by_account(self, payer_account_id: str, limit: int = 50) -> List[Escrow]:
        stmt = (
            select(Escrow)
            .where(Escrow.payer_stellar_account_id == payer_account_id)
            .order_by(desc(Escrow.created_at))
            .limit(limit)
        )
        res = await self.db.execute(stmt)
        return list(res.scalars().all())
