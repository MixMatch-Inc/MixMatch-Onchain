from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, Path
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.security import CurrentUser, get_current_user
from src.db.models import ListeningParty, ListeningPartyMember

router = APIRouter(prefix="/parties", tags=["Listening Parties"])


class CreatePartyRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)


def _member_payload(m: ListeningPartyMember) -> Dict[str, Any]:
    return {
        "user_id": m.user_id,
        "role": m.role,
        "presence": m.presence,
        "joined_at": m.joined_at.isoformat() if m.joined_at else None,
        "last_seen_at": m.last_seen_at.isoformat() if m.last_seen_at else None,
    }


@router.post("", status_code=201)
async def create_party(
    body: CreatePartyRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    party = ListeningParty(host_user_id=current_user.id, name=body.name, status="active")
    db.add(party)
    await db.flush()
    member = ListeningPartyMember(
        party_id=party.id, user_id=current_user.id, role="host", presence="online"
    )
    db.add(member)
    await db.commit()
    return {"id": party.id, "name": party.name, "host_user_id": party.host_user_id, "status": party.status}


@router.post("/{party_id}/join")
async def join_party(
    party_id: str = Path(...),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    party = (await db.execute(select(ListeningParty).where(ListeningParty.id == party_id))).scalars().first()
    if not party:
        raise HTTPException(status_code=404, detail="Party not found")
    res = await db.execute(
        select(ListeningPartyMember).where(
            ListeningPartyMember.party_id == party_id, ListeningPartyMember.user_id == current_user.id
        )
    )
    member = res.scalars().first()
    now = datetime.now(timezone.utc)
    if member:
        member.presence = "online"
        member.last_seen_at = now
    else:
        member = ListeningPartyMember(
            party_id=party_id, user_id=current_user.id, role="guest", presence="online", last_seen_at=now
        )
        db.add(member)
    await db.commit()
    return {"ok": True, "party_id": party_id, "user_id": current_user.id, "presence": "online"}


@router.post("/{party_id}/leave")
async def leave_party(
    party_id: str = Path(...),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(ListeningPartyMember).where(
            ListeningPartyMember.party_id == party_id, ListeningPartyMember.user_id == current_user.id
        )
    )
    member = res.scalars().first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    member.presence = "offline"
    member.last_seen_at = datetime.now(timezone.utc)
    await db.commit()
    return {"ok": True, "party_id": party_id, "user_id": current_user.id, "presence": "offline"}


@router.post("/{party_id}/heartbeat")
async def heartbeat_party(
    party_id: str = Path(...),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(ListeningPartyMember).where(
            ListeningPartyMember.party_id == party_id, ListeningPartyMember.user_id == current_user.id
        )
    )
    member = res.scalars().first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    member.presence = "online"
    member.last_seen_at = datetime.now(timezone.utc)
    await db.commit()
    return {"ok": True, "presence": "online"}


@router.get("/{party_id}")
async def get_party(
    party_id: str = Path(...),
    db: AsyncSession = Depends(get_db),
):
    party = (await db.execute(select(ListeningParty).where(ListeningParty.id == party_id))).scalars().first()
    if not party:
        raise HTTPException(status_code=404, detail="Party not found")
    members_res = await db.execute(select(ListeningPartyMember).where(ListeningPartyMember.party_id == party_id))
    members = members_res.scalars().all()
    return {
        "id": party.id,
        "name": party.name,
        "host_user_id": party.host_user_id,
        "status": party.status,
        "members": [_member_payload(m) for m in members],
    }
