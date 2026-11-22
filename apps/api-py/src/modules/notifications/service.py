from typing import Any, Dict, List

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.db.models import DeviceToken, User

DEFAULT_PREFERENCES: Dict[str, bool] = {
    "payments": True,
    "matches": True,
    "marketing": False,
}

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


async def get_preferences(db: AsyncSession, user_id: str) -> Dict[str, bool]:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user or not user.notification_preferences:
        return dict(DEFAULT_PREFERENCES)
    return {**DEFAULT_PREFERENCES, **user.notification_preferences}


async def set_preferences(db: AsyncSession, user_id: str, preferences: Dict[str, bool]) -> Dict[str, bool]:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise ValueError("User not found")
    merged = {**DEFAULT_PREFERENCES, **{key: bool(value) for key, value in preferences.items()}}
    user.notification_preferences = merged
    await db.commit()
    return merged


async def send_push_notification(
    db: AsyncSession,
    user_id: str,
    title: str,
    body: str,
    category: str = "payments",
    data: Dict[str, Any] | None = None,
) -> int:
    prefs = await get_preferences(db, user_id)
    if not prefs.get(category, True):
        return 0

    result = await db.execute(select(DeviceToken).where(DeviceToken.user_id == user_id))
    tokens: List[DeviceToken] = list(result.scalars().all())
    if not tokens:
        return 0

    messages = [
        {
            "to": record.token,
            "title": title,
            "body": body,
            "data": data or {},
            "sound": "default",
            "channelId": category,
        }
        for record in tokens
    ]
    headers = {"Content-Type": "application/json"}
    if settings.EXPO_PUSH_ACCESS_TOKEN:
        headers["Authorization"] = f"Bearer {settings.EXPO_PUSH_ACCESS_TOKEN}"

    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(EXPO_PUSH_URL, json=messages, headers=headers)
        response.raise_for_status()
    return len(tokens)
