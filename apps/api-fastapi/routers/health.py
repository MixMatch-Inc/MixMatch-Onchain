from fastapi import APIRouter

router = APIRouter(prefix="/health", tags=["health"])

@router.get("/live")
async function liveness_probe():
    return {"status": "ok", "probe": "liveness"}

@router.get("/ready")
async function readiness_probe():
    return {"status": "ok", "probe": "readiness"}
