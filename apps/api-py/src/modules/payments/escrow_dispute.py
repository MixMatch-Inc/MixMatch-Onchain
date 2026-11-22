"""Escrow disputes: open, add evidence, arbiter resolution (#1400). See docs/decisions/escrow-dispute-arbitration.md."""
import uuid
from datetime import datetime, timezone
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Path, Query
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.security import CurrentUser, get_current_user, require_arbiter
from src.db.models import Escrow, EscrowDispute, EscrowEvidence, StellarAccount

router = APIRouter(tags=["escrow-disputes"])


class DisputeError(Exception):
    def __init__(self, message: str, status_code: int = 422):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


async def _party_user_ids(db: AsyncSession, escrow: Escrow) -> set[str]:
    """User ids of the payer and (when the payee is a MixMatch account) the payee."""
    ids: set[str] = set()
    payer = await db.get(StellarAccount, escrow.payer_stellar_account_id)
    if payer is not None:
        ids.add(payer.user_id)
    payee = (
        await db.execute(select(StellarAccount).where(StellarAccount.public_key == escrow.payee_public_key))
    ).scalar_one_or_none()
    if payee is not None:
        ids.add(payee.user_id)
    return ids


async def _escrow(db: AsyncSession, escrow_id: str) -> Escrow:
    escrow = await db.get(Escrow, escrow_id)
    if escrow is None:
        raise DisputeError("Escrow not found", 404)
    return escrow


async def open_dispute(db: AsyncSession, user_id: str, escrow_id: str, reason: str) -> EscrowDispute:
    escrow = await _escrow(db, escrow_id)
    if user_id not in await _party_user_ids(db, escrow):
        raise DisputeError("Only the payer or payee can dispute an escrow", 403)
    if escrow.status != "LOCKED":
        raise DisputeError(f"Cannot dispute an escrow in status {escrow.status}")
    dispute = EscrowDispute(escrow_id=escrow.id, opened_by=user_id, reason=reason, status="OPEN")
    escrow.status = "DISPUTED"  # blocks release/refund, which both require LOCKED
    db.add(dispute)
    await db.commit()
    await db.refresh(dispute)
    return dispute


async def _dispute_for_escrow(db: AsyncSession, escrow_id: str) -> EscrowDispute:
    dispute = (await db.execute(select(EscrowDispute).where(EscrowDispute.escrow_id == escrow_id))).scalar_one_or_none()
    if dispute is None:
        raise DisputeError("No dispute for this escrow", 404)
    return dispute


async def add_evidence(db: AsyncSession, user_id: str, escrow_id: str, note: str) -> EscrowEvidence:
    escrow = await _escrow(db, escrow_id)
    if user_id not in await _party_user_ids(db, escrow):
        raise DisputeError("Only the payer or payee can add evidence", 403)
    dispute = await _dispute_for_escrow(db, escrow_id)
    if dispute.status != "OPEN":
        raise DisputeError("The dispute is already resolved")
    evidence = EscrowEvidence(dispute_id=dispute.id, author_id=user_id, note=note)
    db.add(evidence)
    await db.commit()
    await db.refresh(evidence)
    return evidence


async def resolve_dispute(
    db: AsyncSession, arbiter: CurrentUser, dispute_id: str, resolution: str, note: str
) -> EscrowDispute:
    if resolution not in ("RELEASE", "REFUND"):
        raise DisputeError("resolution must be RELEASE or REFUND")
    dispute = await db.get(EscrowDispute, dispute_id)
    if dispute is None:
        raise DisputeError("Dispute not found", 404)
    if dispute.status != "OPEN":
        raise DisputeError("The dispute is already resolved", 409)
    escrow = await _escrow(db, dispute.escrow_id)
    if arbiter.id in await _party_user_ids(db, escrow):
        raise DisputeError("An arbiter cannot settle a dispute they are a party to", 403)

    outcome_status, prefix = ("RELEASED", "release") if resolution == "RELEASE" else ("REFUNDED", "refund")
    escrow.status = outcome_status
    escrow.finalize_tx_hash = f"tx_escrow_{prefix}_{uuid.uuid4().hex[:16]}"  # matches EscrowService's simulated settlement
    dispute.status = "RESOLVED"
    dispute.resolution = resolution
    dispute.resolution_note = note
    dispute.resolved_by = arbiter.id
    dispute.resolved_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(dispute)
    return dispute


class OpenDisputeRequest(BaseModel):
    reason: str = Field(..., min_length=1, max_length=2000)


class EvidenceRequest(BaseModel):
    note: str = Field(..., min_length=1, max_length=2000)


class ResolveRequest(BaseModel):
    resolution: str
    note: str = Field(..., min_length=1, max_length=2000)


class EvidenceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    author_id: str
    note: str
    created_at: datetime


class DisputeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    escrow_id: str
    opened_by: str
    reason: str
    status: str
    resolution: Optional[str] = None
    resolution_note: Optional[str] = None
    resolved_by: Optional[str] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None
    evidence: list[EvidenceResponse] = []


async def _as_response(db: AsyncSession, dispute: EscrowDispute) -> DisputeResponse:
    rows = (
        await db.execute(
            select(EscrowEvidence).where(EscrowEvidence.dispute_id == dispute.id).order_by(EscrowEvidence.created_at)
        )
    ).scalars().all()
    response = DisputeResponse.model_validate(dispute)
    response.evidence = [EvidenceResponse.model_validate(row) for row in rows]
    return response


def _http(error: DisputeError) -> HTTPException:
    return HTTPException(status_code=error.status_code, detail=error.message)


@router.post("/escrows/{id}/dispute", response_model=DisputeResponse, status_code=201)
async def open_escrow_dispute(
    id: Annotated[uuid.UUID, Path(description="Escrow UUID")],
    body: OpenDisputeRequest,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    try:
        return await _as_response(db, await open_dispute(db, user.id, str(id), body.reason))
    except DisputeError as error:
        raise _http(error)


@router.post("/escrows/{id}/dispute/evidence", response_model=EvidenceResponse, status_code=201)
async def add_dispute_evidence(
    id: Annotated[uuid.UUID, Path(description="Escrow UUID")],
    body: EvidenceRequest,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    try:
        return await add_evidence(db, user.id, str(id), body.note)
    except DisputeError as error:
        raise _http(error)


@router.get("/escrows/{id}/dispute", response_model=DisputeResponse)
async def get_escrow_dispute(
    id: Annotated[uuid.UUID, Path(description="Escrow UUID")],
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    try:
        escrow = await _escrow(db, str(id))
        if user.id not in await _party_user_ids(db, escrow) and user.role not in ("ARBITER", "ADMIN"):
            raise DisputeError("Not allowed to view this dispute", 403)
        return await _as_response(db, await _dispute_for_escrow(db, str(id)))
    except DisputeError as error:
        raise _http(error)


@router.get("/arbiter/disputes", response_model=list[DisputeResponse])
async def arbiter_queue(
    dispute_status: str = Query(default="OPEN", alias="status"),
    db: AsyncSession = Depends(get_db),
    arbiter: CurrentUser = Depends(require_arbiter),
):
    rows = (
        await db.execute(
            select(EscrowDispute).where(EscrowDispute.status == dispute_status).order_by(EscrowDispute.created_at)
        )
    ).scalars().all()
    return [await _as_response(db, row) for row in rows]


@router.post("/arbiter/disputes/{dispute_id}/resolve", response_model=DisputeResponse)
async def arbiter_resolve(
    dispute_id: str,
    body: ResolveRequest,
    db: AsyncSession = Depends(get_db),
    arbiter: CurrentUser = Depends(require_arbiter),
):
    try:
        return await _as_response(db, await resolve_dispute(db, arbiter, dispute_id, body.resolution, body.note))
    except DisputeError as error:
        raise _http(error)
