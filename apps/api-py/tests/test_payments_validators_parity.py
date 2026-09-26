import pytest
from pydantic import ValidationError
from src.modules.payments.validators import SendPaymentValidator, HistoryQueryValidator

def test_amount_non_numeric_and_negative():
    """Issue #1163: Parity with payments.validators.spec.ts for amount parsing."""
    with pytest.raises(ValidationError):
        SendPaymentValidator(
            destination_public_key="GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
            amount="not_a_number"
        )

    with pytest.raises(ValidationError):
        SendPaymentValidator(
            destination_public_key="GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
            amount="-50.00"
        )

    with pytest.raises(ValidationError):
        SendPaymentValidator(
            destination_public_key="GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
            amount="0"
        )

def test_stellar_destination_address_validation():
    """Issue #1163: Address length and character validation."""
    # Address must start with G and be 56 characters
    with pytest.raises(ValidationError):
        SendPaymentValidator(
            destination_public_key="MAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
            amount="10.00"
        )

    with pytest.raises(ValidationError):
        SendPaymentValidator(
            destination_public_key="GSHORT",
            amount="10.00"
        )

def test_asset_code_length_and_characters():
    """Issue #1163: Asset code validation rules."""
    with pytest.raises(ValidationError):
        SendPaymentValidator(
            destination_public_key="GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
            amount="10.00",
            asset_code="TOOLONGLONGASSETCODE123",
            asset_issuer="GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
        )

def test_history_pagination_validator_boundaries():
    """Issue #1163: Limit boundaries (1 to 100) and page boundaries (>=1)."""
    with pytest.raises(ValidationError):
        HistoryQueryValidator(limit=101)

    with pytest.raises(ValidationError):
        HistoryQueryValidator(limit=0)

    with pytest.raises(ValidationError):
        HistoryQueryValidator(page=0)

    # Valid limits
    valid = HistoryQueryValidator(limit=100, page=1)
    assert valid.limit == 100
    assert valid.page == 1
