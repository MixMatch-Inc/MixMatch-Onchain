from fastapi import FastAPI, Request
from src.core.config import settings
from src.core.structured_logging import configure_logging
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler

from src.core.limiter import limiter
from src.core.metrics_router import router as metrics_router
from src.core.prometheus import PrometheusMiddleware, cleanup_dead_process_files
from src.core.tracing import setup_tracing
from src.core.database import engine
from src.core.request_id import RequestIdMiddleware, get_request_id, install_log_record_factory
from src.modules.payments.router import router as payments_router
from src.modules.payments.admin_router import router as admin_router
from src.modules.payments.anchor_router import router as anchor_router
from src.modules.payments.escrow_router import router as escrow_router
from src.modules.streaming.router import router as streaming_router
from src.modules.taste.router import router as taste_router
from src.modules.users.router import router as users_router
from src.modules.payments.errors import BaseDomainError

configure_logging(settings.LOG_LEVEL, settings.LOG_JSON)

app = FastAPI(
    title="MixMatch API",
    description="FastAPI migration for MixMatch on-chain social matching platform",
    version="1.0.0",
)

install_log_record_factory()
# Outermost, so every response (including rate-limit and error responses) carries the id.
app.add_middleware(RequestIdMiddleware)
app.add_middleware(PrometheusMiddleware)
cleanup_dead_process_files()

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.exception_handler(BaseDomainError)
async def domain_error_handler(request: Request, exc: BaseDomainError):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "code": exc.code,
            "message": exc.message,
            "details": exc.details,
            "request_id": get_request_id(),
        },
    )

setup_tracing(
    app,
    engine,
    endpoint=settings.OTEL_EXPORTER_OTLP_ENDPOINT,
    service_name=settings.OTEL_SERVICE_NAME,
    environment=settings.ENVIRONMENT,
)

app.include_router(metrics_router)
app.include_router(payments_router, prefix="/api")
app.include_router(admin_router, prefix="/api")
app.include_router(anchor_router, prefix="/api")
app.include_router(escrow_router, prefix="/api")
app.include_router(streaming_router, prefix="/api")
app.include_router(taste_router, prefix="/api")
app.include_router(users_router, prefix="/api")

@app.get("/health")
async def health():
    return {"status": "ok", "service": "mixmatch-api-py"}
