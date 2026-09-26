import asyncio
import logging
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.db.models import Transaction, StellarAccount
from src.modules.payments.normalize import normalize_amount
from src.modules.payments.stellar_client import StellarClient, HorizonError

logger = logging.getLogger("payments.service")

# Metrics counter for Horizon errors
HORIZON_ERROR_METRICS = {
    "find_matching_payment_errors": 0,
    "last_error_timestamp": None,
}

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from src.core.database import AsyncSessionLocal

class PaymentsService:
    def __init__(
        self,
        db: Optional[AsyncSession] = None,
        session_factory: Optional[async_sessionmaker[AsyncSession]] = None,
        stellar_client: Optional[StellarClient] = None,
        concurrency_limit: int = 10,
    ):
        self.db = db
        self.session_factory = session_factory
        self.stellar_client = stellar_client or StellarClient(
            horizon_url=settings.HORIZON_URL,
            network=settings.STELLAR_NETWORK,
        )
        self.semaphore = asyncio.Semaphore(concurrency_limit)


    def normalize_amount(self, amount: str | float) -> str:
        """Port #1102: Exact Decimal-based normalization to 7 decimal places."""
        return normalize_amount(amount)

    async def get_or_create_stellar_account(self, user_id: str) -> StellarAccount:
        stmt = select(StellarAccount).where(StellarAccount.user_id == user_id)
        result = await self.db.execute(stmt)
        account = result.scalar_one_or_none()
        if account:
            return account

        # Generate new stellar account mock / keypair
        mock_public_key = f"G{uuid.uuid4().hex.upper()[:55]}"
        account = StellarAccount(
            user_id=user_id,
            public_key=mock_public_key,
            network=settings.STELLAR_NETWORK,
            encrypted_secret_key="mock_encrypted_secret_key",
        )
        self.db.add(account)
        await self.db.commit()
        await self.db.refresh(account)
        return account

    async def send_payment(
        self,
        user_id: str,
        destination_public_key: str,
        amount: str,
        idempotency_key: Optional[str] = None,
        memo: Optional[str] = None,
        asset_code: Optional[str] = None,
        asset_issuer: Optional[str] = None,
    ) -> Transaction:
        """Port #1103: Core payment submission logic with durable idempotency."""
        account = await self.get_or_create_stellar_account(user_id)
        normalized = self.normalize_amount(amount)
        idem_key = idempotency_key or str(uuid.uuid4())

        # Check existing transaction for durable idempotency
        stmt = select(Transaction).where(Transaction.idempotency_key == idem_key)
        existing = (await self.db.execute(stmt)).scalar_one_or_none()
        if existing:
            return existing

        tx = Transaction(
            idempotency_key=idem_key,
            stellar_account_id=account.id,
            destination_public_key=destination_public_key,
            amount=normalized,
            memo=memo,
            asset_code=asset_code,
            asset_issuer=asset_issuer,
            status="PENDING",
        )
        self.db.add(tx)
        await self.db.commit()
        await self.db.refresh(tx)

        # Submit transaction
        try:
            submit_res = await self.stellar_client.submit_transaction(f"envelope_for_{tx.id}")
            if submit_res.get("successful"):
                tx.status = "SUCCESS"
                tx.stellar_tx_hash = submit_res.get("hash")
            else:
                tx.status = "FAILED"
                tx.failure_code = submit_res.get("error_code", "SUBMIT_FAILED")
                tx.failure_reason = submit_res.get("error_message", "Unknown error")
        except Exception as e:
            logger.warning(f"Payment submission failed for tx {tx.id}: {e}")
            tx.status = "PENDING"  # Remains pending for reconciliation

        await self.db.commit()
        await self.db.refresh(tx)
        return tx

    async def reconcile_transaction(self, transaction: Transaction) -> Transaction:
        """Reconcile single transaction against Horizon."""
        tx_hash = await self.find_matching_payment(transaction)
        if tx_hash:
            transaction.status = "SUCCESS"
            transaction.stellar_tx_hash = tx_hash
        else:
            transaction.retry_count += 1
            # If past max attempts or timeout, mark for review or keep pending
            if transaction.retry_count >= 5:
                transaction.status = "FAILED"
                transaction.failure_code = "RECONCILIATION_EXPIRED"
                transaction.failure_reason = "Max reconciliation attempts reached without on-chain match"

        transaction.last_reconciled_at = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(transaction)
        return transaction

    async def reconcile_pending_transactions(self) -> List[Transaction]:
        """Port #1104: Parallelized reconciliation of pending transactions using asyncio.gather and bounded semaphore."""
        stale_threshold = datetime.now(timezone.utc) - timedelta(milliseconds=settings.RECONCILIATION_STALE_MS)
        stmt = select(Transaction.id).where(
            and_(
                Transaction.status == "PENDING",
                or_(
                    Transaction.last_reconciled_at == None,
                    Transaction.last_reconciled_at <= stale_threshold,
                ),
            )
        )
        if self.db:
            result = await self.db.execute(stmt)
            stale_ids = list(result.scalars().all())
        elif self.session_factory:
            async with self.session_factory() as session:
                result = await session.execute(stmt)
                stale_ids = list(result.scalars().all())
        else:
            return []

        if not stale_ids:
            return []

        async def _reconcile_with_semaphore(tx_id: str) -> Optional[Transaction]:
            async with self.semaphore:
                if self.session_factory:
                    async with self.session_factory() as s:
                        svc = PaymentsService(db=s, stellar_client=self.stellar_client)
                        res = await s.execute(select(Transaction).where(Transaction.id == tx_id))
                        tx = res.scalar_one_or_none()
                        if tx:
                            return await svc.reconcile_transaction(tx)
                        return None
                else:
                    res = await self.db.execute(select(Transaction).where(Transaction.id == tx_id))
                    tx = res.scalar_one_or_none()
                    if tx:
                        return await self.reconcile_transaction(tx)
                    return None

        reconciled = await asyncio.gather(*[_reconcile_with_semaphore(tid) for tid in stale_ids])
        return [r for r in reconciled if r is not None]

    async def find_matching_payment(self, transaction: Transaction) -> Optional[str]:
        """Port #1105: Queries Horizon payments and logs structured errors without silent swallow."""
        expected_amount = self.normalize_amount(transaction.amount)
        try:
            records = await self.stellar_client.get_account_payments(
                transaction.destination_public_key,
                limit=50,
            )
            for record in records:
                if (
                    record.get("to") == transaction.destination_public_key
                    and self.normalize_amount(record.get("amount", "0")) == expected_amount
                    and record.get("asset_code") == transaction.asset_code
                ):
                    return record.get("transaction_hash")
            return None
        except Exception as e:
            # Port #1105 fix: Do not swallow Horizon errors silently!
            HORIZON_ERROR_METRICS["find_matching_payment_errors"] += 1
            HORIZON_ERROR_METRICS["last_error_timestamp"] = datetime.now(timezone.utc).isoformat()
            logger.error(
                "Horizon error querying account payments during reconciliation: "
                "tx_id=%s destination=%s error=%s",
                transaction.id,
                transaction.destination_public_key,
                str(e),
                exc_info=True,
            )
            return None
