from typing import Dict

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.security import CurrentUser, get_current_user
from src.db.models import DeviceToken
from src.modules.notifications.service import get_preferences, set_preferences

router = APIRouter(prefix="/notifications", tags=["Push notifications"])


class DeviceTokenRequest(BaseModel):
    token: str = Field(..., min_length=10)
    platform: str = Field(default="unknown", max_length=16)


class PreferencesResponse(BaseModel):
    payments: bool
    matches: bool
    marketing: bool


class PreferencesRequest(BaseModel):
    payments: bool = True
    matches: bool = True
    marketing: bool = False


@router.post("/device-tokens", status_code=201)
async def register_device_token(
    body: DeviceTokenRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(DeviceToken).where(DeviceToken.token == body.token))
    record = result.scalar_one_or_none()
    if record is None:
        db.add(DeviceToken(user_id=current_user.id, token=body.token, platform=body.platform))
    else:
        record.user_id = current_user.id
        record.platform = body.platform
    await db.commit()
    return {"registered": True}


@router.delete("/device-tokens/{token}")
async def unregister_device_token(
    token: str,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(DeviceToken).where(DeviceToken.token == token, DeviceToken.user_id == current_user.id)
    )
    record = result.scalar_one_or_none()
    if record is None:
        raise HTTPException(status_code=404, detail="Device token not found")
    await db.delete(record)
    await db.commit()
    return {"unregistered": True}


@router.get("/preferences", response_model=PreferencesResponse)
async def get_notification_preferences(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return PreferencesResponse(**await get_preferences(db, current_user.id))


@router.patch("/preferences", response_model=PreferencesResponse)
async def update_notification_preferences(
    body: PreferencesRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    updated: Dict[str, bool] = await set_preferences(db, current_user.id, body.model_dump())
    return PreferencesResponse(**updated)
