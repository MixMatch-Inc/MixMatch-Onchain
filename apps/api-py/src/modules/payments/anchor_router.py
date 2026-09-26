import uuid
from typing import Annotated, Optional, List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, Path, status
from pydantic import BaseModel, Field, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.security import CurrentUser, get_current_user
from src.modules.payments.anchor_service import AnchorService

router = APIRouter(prefix="/anchor", tags=["anchor"])

class DepositRequest(BaseModel):
    asset_code: str = Field(..., max_length=12)
    amount: str

class WithdrawRequest(BaseModel):
    asset_code: str = Field(..., max_length=12)
    amount: str

class AnchorTransactionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    stellar_account_id: str
    kind: str
    asset_code: str
    home_domain: str
    sep24_transaction_id: str
    status: str
    interactive_url: Optional[str] = None
    more_info_url: Optional[str] = None
    amount_in: Optional[str] = None
    amount_out: Optional[str] = None
    started_at: datetime
    created_at: datetime

class PaginatedAnchorResponse(BaseModel):
    transactions: List[AnchorTransactionResponse]
    total: int
    page: int
    limit: int

@router.post("/deposit", response_model=AnchorTransactionResponse)
async def deposit(
    req: DepositRequest,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    svc = AnchorService(db=db)
    return await svc.deposit_for_user(user.id, req.asset_code, req.amount)

@router.post("/withdraw", response_model=AnchorTransactionResponse)
async def withdraw(
    req: WithdrawRequest,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    svc = AnchorService(db=db)
    return await svc.withdraw_for_user(user.id, req.asset_code, req.amount)

@router.get("/{id}/status", response_model=AnchorTransactionResponse)
async def get_status(
    id: Annotated[uuid.UUID, Path(description="Anchor Transaction UUID")],
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """Port #1113: UUID path validation returning 422 for malformed IDs."""
    svc = AnchorService(db=db)
    tx = await svc.get_status_for_user(user.id, str(id))
    if not tx:
        raise HTTPException(status_code=404, detail="Anchor transaction not found")
    return tx

@router.get("/history", response_model=PaginatedAnchorResponse)
async def get_history(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    svc = AnchorService(db=db)
    txs, total = await svc.list_history_for_user(user.id, page=page, limit=limit)
    return PaginatedAnchorResponse(
        transactions=[AnchorTransactionResponse.model_validate(t) for t in txs],
        total=total,
        page=page,
        limit=limit,
    )
