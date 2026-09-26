import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.db.models import Escrow, StellarAccount
from src.modules.payments.normalize import normalize_amount
from src.modules.payments.escrow_repository import EscrowRepository

logger = logging.getLogger("escrow.service")

class EscrowFailedError(Exception):
    pass

class EscrowService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = EscrowRepository(db)
        self.cooldown_seconds = 15
        self.reconcile_cache: dict[str, datetime] = {}

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

    async def deposit_for_user(
        self,
        user_id: str,
        payee_public_key: str,
        token_contract_id: str,
        amount: str,
        idempotency_key: Optional[str] = None,
        timeout_ledger: Optional[int] = None,
    ) -> Escrow:
        """Port #1119: Deposit funds into escrow with durable idempotency."""
        account = await self.get_or_create_stellar_account(user_id)
        norm_amount = normalize_amount(amount)
        idem_key = idempotency_key or str(uuid.uuid4())

        # Durable idempotency check
        existing = await self.repo.find_by_idempotency_key(idem_key)
        if existing:
            return existing

        escrow = await self.repo.create(
            idempotency_key=idem_key,
            payer_stellar_account_id=account.id,
            payee_public_key=payee_public_key,
            token_contract_id=token_contract_id,
            amount=norm_amount,
            timeout_ledger=timeout_ledger,
        )

        # Transition to LOCKED (simulating contract deposit invocation)
        escrow.status = "LOCKED"
        escrow.on_chain_escrow_id = str(uuid.uuid4().int)[:18]
        escrow.deposit_tx_hash = f"tx_escrow_deposit_{uuid.uuid4().hex[:16]}"
        await self.db.commit()
        await self.db.refresh(escrow)
        return escrow

    async def release_for_user(self, user_id: str, escrow_id: str) -> Escrow:
        """Port #1119: Release locked funds to payee."""
        escrow = await self.get_escrow_for_user(user_id, escrow_id)
        if not escrow:
            raise EscrowFailedError("Escrow not found or unauthorized")
        if escrow.status != "LOCKED":
            raise EscrowFailedError(f"Cannot release escrow in status {escrow.status}")

        escrow.status = "RELEASED"
        escrow.finalize_tx_hash = f"tx_escrow_release_{uuid.uuid4().hex[:16]}"
        await self.db.commit()
        await self.db.refresh(escrow)
        return escrow

    async def refund_for_user(self, user_id: str, escrow_id: str) -> Escrow:
        """Port #1119: Refund locked funds back to payer (dispute or timeout)."""
        escrow = await self.get_escrow_for_user(user_id, escrow_id)
        if not escrow:
            raise EscrowFailedError("Escrow not found or unauthorized")
        if escrow.status != "LOCKED":
            raise EscrowFailedError(f"Cannot refund escrow in status {escrow.status}")

        escrow.status = "REFUNDED"
        escrow.finalize_tx_hash = f"tx_escrow_refund_{uuid.uuid4().hex[:16]}"
        await self.db.commit()
        await self.db.refresh(escrow)
        return escrow

    async def get_escrow_for_user(self, user_id: str, escrow_id: str) -> Optional[Escrow]:
        account = await self.get_or_create_stellar_account(user_id)
        stmt = select(Escrow).where(
            and_(
                Escrow.id == escrow_id,
                Escrow.payer_stellar_account_id == account.id,
            )
        )
        return (await self.db.execute(stmt)).scalar_one_or_none()

    async def reconcile_for_user(self, user_id: str, escrow_id: str) -> Escrow:
        """Port #1120: Escrow reconciliation with idempotency cooldown protection."""
        escrow = await self.get_escrow_for_user(user_id, escrow_id)
        if not escrow:
            raise EscrowFailedError("Escrow not found or unauthorized")

        now = datetime.now(timezone.utc)
        last_rec = self.reconcile_cache.get(escrow_id)
        if last_rec and (now - last_rec) < timedelta(seconds=self.cooldown_seconds):
            logger.info("Escrow reconcile: cooldown active for %s, skipping query", escrow_id)
            return escrow

        self.reconcile_cache[escrow_id] = now
        # Reconcile on-chain state if still pending
        if escrow.status == "PENDING":
            escrow.status = "LOCKED"
            escrow.deposit_tx_hash = f"reconciled_deposit_{uuid.uuid4().hex[:16]}"
            await self.db.commit()
            await self.db.refresh(escrow)

        return escrow
