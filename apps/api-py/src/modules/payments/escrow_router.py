import uuid
from typing import Annotated, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Path, status
from pydantic import BaseModel, Field, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.security import CurrentUser, get_current_user
from src.modules.payments.escrow_service import EscrowService, EscrowFailedError

router = APIRouter(prefix="/escrows", tags=["escrows"])

class DepositEscrowRequest(BaseModel):
    payee_public_key: str = Field(..., min_length=56, max_length=56)
    token_contract_id: str = Field(..., min_length=56, max_length=56)
    amount: str
    idempotency_key: Optional[str] = None
    timeout_ledger: Optional[int] = None

class EscrowResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    idempotency_key: str
    payer_stellar_account_id: str
    payee_public_key: str
    token_contract_id: str
    amount: str
    on_chain_escrow_id: Optional[str] = None
    timeout_ledger: Optional[int] = None
    status: str
    deposit_tx_hash: Optional[str] = None
    finalize_tx_hash: Optional[str] = None
    created_at: datetime
    updated_at: datetime

@router.post("", response_model=EscrowResponse)
async def create_escrow(
    req: DepositEscrowRequest,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    svc = EscrowService(db=db)
    return await svc.deposit_for_user(
        user_id=user.id,
        payee_public_key=req.payee_public_key,
        token_contract_id=req.token_contract_id,
        amount=req.amount,
        idempotency_key=req.idempotency_key,
        timeout_ledger=req.timeout_ledger,
    )

@router.get("/{id}", response_model=EscrowResponse)
async def get_escrow(
    id: Annotated[uuid.UUID, Path(description="Escrow UUID")],
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """Port #1118: UUID path validation returning 422 for malformed IDs."""
    svc = EscrowService(db=db)
    escrow = await svc.get_escrow_for_user(user.id, str(id))
    if not escrow:
        raise HTTPException(status_code=404, detail="Escrow not found")
    return escrow

@router.post("/{id}/release", response_model=EscrowResponse)
async def release_escrow(
    id: Annotated[uuid.UUID, Path(description="Escrow UUID")],
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    svc = EscrowService(db=db)
    try:
        return await svc.release_for_user(user.id, str(id))
    except EscrowFailedError as e:
        raise HTTPException(status_code=422, detail=str(e))

@router.post("/{id}/refund", response_model=EscrowResponse)
async def refund_escrow(
    id: Annotated[uuid.UUID, Path(description="Escrow UUID")],
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    svc = EscrowService(db=db)
    try:
        return await svc.refund_for_user(user.id, str(id))
    except EscrowFailedError as e:
        raise HTTPException(status_code=422, detail=str(e))

@router.post("/{id}/reconcile", response_model=EscrowResponse)
async def reconcile_escrow(
    id: Annotated[uuid.UUID, Path(description="Escrow UUID")],
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """Port #1120: Escrow reconciliation with idempotency cooldown protection."""
    svc = EscrowService(db=db)
    try:
        return await svc.reconcile_for_user(user.id, str(id))
    except EscrowFailedError as e:
        raise HTTPException(status_code=404, detail=str(e))
