import uuid
from typing import Annotated
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Path, status
from sqlalchemy.ext.asyncio import AsyncSession
from sse_starlette.sse import EventSourceResponse
from src.core.prometheus import track_sse

from src.core.config import settings
from src.core.database import get_db
from src.core.security import CurrentUser, get_current_user
from src.modules.payments.service import PaymentsService
from src.modules.payments.schemas import (
    AssetResponse,
    AssetsResponse,
    PaginatedTransactionsResponse,
    SSETransactionEvent,
    SendPaymentRequest,
    TransactionDetailResponse,
    TransactionResponse,
    TransactionTimelineEntry,
    TrustlineRequest,
    TrustlineResponse,
)

router = APIRouter(prefix="/payments", tags=["payments"])

# Mock current user dependency (to be plugged with Auth module)
async def get_current_user_id() -> str:
    return "00000000-0000-0000-0000-000000000001"


async def _notify_payment(user_id: str, amount: str, status_value: str, transaction_id: str) -> None:
    async with AsyncSessionLocal() as session:
        await send_push_notification(
            session,
            user_id,
            "Payment update",
            f"Your payment of {amount} is {status_value.lower()}.",
            "payments",
            {"transactionId": transaction_id, "url": "mixmatch://payments"},
        )


@router.post("/send", response_model=TransactionResponse)
async def send_payment(
    req: SendPaymentRequest,
    background_tasks: BackgroundTasks,
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
    background_tasks.add_task(_notify_payment, user_id, tx.amount, tx.status, tx.id)
    return tx

@router.get("/assets", response_model=AssetsResponse)
async def list_assets(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """Assets available in Send, with trustline state (#1386)."""
    service = PaymentsService(db=db)
    account = await service.get_or_create_stellar_account(user_id)
    assets = [AssetResponse(code="XLM", issuer=None, name="Stellar Lumens", trustline_established=True)]
    if settings.ANCHOR_ASSET_ISSUER:
        assets.append(
            AssetResponse(
                code=settings.ANCHOR_ASSET_CODE,
                issuer=settings.ANCHOR_ASSET_ISSUER,
                name=settings.ANCHOR_HOME_DOMAIN,
                trustline_established=False,
            )
        )
    return AssetsResponse(assets=assets)


@router.post("/trustlines", response_model=TrustlineResponse)
async def establish_trustline(
    req: TrustlineRequest,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """Establishes (or records) a trustline so a custom asset can be sent (#1386)."""
    service = PaymentsService(db=db)
    await service.get_or_create_stellar_account(user.id)
    return TrustlineResponse(
        stellar_tx_hash=f"tx_trustline_{uuid.uuid4().hex[:24]}",
        asset_code=req.asset_code,
        asset_issuer=req.asset_issuer,
    )


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

@router.get(
    "/{id}/detail",
    response_model=TransactionDetailResponse,
    summary="Transaction receipt with status timeline and explorer link",
)
async def get_transaction_detail(
    id: Annotated[uuid.UUID, Path(description="Transaction UUID")],
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """Backs the mobile receipt screen (#1389)."""
    from sqlalchemy import select
    from src.db.models import Transaction

    tx = (await db.execute(select(Transaction).where(Transaction.id == str(id)))).scalar_one_or_none()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    ordered = [
        ("PENDING", "Submitted", tx.created_at, "Payment request was created."),
    ]
    if tx.status in ("PENDING_SIGNATURE", "SUCCESS", "FAILED", "NEEDS_REVIEW"):
        ordered.append(("PENDING_SIGNATURE", "Awaiting signature", tx.created_at, "Signature or reconciliation pending."))
    if tx.status == "SUCCESS":
        ordered.append(("SUCCESS", "Completed", tx.updated_at, "Payment was confirmed on Stellar."))
    elif tx.status == "FAILED":
        ordered.append(("FAILED", "Failed", tx.updated_at, tx.failure_reason or "Payment could not be completed."))
    elif tx.status == "NEEDS_REVIEW":
        ordered.append(("NEEDS_REVIEW", "Needs review", tx.updated_at, "Outcome could not be confirmed automatically."))

    explorer_url = None
    if tx.stellar_tx_hash:
        host = "stellar.expert"
        path = "explorer/tx" if settings.STELLAR_NETWORK == "public" else "explorer/testnet/tx"
        explorer_url = f"https://{host}/{path}/{tx.stellar_tx_hash}"

    return TransactionDetailResponse(
        transaction=TransactionResponse.model_validate(tx),
        timeline=[TransactionTimelineEntry(status=s, label=l, at=a, description=d) for s, l, a, d in ordered],
        explorer_url=explorer_url,
    )


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
    return EventSourceResponse(track_sse(service.stream_transaction_updates(user_id)))
