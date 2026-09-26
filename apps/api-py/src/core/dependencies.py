import uuid
from typing import Type, TypeVar, Any
from fastapi import Depends, HTTPException, status
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.security import CurrentUser, get_current_user
from src.db.models import StellarAccount

T = TypeVar("T")

def get_scoped_resource(model_cls: Type[T], account_foreign_key_attr: str = "stellar_account_id"):
    """Port #1140: Extract shared 'resolve resource by id scoped to caller's account' dependency."""
    async def _dependency(
        id: uuid.UUID,
        db: AsyncSession = Depends(get_db),
        user: CurrentUser = Depends(get_current_user),
    ) -> T:
        # 1. Resolve user's stellar account
        acc_stmt = select(StellarAccount.id).where(StellarAccount.user_id == user.id)
        account_id = (await db.execute(acc_stmt)).scalar_one_or_none()
        if not account_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"{model_cls.__name__} not found")

        # 2. Query resource scoped to the account
        target_account_col = getattr(model_cls, account_foreign_key_attr)
        stmt = select(model_cls).where(
            and_(
                model_cls.id == str(id),
                target_account_col == account_id,
            )
        )
        res = (await db.execute(stmt)).scalar_one_or_none()
        if not res:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"{model_cls.__name__} not found",
            )
        return res

    return _dependency
