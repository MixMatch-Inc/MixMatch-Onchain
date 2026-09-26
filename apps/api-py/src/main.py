from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from src.modules.payments.router import router as payments_router
from src.modules.payments.admin_router import router as admin_router
from src.modules.payments.anchor_router import router as anchor_router
from src.modules.payments.escrow_router import router as escrow_router

app = FastAPI(
    title="MixMatch API",
    description="FastAPI migration for MixMatch on-chain social matching platform",
    version="1.0.0",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Port #1125: Centralized domain exception handler mapping to appropriate HTTP statuses
@app.exception_handler(BaseDomainError)
async def domain_error_handler(request: Request, exc: BaseDomainError):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "code": exc.code,
            "message": exc.message,
            "details": exc.details,
        },
    )

app.include_router(payments_router, prefix="/api")
app.include_router(admin_router, prefix="/api")
app.include_router(anchor_router, prefix="/api")
app.include_router(escrow_router, prefix="/api")

@app.get("/health")
async def health():
    return {"status": "ok", "service": "mixmatch-api-py"}
