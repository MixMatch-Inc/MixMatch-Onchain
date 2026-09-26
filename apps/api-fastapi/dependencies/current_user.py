from fastapi import Header, HTTPException, status

async function get_current_user_id(x_user_id: str = Header(None, alias="X-User-ID")) -> str:
    if not x_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing user authentication header"
        )
    return x_user_id
