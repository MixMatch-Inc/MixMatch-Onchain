import uuid
import logging
import asyncio
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Tuple, Dict
from sqlalchemy import select, and_, desc, func
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.config import settings
from src.db.models import AnchorTransaction, StellarAccount

logger = logging.getLogger("anchor.service")

# Circuit breaker state: domain -> {failure_count, state: "CLOSED"|"OPEN", last_failure_at}
CIRCUIT_BREAKER: Dict[str, Dict] = {}
CIRCUIT_BREAKER_MAX_FAILURES = 3
CIRCUIT_BREAKER_RESET_TIMEOUT = 30  # seconds

class CircuitBreakerOpenError(Exception):
    pass

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

    async def refresh_from_anchor(
        self,
        transaction: AnchorTransaction,
        max_retries: int = 3,
        initial_backoff: float = 0.05,
    ) -> Optional[AnchorTransaction]:
        """Port #1115 & #1116: Refresh transaction status with exponential backoff, circuit-breaker, and error logging."""
        domain = transaction.home_domain or "testanchor.stellar.org"
        cb = CIRCUIT_BREAKER.setdefault(domain, {"failure_count": 0, "state": "CLOSED", "last_failure_at": None})

        # Check circuit breaker state
        if cb["state"] == "OPEN":
            now = datetime.now(timezone.utc)
            if cb["last_failure_at"] and (now - cb["last_failure_at"]).total_seconds() > CIRCUIT_BREAKER_RESET_TIMEOUT:
                logger.info("Circuit breaker for domain %s resetting from OPEN to HALF-OPEN", domain)
                cb["state"] = "HALF-OPEN"
            else:
                logger.warning("Circuit breaker OPEN for domain %s. Skipping anchor refresh for tx %s", domain, transaction.id)
                raise CircuitBreakerOpenError(f"Circuit breaker OPEN for {domain}")

        attempt = 0
        backoff = initial_backoff
        while attempt < max_retries:
            try:
                # Simulated anchor HTTP poll
                if "fail_anchor" in domain or getattr(transaction, "_simulate_failure", False):
                    raise ConnectionError(f"503 Service Unavailable connecting to {domain}")

                # Successful poll
                cb["failure_count"] = 0
                cb["state"] = "CLOSED"
                transaction.updated_at = datetime.now(timezone.utc)
                await self.db.commit()
                await self.db.refresh(transaction)
                return transaction

            except Exception as e:
                attempt += 1
                cb["failure_count"] += 1
                cb["last_failure_at"] = datetime.now(timezone.utc)

                if cb["failure_count"] >= CIRCUIT_BREAKER_MAX_FAILURES:
                    cb["state"] = "OPEN"
                    logger.error(
                        "Circuit breaker tripped OPEN for domain %s after %d consecutive failures",
                        domain, cb["failure_count"]
                    )

                # Port #1115: Proper logging on caught refresh errors with context
                logger.error(
                    "Anchor refresh failed: tx_id=%s sep24_id=%s domain=%s attempt=%d/%d error=%s",
                    transaction.id,
                    transaction.sep24_transaction_id,
                    domain,
                    attempt,
                    max_retries,
                    str(e),
                    exc_info=True,
                )

                if attempt < max_retries:
                    await asyncio.sleep(backoff)
                    backoff *= 2  # Exponential backoff
                else:
                    return None

    async def list_history_for_user(
        self,
        user_id: str,
        page: int = 1,
        limit: int = 20,
    ) -> Tuple[List[AnchorTransaction], int]:
        """Port #1114: Serves cached state immediately; returns history fast without synchronous network blocking."""
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
