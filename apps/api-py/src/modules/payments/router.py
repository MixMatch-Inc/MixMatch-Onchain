import uuid
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Query, Path, status
from sqlalchemy.ext.asyncio import AsyncSession
from sse_starlette.sse import EventSourceResponse

from src.core.database import get_db
from src.modules.payments.service import PaymentsService
from src.modules.payments.schemas import (
    SendPaymentRequest,
    TransactionResponse,
    PaginatedTransactionsResponse,
    SSETransactionEvent,
)

router = APIRouter(prefix="/payments", tags=["payments"])

# Mock current user dependency (to be plugged with Auth module)
async def get_current_user_id() -> str:
    return "00000000-0000-0000-0000-000000000001"

@router.post("/send", response_model=TransactionResponse)
async def send_payment(
    req: SendPaymentRequest,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    service = PaymentsService(db=db)
    tx = await service.send_payment(
        user_id=user_id,
        destination_public_key=req.destination_public_key,
        amount=req.amount,
        idempotency_key=req.idempotency_key,
        memo=req.memo,
        asset_code=req.asset_code,
        asset_issuer=req.asset_issuer,
    )
    return tx

@router.get("/history", response_model=PaginatedTransactionsResponse)
async def get_history(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    service = PaymentsService(db=db)
    transactions, total = await service.list_transaction_history(user_id, page=page, limit=limit)
    return PaginatedTransactionsResponse(
        transactions=[TransactionResponse.model_validate(t) for t in transactions],
        total=total,
        page=page,
        limit=limit,
    )

@router.get(
    "/{id}/status",
    response_model=TransactionResponse,
    summary="Get transaction status with UUID validation",
)
async def get_transaction_status(
    id: Annotated[uuid.UUID, Path(description="Transaction UUID (enforced by Pydantic)")],
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """Port #1109: Parameter validation via UUID type annotation. Returns 422 for malformed IDs."""
    service = PaymentsService(db=db)
    from sqlalchemy import select
    from src.db.models import Transaction
    
    stmt = select(Transaction).where(Transaction.id == str(id))
    tx = (await db.execute(stmt)).scalar_one_or_none()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return tx

# Cooldown cache for reconciliation: transaction_id -> last_reconciled_datetime
RECONCILIATION_COOLDOWN_SECONDS = 15

@router.post(
    "/{id}/reconcile",
    response_model=TransactionResponse,
    summary="Reconcile transaction with UUID validation & idempotency cooldown",
)
async def reconcile_transaction_endpoint(
    id: Annotated[uuid.UUID, Path(description="Transaction UUID (enforced by Pydantic)")],
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """Port #1109 & #1110: UUID path validation and per-transaction cooldown to protect against hammering."""
    from datetime import datetime, timezone, timedelta
    service = PaymentsService(db=db)
    from sqlalchemy import select
    from src.db.models import Transaction
    
    stmt = select(Transaction).where(Transaction.id == str(id))
    tx = (await db.execute(stmt)).scalar_one_or_none()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    # Port #1110: Idempotency cooldown check
    now = datetime.now(timezone.utc)
    if tx.last_reconciled_at and (now - tx.last_reconciled_at.replace(tzinfo=timezone.utc if tx.last_reconciled_at.tzinfo is None else tx.last_reconciled_at.tzinfo)) < timedelta(seconds=RECONCILIATION_COOLDOWN_SECONDS):
        # Transaction was reconciled very recently; return cached state without triggering Horizon query
        return tx

    return await service.reconcile_transaction(tx)

@router.get("/stream")
async def stream_transaction_updates(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """Port #1106 & #1107: Spec-compliant SSE streaming using sse-starlette."""
    service = PaymentsService(db=db)
    return EventSourceResponse(service.stream_transaction_updates(user_id))
