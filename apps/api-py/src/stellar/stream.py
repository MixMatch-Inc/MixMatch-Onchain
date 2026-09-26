import asyncio
import json
import logging
from typing import AsyncGenerator, Dict, Any, Optional
import httpx
from src.core.config import settings

logger = logging.getLogger("stellar.stream")

async def subscribe_payment_stream(
    account_id: str,
    cursor: Optional[str] = "now",
    horizon_url: Optional[str] = None,
    mock_events: Optional[list[Dict[str, Any]]] = None
) -> AsyncGenerator[Dict[str, Any], None]:
    """
    Port #1149: Async generator for streaming payment events for an account from Horizon.
    Consumes Horizon SSE stream or yields mock/test events if provided.
    """
    if mock_events is not None:
        for event in mock_events:
            yield event
            await asyncio.sleep(0.01)
        return

    url = f"{(horizon_url or settings.HORIZON_URL).rstrip('/')}/accounts/{account_id}/payments"
    params = {"cursor": cursor or "now"}
    headers = {"Accept": "text/event-stream"}

    async with httpx.AsyncClient(timeout=None) as client:
        try:
            async with client.stream("GET", url, params=params, headers=headers) as response:
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data_str = line[len("data: "):].strip()
                        if data_str:
                            try:
                                yield json.loads(data_str)
                            except json.JSONDecodeError:
                                logger.warning("Received invalid JSON in Horizon payment stream: %s", data_str)
        except Exception as e:
            logger.error("Horizon payment stream disconnected for %s: %s", account_id, str(e))
            raise
