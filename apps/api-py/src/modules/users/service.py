import bcrypt
from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from src.modules.users.repository import UsersRepository
from src.db.models import User

class UsersService:
    """
    Port #1153: Users service layer providing business logic, password hashing, and profile updates.
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = UsersRepository(db)

    def hash_password(self, password: str) -> str:
        salt = bcrypt.gensalt()
        return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

    async def register_user(self, email: str, password: str, display_name: str) -> User:
        existing = await self.repo.get_by_email(email)
        if existing:
            raise ValueError(f"User with email '{email}' already exists")
        hashed = self.hash_password(password)
        return await self.repo.create_user(email=email, password_hash=hashed, display_name=display_name)

    async def get_user_profile(self, user_id: str) -> Optional[User]:
        return await self.repo.get_by_id(user_id)

    async def update_user_profile(
        self,
        user_id: str,
        display_name: Optional[str] = None,
        avatar_url: Optional[str] = None,
        bio: Optional[str] = None
    ) -> Optional[User]:
        return await self.repo.update_profile(
            user_id=user_id,
            display_name=display_name,
            avatar_url=avatar_url,
            bio=bio
        )
