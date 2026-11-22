"""SEP-24 fee lookup (#1402). The anchor is simulated with httpx.MockTransport."""
import httpx
import pytest
from httpx import ASGITransport, AsyncClient

from src.main import app
from src.modules.payments import anchor_info
from src.modules.payments.anchor_info import AnchorInfoService, AnchorRateError
from src.modules.payments.anchor_router import get_anchor_info_service

TOML = 'TRANSFER_SERVER_SEP0024 = "https://anchor.test/sep24"\n'
INFO = {
    "deposit": {"SRT": {"enabled": True, "fee_fixed": 1, "fee_percent": 0.5, "min_amount": 10, "max_amount": 1000}},
    "withdraw": {"SRT": {"enabled": False}},
    "fee": {"enabled": False},
}


@pytest.fixture(autouse=True)
def clear_cache():
    anchor_info._INFO_CACHE.clear()


def service(handler) -> AnchorInfoService:
    return AnchorInfoService(http=httpx.AsyncClient(transport=httpx.MockTransport(handler)), home_domain="anchor.test")


def anchor(info=INFO, fee=None):
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("stellar.toml"):
            return httpx.Response(200, text=TOML)
        if request.url.path.endswith("/info"):
            return httpx.Response(200, json=info)
        if request.url.path.endswith("/fee"):
            return httpx.Response(200, json={"fee": fee})
        return httpx.Response(404)

    return handler


async def test_fee_is_computed_from_info():
    quote = await service(anchor()).quote("SRT", "deposit", "100")
    assert quote["fee_total"] == "1.5"
    assert quote["fee_fixed"] == "1" and quote["fee_percent"] == "0.5"
    assert quote["min_amount"] == "10" and quote["max_amount"] == "1000"


async def test_no_amount_returns_the_fee_schedule_only():
    quote = await service(anchor()).quote("SRT", "deposit")
    assert quote["fee_total"] is None and quote["fee_fixed"] == "1"


async def test_fee_endpoint_is_used_when_the_anchor_advertises_it():
    info = {**INFO, "fee": {"enabled": True}}
    quote = await service(anchor(info, fee=7.25)).quote("SRT", "deposit", "100")
    assert quote["fee_total"] == "7.25"


async def test_disabled_or_unknown_asset_is_404():
    with pytest.raises(AnchorRateError) as disabled:
        await service(anchor()).quote("SRT", "withdraw", "5")
    assert disabled.value.status_code == 404
    with pytest.raises(AnchorRateError) as unknown:
        await service(anchor()).quote("ZZZ", "deposit")
    assert unknown.value.status_code == 404


async def test_invalid_amount_is_422():
    with pytest.raises(AnchorRateError) as error:
        await service(anchor()).quote("SRT", "deposit", "-3")
    assert error.value.status_code == 422


async def test_anchor_outage_is_502():
    def down(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("boom")

    with pytest.raises(AnchorRateError) as error:
        await service(down).quote("SRT", "deposit", "5")
    assert error.value.status_code == 502


async def test_rates_endpoint():
    app.dependency_overrides[get_anchor_info_service] = lambda: service(anchor())
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            ok = await client.get("/api/anchor/rates", params={"asset_code": "SRT", "operation": "deposit", "amount": "100"})
            assert ok.status_code == 200 and ok.json()["fee_total"] == "1.5"
            bad = await client.get("/api/anchor/rates", params={"asset_code": "SRT", "operation": "sell"})
            assert bad.status_code == 422
    finally:
        app.dependency_overrides.pop(get_anchor_info_service, None)
