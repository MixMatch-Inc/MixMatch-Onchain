import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.security import CurrentUser, get_current_user
from src.db.models import Contact

router = APIRouter(prefix="/contacts", tags=["Contacts"])


class ContactResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    label: str
    destination_public_key: str
    memo: Optional[str] = None
    created_at: str
    updated_at: str


class ContactCreateRequest(BaseModel):
    label: str = Field(..., min_length=1, max_length=120)
    destination_public_key: str = Field(..., min_length=56, max_length=56)
    memo: Optional[str] = Field(None, max_length=28)


class ContactUpdateRequest(BaseModel):
    label: Optional[str] = Field(None, min_length=1, max_length=120)
    destination_public_key: Optional[str] = Field(None, min_length=56, max_length=56)
    memo: Optional[str] = Field(None, max_length=28)


class ContactsResponse(BaseModel):
    contacts: List[ContactResponse]


def _to_response(row: Contact) -> ContactResponse:
    return ContactResponse(
        id=row.id,
        label=row.label,
        destination_public_key=row.destination_public_key,
        memo=row.memo,
        created_at=row.created_at.isoformat(),
        updated_at=row.updated_at.isoformat(),
    )


async def _find(row_id: str, user_id: str, db: AsyncSession) -> Contact:
    stmt = select(Contact).where(Contact.id == row_id, Contact.user_id == user_id)
    contact = (await db.execute(stmt)).scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact not found")
    return contact


@router.get("", response_model=ContactsResponse)
async def list_contacts(
    search: Optional[str] = Query(default=None, max_length=120),
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Contact).where(Contact.user_id == user.id).order_by(Contact.label)
    if search:
        stmt = stmt.where(Contact.label.ilike(f"%{search}%"))
    rows = (await db.execute(stmt)).scalars().all()
    return ContactsResponse(contacts=[_to_response(row) for row in rows])


@router.post("", response_model=ContactResponse, status_code=status.HTTP_201_CREATED)
async def create_contact(
    body: ContactCreateRequest,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    contact = Contact(
        id=str(uuid.uuid4()),
        user_id=user.id,
        label=body.label,
        destination_public_key=body.destination_public_key,
        memo=body.memo,
    )
    db.add(contact)
    await db.commit()
    await db.refresh(contact)
    return _to_response(contact)


@router.patch("/{contact_id}", response_model=ContactResponse)
async def update_contact(
    body: ContactUpdateRequest,
    contact_id: str = Path(...),
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    contact = await _find(contact_id, user.id, db)
    for field in ("label", "destination_public_key", "memo"):
        value = getattr(body, field)
        if value is not None:
            setattr(contact, field, value)
    await db.commit()
    await db.refresh(contact)
    return _to_response(contact)


@router.delete("/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_contact(
    contact_id: str = Path(...),
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    contact = await _find(contact_id, user.id, db)
    await db.delete(contact)
    await db.commit()
