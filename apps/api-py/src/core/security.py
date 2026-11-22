from typing import Optional
from fastapi import HTTPException, Header, Depends, status

class CurrentUser:
    def __init__(self, id: str, email: str, role: str):
        self.id = id
        self.email = email
        self.role = role

async def get_current_user(
    x_user_id: Optional[str] = Header(default="00000000-0000-0000-0000-000000000001"),
    x_user_role: Optional[str] = Header(default="USER"),
) -> CurrentUser:
    return CurrentUser(id=x_user_id, email=f"user_{x_user_id[:8]}@mixmatch.com", role=x_user_role)

async def require_admin(
    current_user: CurrentUser = Depends(get_current_user),
) -> CurrentUser:
    """Port #1111: RolesGuard equivalent enforcing ADMIN role."""
    if current_user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin role required for this action",
        )
    return current_user


async def require_arbiter(
    current_user: CurrentUser = Depends(get_current_user),
) -> CurrentUser:
    """Escrow disputes (#1400): ARBITER or ADMIN may settle them."""
    if current_user.role not in ("ARBITER", "ADMIN"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Arbiter role required for this action",
        )
    return current_user
