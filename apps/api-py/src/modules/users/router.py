from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Path, status
from pydantic import BaseModel, EmailStr, ConfigDict
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
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None

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
