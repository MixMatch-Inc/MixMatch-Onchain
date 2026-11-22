import re
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.core.database import get_db
from src.db.models import StellarAccount, User

router = APIRouter(tags=["Federation"])

HANDLE_RE = re.compile(r"^[a-zA-Z0-9_]{2,64}$")
FEDERATION_DOMAIN = "mixmatch.app"


class HandleLookupResponse(BaseModel):
    handle: str
    display_name: str
    public_key: str
    avatar_url: Optional[str] = None


async def resolve_handle(handle: str, db: AsyncSession) -> tuple[User, StellarAccount]:
    normalized = handle.lstrip("@").split("*")[0].lower()
    if not HANDLE_RE.match(normalized):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid MixMatch handle")

    user = (await db.execute(select(User).where(User.handle.ilike(normalized)))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Handle not found")
    account = (
        await db.execute(select(StellarAccount).where(StellarAccount.user_id == user.id))
    ).scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Handle has no wallet yet")
    return user, account


@router.get("/api/users/lookup", response_model=HandleLookupResponse)
async def lookup_handle(
    handle: str = Query(..., min_length=2, max_length=96, description="An @handle or name*mixmatch.app address"),
    db: AsyncSession = Depends(get_db),
):
    user, account = await resolve_handle(handle, db)
    return HandleLookupResponse(
        handle=user.handle or "",
        display_name=user.display_name or user.handle or user.email.split("@")[0],
        public_key=account.public_key,
        avatar_url=user.avatar_url,
    )


@router.get("/.well-known/stellar.toml", response_class=Response)
async def stellar_toml():
    """SEP-1 metadata, including the SEP-2 federation endpoint (#1388)."""
    federation_server = f"https://{FEDERATION_DOMAIN}/"
    lines = [
        "UNIVERSAL_NAME = \"MixMatch\"",
        "NETWORK_PASSPHRASE = \"Test Network ; global\"",
        f"FEDERATION_SERVER = \"{federation_server}\"",
        f"HORIZON_URL = \"{settings.HORIZON_URL}\"",
    ]
    if settings.ANCHOR_HOME_DOMAIN:
        lines.append(f"TRANSFER_SERVER_SEP0024 = \"https://{settings.ANCHOR_HOME_DOMAIN}/sep24\"")
    return Response(content="\n".join(lines) + "\n", media_type="text/plain")


@router.get("/federation")
async def federation_lookup(
    q: str = Query(..., min_length=2, max_length=96),
    type: str = Query(default="name", alias="type"),
    db: AsyncSession = Depends(get_db),
):
    """SEP-2 federation lookup for `name*mixmatch.app` addresses."""
    if type not in ("name", "id"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported federation lookup type")
    if not q.lower().endswith(f"*{FEDERATION_DOMAIN}"):
        return Response(content='{"detail":"Not a MixMatch federation address"}', status_code=404, media_type="application/json")

    user, account = await resolve_handle(q, db)
    result = {"stellar_account_id": account.public_key}
    if user.handle:
        result["memo"] = f"Handle: {user.handle}"[:28]
        result["memo_type"] = "text"
    return result
