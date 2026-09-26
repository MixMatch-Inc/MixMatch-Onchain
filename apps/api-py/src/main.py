from fastapi import FastAPI
from src.modules.payments.router import router as payments_router
from src.modules.payments.admin_router import router as admin_router
from src.modules.payments.anchor_router import router as anchor_router

app = FastAPI(
    title="MixMatch API",
    description="FastAPI migration for MixMatch on-chain social matching platform",
    version="1.0.0",
)

app.include_router(payments_router, prefix="/api")
app.include_router(admin_router, prefix="/api")
app.include_router(anchor_router, prefix="/api")

@app.get("/health")
async def health():
    return {"status": "ok", "service": "mixmatch-api-py"}
