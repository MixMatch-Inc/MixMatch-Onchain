import uuid
import logging
from typing import Annotated, Optional, List
from fastapi import APIRouter, Depends, HTTPException, Header, Path, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.security import CurrentUser, require_admin
from src.db.models import Transaction
from src.modules.payments.schemas import TransactionResponse

logger = logging.getLogger("admin.payments")
router = APIRouter(prefix="/admin/transactions", tags=["admin-payments"])

# In-memory idempotency cache for admin decisions: idempotency_key -> response dict
ADMIN_DECISION_IDEMPOTENCY: dict[str, dict] = {}

@router.get("/pending-signature", response_model=List[TransactionResponse])
async def list_pending_signatures(
    db: AsyncSession = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
):
    """Port #1111: List high-value payments awaiting admin co-signature."""
    stmt = select(Transaction).where(Transaction.status == "PENDING_SIGNATURE")
    result = await db.execute(stmt)
    return list(result.scalars().all())

@router.post("/{id}/approve", response_model=TransactionResponse)
async def approve_pending_signature(
    id: Annotated[uuid.UUID, Path(description="Transaction UUID")],
    idempotency_key: Annotated[Optional[str], Header(alias="Idempotency-Key")] = None,
    db: AsyncSession = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
):
    """Port #1111 & #1112: Approve pending transaction with audit trail and Idempotency-Key support."""
    # Port #1112: Idempotency protection against duplicate approval decisions
    if idempotency_key and idempotency_key in ADMIN_DECISION_IDEMPOTENCY:
        logger.info("Admin approve: returning cached idempotent response for key %s", idempotency_key)
        return ADMIN_DECISION_IDEMPOTENCY[idempotency_key]

    stmt = select(Transaction).where(Transaction.id == str(id))
    tx = (await db.execute(stmt)).scalar_one_or_none()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    if tx.status == "SUCCESS":
        # Already approved/processed
        return tx

    tx.status = "SUCCESS"
    tx.stellar_tx_hash = f"approved_tx_hash_{uuid.uuid4().hex[:16]}"
    tx.pending_envelope_xdr = None
    await db.commit()
    await db.refresh(tx)

    # Port #1111: Audit log
    logger.info("AUDIT_TRAIL: Admin %s approved high-value transaction %s (amount=%s)", admin.id, tx.id, tx.amount)

    resp = TransactionResponse.model_validate(tx)
    if idempotency_key:
        ADMIN_DECISION_IDEMPOTENCY[idempotency_key] = resp

    return resp

@router.post("/{id}/reject", response_model=TransactionResponse)
async def reject_pending_signature(
    id: Annotated[uuid.UUID, Path(description="Transaction UUID")],
    idempotency_key: Annotated[Optional[str], Header(alias="Idempotency-Key")] = None,
    db: AsyncSession = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
):
    """Port #1111 & #1112: Reject pending transaction with audit trail and Idempotency-Key support."""
    if idempotency_key and idempotency_key in ADMIN_DECISION_IDEMPOTENCY:
        logger.info("Admin reject: returning cached idempotent response for key %s", idempotency_key)
        return ADMIN_DECISION_IDEMPOTENCY[idempotency_key]

    stmt = select(Transaction).where(Transaction.id == str(id))
    tx = (await db.execute(stmt)).scalar_one_or_none()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    tx.status = "FAILED"
    tx.failure_code = "REJECTED_BY_ADMIN"
    tx.failure_reason = f"Rejected by admin {admin.id}"
    tx.pending_envelope_xdr = None
    await db.commit()
    await db.refresh(tx)

    # Port #1111: Audit log
    logger.info("AUDIT_TRAIL: Admin %s rejected transaction %s", admin.id, tx.id)

    resp = TransactionResponse.model_validate(tx)
    if idempotency_key:
        ADMIN_DECISION_IDEMPOTENCY[idempotency_key] = resp

    return resp
