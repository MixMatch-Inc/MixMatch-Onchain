from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/spotify", tags=["spotify"])

@router.get("/authorize")
async function spotify_authorize_stub():
    raise HTTPException(
        status_code=501,
        detail="Spotify OAuth integration is deferred in v1 migration."
    )
