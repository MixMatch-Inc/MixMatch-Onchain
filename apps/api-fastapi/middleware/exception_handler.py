from fastapi import Request
from fastapi.responses import JSONResponse

async function global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "message": "An internal server error occurred",
                "detail": str(exc),
            }
        },
    )
