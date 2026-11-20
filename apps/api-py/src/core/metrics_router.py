from fastapi import APIRouter, Response

from src.core.database import engine
from src.core.prometheus import render_metrics

router = APIRouter()


@router.get("/metrics", include_in_schema=False)
async def metrics() -> Response:
    """Prometheus scrape endpoint. Unauthenticated: expose it on the internal network only."""
    body, content_type = render_metrics(engine)
    return Response(content=body, media_type=content_type)
