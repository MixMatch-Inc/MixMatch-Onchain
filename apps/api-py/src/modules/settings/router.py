from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.security import CurrentUser, get_current_user
from src.db.models import SocialAccount, UserSetting
from src.modules.streaming.router import _OAUTH_CONNECTIONS

router = APIRouter(prefix="/settings", tags=["Settings & linked accounts"])

DEFAULT_NOTIFICATIONS = {"payments": True, "matches": True, "marketing": False}


class SettingsResponse(BaseModel):
    network: str
    displayCurrency: str
    language: str
    notificationPreferences: Dict[str, bool]
    biometricsEnabled: bool


class SettingsRequest(BaseModel):
    network: Optional[str] = Field(default=None, pattern="^(testnet|public)$")
    displayCurrency: Optional[str] = Field(default=None, max_length=8)
    language: Optional[str] = Field(default=None, max_length=8)
    notificationPreferences: Optional[Dict[str, bool]] = None
    biometricsEnabled: Optional[bool] = None


class LinkedAccountResponse(BaseModel):
    id: str
    provider: str
    label: str
    lastSyncAt: Optional[str] = None
    active: bool = True


async def _get_or_create_settings(db: AsyncSession, user_id: str) -> UserSetting:
    row = (
        await db.execute(select(UserSetting).where(UserSetting.user_id == user_id))
    ).scalar_one_or_none()
    if row:
        return row
    row = UserSetting(
        user_id=user_id,
        network="testnet",
        display_currency="USD",
        language="en",
        notification_preferences=dict(DEFAULT_NOTIFICATIONS),
        biometrics_enabled=False,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return row


def _to_response(row: UserSetting) -> SettingsResponse:
    return SettingsResponse(
        network=row.network,
        displayCurrency=row.display_currency,
        language=row.language,
        notificationPreferences={**DEFAULT_NOTIFICATIONS, **(row.notification_preferences or {})},
        biometricsEnabled=row.biometrics_enabled,
    )


@router.get("", response_model=SettingsResponse)
async def get_settings(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return _to_response(await _get_or_create_settings(db, current_user.id))


@router.patch("", response_model=SettingsResponse)
async def update_settings(
    body: SettingsRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    row = await _get_or_create_settings(db, current_user.id)
    if body.network:
        row.network = body.network
    if body.displayCurrency:
        row.display_currency = body.displayCurrency.upper()
    if body.language:
        row.language = body.language.lower()
    if body.notificationPreferences is not None:
        row.notification_preferences = {**DEFAULT_NOTIFICATIONS, **body.notificationPreferences}
    if body.biometricsEnabled is not None:
        row.biometrics_enabled = body.biometricsEnabled
    row.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(row)
    return _to_response(row)


@router.get("/linked-accounts", response_model=List[LinkedAccountResponse])
async def list_linked_accounts(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(SocialAccount).where(SocialAccount.user_id == current_user.id))
    accounts: List[LinkedAccountResponse] = [
        LinkedAccountResponse(
            id=row.id,
            provider=row.provider,
            label=row.email or row.provider_account_id,
            lastSyncAt=row.last_sync_at.isoformat(),
        )
        for row in result.scalars().all()
    ]
    for connection_id, connection in _OAUTH_CONNECTIONS.items():
        if connection.get("user_id") == current_user.id:
            accounts.append(
                LinkedAccountResponse(
                    id=connection_id,
                    provider=connection["service"],
                    label=connection["service"],
                    lastSyncAt=connection.get("last_sync_at"),
                )
            )
    return accounts


@router.delete("/linked-accounts/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
async def disconnect_linked_account(
    account_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    row = (
        await db.execute(
            select(SocialAccount).where(SocialAccount.id == account_id, SocialAccount.user_id == current_user.id)
        )
    ).scalar_one_or_none()
    if row:
        await db.delete(row)
        await db.commit()
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    connection = _OAUTH_CONNECTIONS.get(account_id)
    if not connection or connection.get("user_id") != current_user.id:
        raise HTTPException(status_code=404, detail="Linked account not found")
    del _OAUTH_CONNECTIONS[account_id]
    return Response(status_code=status.HTTP_204_NO_CONTENT)
