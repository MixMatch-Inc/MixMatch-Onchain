import pytest
from fastapi import HTTPException
from src.modules.payments.validators import (
    parse_history_query,
    SendPaymentValidator,
    EstablishTrustlineValidator,
    MAX_HISTORY_LIMIT,
)

def test_parse_history_query_and_boundaries():
    """Issue #1126: Port payments.validators.ts to Pydantic models & check MAX_HISTORY_LIMIT."""
    # Default limit
    page, limit = parse_history_query({})
    assert page == 1
    assert limit == 20

    # Custom limit capped at 100
    page, limit = parse_history_query({"page": "2", "limit": "150"})
    assert page == 2
    assert limit == MAX_HISTORY_LIMIT

    # Invalid integers raise 400
    with pytest.raises(HTTPException) as exc:
        parse_history_query({"page": "-1"})
    assert exc.value.status_code == 400

def test_send_payment_validator():
    valid_key = "G" + "A" * 55
    # Valid native payment
    p = SendPaymentValidator(destination_public_key=valid_key, amount="10.5")
    assert p.amount == "10.5"

    # Asset code and issuer must be provided together
    with pytest.raises(ValueError, match="must be provided together"):
        SendPaymentValidator(
            destination_public_key=valid_key,
            amount="10.5",
            asset_code="USDC",
            # missing asset_issuer
        )

    # Invalid public key length / prefix
    with pytest.raises(ValueError, match="Enter a valid Stellar address"):
        SendPaymentValidator(destination_public_key="invalid_key", amount="10.5")

    # Invalid amount decimal precision (> 7 digits)
    with pytest.raises(ValueError, match="up to 7 decimal places"):
        SendPaymentValidator(destination_public_key=valid_key, amount="10.12345678")
