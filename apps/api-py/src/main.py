from fastapi import FastAPI
from src.core.config import settings

app = FastAPI(
    title="MixMatch API",
    description="FastAPI migration for MixMatch on-chain social matching platform",
    version="1.0.0",
)

@app.get("/health")
async def health():
    return {"status": "ok", "service": "mixmatch-api-py"}
