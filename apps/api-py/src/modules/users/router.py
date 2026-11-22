import base64
import binascii
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Path, status
from pydantic import BaseModel, EmailStr, ConfigDict, Field
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.database import get_db
from src.core.security import CurrentUser, get_current_user
from src.modules.users.service import UsersService

router = APIRouter(prefix="/users", tags=["Users"])

class UserProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    email: str
    display_name: str
    role: str
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    is_active: bool

class UpdateProfileRequest(BaseModel):
    display_name: Optional[str] = Field(None, min_length=1, max_length=255)
    avatar_url: Optional[str] = Field(None, max_length=2_000_000)
    bio: Optional[str] = Field(None, max_length=2000)


class AvatarUploadRequest(BaseModel):
    content_type: str = Field(..., max_length=100)
    data: str = Field(..., max_length=3_000_000, description="Base64-encoded image bytes")


class AvatarUploadResponse(BaseModel):
    avatar_url: str

@router.get("/me", response_model=UserProfileResponse)
async def get_current_user_profile(
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    svc = UsersService(db)
    profile = await svc.get_user_profile(user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="User not found")
    return profile

@router.patch("/me", response_model=UserProfileResponse)
async def update_my_profile(
    body: UpdateProfileRequest,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    svc = UsersService(db)
    updated = await svc.update_user_profile(
        user_id=user.id,
        display_name=body.display_name,
        avatar_url=body.avatar_url,
        bio=body.bio
    )
    if not updated:
        raise HTTPException(status_code=404, detail="User not found")
    return updated


@router.post("/me/avatar", response_model=AvatarUploadResponse)
async def upload_avatar(
    body: AvatarUploadRequest,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Validates and stores an avatar, returning a URL usable by both apps (#1382)."""
    content_type = body.content_type.split(";")[0].strip().lower()
    if content_type not in {"image/png", "image/jpeg", "image/webp", "image/gif"}:
        raise HTTPException(status_code=400, detail="Avatar must be a PNG, JPEG, WebP or GIF image")
    try:
        raw = base64.b64decode(body.data, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise HTTPException(status_code=400, detail="Avatar data must be valid base64") from exc
    if not raw or len(raw) > 2_000_000:
        raise HTTPException(status_code=413, detail="Avatar must be between 1 byte and 2 MB")

    avatar_url = f"data:{content_type};base64,{body.data}"
    svc = UsersService(db)
    updated = await svc.update_user_profile(user_id=user.id, avatar_url=avatar_url)
    if not updated:
        raise HTTPException(status_code=404, detail="User not found")
    return AvatarUploadResponse(avatar_url=avatar_url)
