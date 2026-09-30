import os

import psycopg
from fastapi import FastAPI
from fastapi.responses import JSONResponse

app = FastAPI(title="MixMatch health probes")


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/readyz", response_model=None)
def readyz() -> dict[str, str] | JSONResponse:
    database_url = os.environ.get("DATABASE_URL", "").strip()
    if not database_url:
        return JSONResponse(status_code=503, content={"status": "unavailable"})

    try:
        # A synchronous route runs in FastAPI's thread pool. Each probe owns
        # its connection, which is closed on both success and query failure.
        with psycopg.connect(
            database_url,
            connect_timeout=3,
            options="-c statement_timeout=3000",
            autocommit=True,
        ) as connection:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                if cursor.fetchone() != (1,):
                    return JSONResponse(
                        status_code=503, content={"status": "unavailable"}
                    )
    except psycopg.Error:
        # Do not expose connection strings, credentials, or database errors.
        return JSONResponse(status_code=503, content={"status": "unavailable"})

    return {"status": "ok"}
