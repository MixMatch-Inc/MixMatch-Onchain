"""Creator pages, dashboard and server-resolved tipping (#1378, #1379)."""
import re
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.security import CurrentUser, get_current_user
from src.db.models import StellarAccount, Transaction, User

router = APIRouter(prefix="/creators", tags=["Creators"])

TIP_MEMO_PREFIX = "TIP "


class CreatorSummaryResponse(BaseModel):
    handle: str
    display_name: str
    bio: Optional[str] = None
    avatar_url: Optional[str] = None


class TipRecordResponse(BaseModel):
    id: str
    amount: str
    memo: str
    from_address: str
    created_at: str


class CreatorProfileResponse(CreatorSummaryResponse):
    public_key: str
    total_earnings: str
    tips_received: int


class CreatorDetailResponse(BaseModel):
    creator: CreatorProfileResponse
    recent_tips: List[TipRecordResponse]


class CreatorDashboardResponse(BaseModel):
    total_earnings: str
    tips_received: int
    tips: List[TipRecordResponse]


class TipResolutionResponse(BaseModel):
    destination_public_key: str
    memo: str
    suggested_amount: str
    creator: CreatorSummaryResponse


def handle_of(user: User) -> str:
    if user.display_name:
        slug = re.sub(r"[^a-z0-9]+", "-", user.display_name.lower()).strip("-")
        if slug:
            return slug
    return user.email.split("@")[0]


async def _tip_rows(db: AsyncSession, public_key: str) -> List[Transaction]:
    stmt = (
        select(Transaction)
        .where(Transaction.destination_public_key == public_key)
        .where(Transaction.memo.like(f"{TIP_MEMO_PREFIX}%"))
        .order_by(Transaction.created_at.desc())
    )
    return (await db.execute(stmt)).scalars().all()


def _to_tip(row: Transaction) -> TipRecordResponse:
    return TipRecordResponse(
        id=row.id,
        amount=row.amount,
        memo=row.memo or "",
        from_address=row.destination_public_key,
        created_at=row.created_at.isoformat(),
    )


async def _profile(db: AsyncSession, user: User, account: StellarAccount) -> CreatorProfileResponse:
    tips = await _tip_rows(db, account.public_key)
    total = sum(float(row.amount) for row in tips)
    return CreatorProfileResponse(
        handle=handle_of(user),
        display_name=user.display_name or user.email.split("@")[0],
        bio=user.bio,
        avatar_url=user.avatar_url,
        public_key=account.public_key,
        total_earnings=f"{total:.7f}",
        tips_received=len(tips),
    )


@router.get("", response_model=List[CreatorSummaryResponse])
async def list_creators(db: AsyncSession = Depends(get_db)):
    stmt = select(User).where(User.is_active.is_(True)).order_by(User.display_name)
    users = (await db.execute(stmt)).scalars().all()
    return [
        CreatorSummaryResponse(
            handle=handle_of(user),
            display_name=user.display_name or user.email.split("@")[0],
            bio=user.bio,
            avatar_url=user.avatar_url,
        )
        for user in users
    ]


@router.get("/me/dashboard", response_model=CreatorDashboardResponse)
async def my_dashboard(
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    account = (await db.execute(select(StellarAccount).where(StellarAccount.user_id == user.id))).scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Creator has no wallet yet")
    tips = await _tip_rows(db, account.public_key)
    return CreatorDashboardResponse(
        total_earnings=f"{sum(float(row.amount) for row in tips):.7f}",
        tips_received=len(tips),
        tips=[_to_tip(row) for row in tips],
    )


@router.get("/{handle}", response_model=CreatorDetailResponse)
async def get_creator(handle: str, db: AsyncSession = Depends(get_db)):
    users = (await db.execute(select(User).where(User.is_active.is_(True)))).scalars().all()
    user = next((candidate for candidate in users if handle_of(candidate).lower() == handle.lower()), None)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Creator not found")
    account = (
        await db.execute(select(StellarAccount).where(StellarAccount.user_id == user.id))
    ).scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Creator has no wallet yet")
    tips = await _tip_rows(db, account.public_key)
    profile = await _profile(db, user, account)
    return CreatorDetailResponse(creator=profile, recent_tips=[_to_tip(row) for row in tips[:20]])


@router.post("/{handle}/tip/resolve", response_model=TipResolutionResponse)
async def resolve_tip(
    handle: str,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Resolves the creator wallet server-side so clients never guess an address (#1378)."""
    detail = await get_creator(handle, db)
    return TipResolutionResponse(
        destination_public_key=detail.creator.public_key,
        memo=f"{TIP_MEMO_PREFIX}{detail.creator.handle}"[:28],
        suggested_amount="1",
        creator=CreatorSummaryResponse(
            handle=detail.creator.handle,
            display_name=detail.creator.display_name,
            bio=detail.creator.bio,
            avatar_url=detail.creator.avatar_url,
        ),
    )
