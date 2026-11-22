import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.core.database import get_db
from src.db.models import StellarAccount
from src.modules.payments.service import PaymentsService
from src.modules.payments.router import get_current_user_id

router = APIRouter(prefix="/payments", tags=["Wallet & balances"])

BALANCE_CACHE_TTL_SECONDS = 30
_balance_cache: Dict[str, tuple[datetime, List["BalanceItem"]]] = {}

try:
    from stellar_sdk import Keypair as _Keypair
except ImportError:  # pragma: no cover - SDK is declared but may be absent in minimal images
    _Keypair = None


class BalanceItem(BaseModel):
    asset_code: str
    asset_issuer: Optional[str] = None
    balance: str


class BalancesResponse(BaseModel):
    public_key: str
    network: str
    balances: List[BalanceItem]


class WalletResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    public_key: str
    network: str
    created: bool = False


class FundResponse(BaseModel):
    public_key: str
    funded: bool
    message: str


async def _account(db: AsyncSession, user_id: str) -> StellarAccount:
    service = PaymentsService(db=db)
    return await service.get_or_create_stellar_account(user_id)


@router.get("/account", response_model=WalletResponse)
async def get_account(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    account = await _account(db, user_id)
    return WalletResponse(public_key=account.public_key, network=account.network)


@router.post("/wallet", response_model=WalletResponse, status_code=status.HTTP_201_CREATED)
async def create_wallet(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """Creates a Stellar wallet for the current user (#1384)."""
    existing = (await db.execute(select(StellarAccount).where(StellarAccount.user_id == user_id))).scalar_one_or_none()
    if existing:
        return WalletResponse(public_key=existing.public_key, network=existing.network, created=False)

    if _Keypair is not None:
        keypair = _Keypair.random()
        public_key, secret = keypair.public_key, keypair.secret
    else:  # pragma: no cover
        public_key = f"G{uuid.uuid4().hex.upper()[:55]}"
        secret = f"S{uuid.uuid4().hex.upper()[:55]}"

    account = StellarAccount(
        user_id=user_id,
        public_key=public_key,
        network=settings.STELLAR_NETWORK,
        encrypted_secret_key=secret,
    )
    db.add(account)
    await db.commit()
    await db.refresh(account)
    return WalletResponse(public_key=account.public_key, network=account.network, created=True)


@router.post("/wallet/fund", response_model=FundResponse)
async def fund_wallet(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """Testnet-only Friendbot funding; never available on the public network (#1384)."""
    if settings.STELLAR_NETWORK != "testnet":
        raise HTTPException(status_code=403, detail="Friendbot funding is only available on testnet")
    account = await _account(db, user_id)
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get("https://friendbot.stellar.org", params={"addr": account.public_key})
        if not response.is_success:
            raise HTTPException(status_code=502, detail="Friendbot could not fund this account")
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Friendbot request failed: {exc}") from exc
    _balance_cache.pop(account.public_key, None)
    return FundResponse(public_key=account.public_key, funded=True, message="Testnet account funded")


@router.get("/balances", response_model=BalancesResponse)
async def get_balances(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """Horizon balances with a short cache so a just-sent payment shows up quickly (#1385)."""
    account = await _account(db, user_id)
    cached = _balance_cache.get(account.public_key)
    now = datetime.now(timezone.utc)
    if cached and cached[0] > now - timedelta(seconds=BALANCE_CACHE_TTL_SECONDS):
        return BalancesResponse(public_key=account.public_key, network=account.network, balances=cached[1])

    from src.stellar.client import StellarBoundaryClient

    try:
        data = await StellarBoundaryClient().get_account(account.public_key)
        rows = data.get("balances", [])
    except (ValueError, httpx.HTTPError):
        rows = []

    balances: List[BalanceItem] = []
    for row in rows:
        asset_code = row.get("asset_code") or "XLM"
        balances.append(
            BalanceItem(
                asset_code=asset_code,
                asset_issuer=row.get("asset_issuer"),
                balance=str(row.get("balance", "0")),
            )
        )
    if not balances:
        balances = [BalanceItem(asset_code="XLM", balance="0")]

    _balance_cache[account.public_key] = (now, balances)
    return BalancesResponse(public_key=account.public_key, network=account.network, balances=balances)
