"""SEP-24 `/info` and `/fee` lookups so the app can show an anchor's fee before the interactive flow (#1402)."""
import logging
import tomllib
import time
from decimal import Decimal, InvalidOperation
from typing import Any, Optional

import httpx

from src.core.config import settings

logger = logging.getLogger("anchor.info")

INFO_TTL_SECONDS = 300
_INFO_CACHE: dict[str, tuple[float, dict[str, Any]]] = {}


class AnchorRateError(Exception):
    def __init__(self, message: str, status_code: int):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def _decimal(value: Any) -> Optional[Decimal]:
    if value is None:
        return None
    try:
        return Decimal(str(value))
    except InvalidOperation:
        return None


def _text(value: Optional[Decimal]) -> Optional[str]:
    return None if value is None else format(value.normalize(), "f")


class AnchorInfoService:
    def __init__(self, http: Optional[httpx.AsyncClient] = None, home_domain: Optional[str] = None):
        self._http = http
        self.home_domain = home_domain or settings.ANCHOR_HOME_DOMAIN or "testanchor.stellar.org"

    async def _get(self, url: str, **kwargs: Any) -> httpx.Response:
        client = self._http or httpx.AsyncClient(timeout=5.0)
        try:
            return await client.get(url, **kwargs)
        finally:
            if self._http is None:
                await client.aclose()

    async def _transfer_server(self) -> str:
        response = await self._get(f"https://{self.home_domain}/.well-known/stellar.toml")
        response.raise_for_status()
        server = tomllib.loads(response.text).get("TRANSFER_SERVER_SEP0024")
        if not server:
            raise AnchorRateError("The anchor does not support SEP-24", 502)
        return str(server).rstrip("/")

    async def _info(self, server: str) -> dict[str, Any]:
        cached = _INFO_CACHE.get(server)
        if cached and time.monotonic() - cached[0] < INFO_TTL_SECONDS:
            return cached[1]
        response = await self._get(f"{server}/info")
        response.raise_for_status()
        info = response.json()
        _INFO_CACHE[server] = (time.monotonic(), info)
        return info

    async def quote(self, asset_code: str, operation: str, amount: Optional[str] = None) -> dict[str, Any]:
        if operation not in ("deposit", "withdraw"):
            raise AnchorRateError("operation must be deposit or withdraw", 422)
        requested = _decimal(amount) if amount is not None else None
        if amount is not None and (requested is None or requested <= 0):
            raise AnchorRateError("amount must be a positive number", 422)

        try:
            server = await self._transfer_server()
            info = await self._info(server)
            asset = (info.get(operation) or {}).get(asset_code)
            if not asset or asset.get("enabled") is False:
                raise AnchorRateError(f"{asset_code} cannot be used for {operation} with this anchor", 404)

            fee_fixed = _decimal(asset.get("fee_fixed"))
            fee_percent = _decimal(asset.get("fee_percent"))
            fee_minimum = _decimal(asset.get("fee_minimum"))
            fee_total: Optional[Decimal] = None

            if requested is not None:
                fee_endpoint_enabled = bool((info.get("fee") or {}).get("enabled"))
                if fee_endpoint_enabled:
                    response = await self._get(
                        f"{server}/fee",
                        params={"operation": operation, "asset_code": asset_code, "amount": str(requested)},
                    )
                    if response.status_code == 200:
                        fee_total = _decimal(response.json().get("fee"))
                if fee_total is None:
                    fee_total = (fee_fixed or Decimal(0)) + requested * (fee_percent or Decimal(0)) / Decimal(100)
                    if fee_minimum is not None:
                        fee_total = max(fee_total, fee_minimum)

            return {
                "asset_code": asset_code,
                "operation": operation,
                "enabled": True,
                "fee_total": _text(fee_total),
                "fee_fixed": _text(fee_fixed),
                "fee_percent": _text(fee_percent),
                "min_amount": _text(_decimal(asset.get("min_amount"))),
                "max_amount": _text(_decimal(asset.get("max_amount"))),
            }
        except AnchorRateError:
            raise
        except (httpx.HTTPError, ValueError, tomllib.TOMLDecodeError) as error:
            logger.warning("Anchor info lookup failed for %s: %s", self.home_domain, error)
            raise AnchorRateError("The anchor is unavailable right now", 502)
