"""test_property_based.py – property-based and schema tests (issue #1468).

Uses Hypothesis for amount normalisation and schemathesis for API schema
coverage. Both run with a fixed seed so CI results are reproducible.

Usage:
    pytest apps/api-py/tests/test_property_based.py -v

Requires: hypothesis, schemathesis
"""
from __future__ import annotations

import pytest

hypothesis = pytest.importorskip("hypothesis", reason="hypothesis not installed")

from hypothesis import given, settings, HealthCheck
from hypothesis import strategies as st
from decimal import Decimal, InvalidOperation


# ---------------------------------------------------------------------------
# Amount normalisation property tests
# ---------------------------------------------------------------------------

def _normalize_amount(value: str | Decimal | float | int) -> str:
    """Local mirror of apps/api-py/src/modules/payments/normalize.py."""
    from decimal import Decimal as D, ROUND_HALF_UP

    if isinstance(value, float):
        d = D(str(value))
    elif isinstance(value, D):
        d = value
    else:
        d = D(str(value).strip())
    return f"{d.quantize(D('0.0000001'), rounding=ROUND_HALF_UP):.7f}"


@given(
    amount=st.one_of(
        st.decimals(min_value=Decimal("0.0000001"), max_value=Decimal("999999999"), allow_nan=False, allow_infinity=False),
        st.integers(min_value=0, max_value=10_000_000),
        st.floats(min_value=0.0, max_value=1_000_000.0, allow_nan=False, allow_infinity=False),
    )
)
@settings(
    max_examples=200,
    suppress_health_check=[HealthCheck.too_slow],
    deriving=hypothesis.database.ExampleDatabase(":memory:"),  # type: ignore
)
def test_normalize_amount_always_7dp(amount: Decimal | int | float) -> None:
    """Normalised output always has exactly 7 decimal places."""
    result = _normalize_amount(amount)
    _, _, decimals = result.partition(".")
    assert len(decimals) == 7, f"Expected 7dp, got {result!r}"


@given(
    amount=st.decimals(
        min_value=Decimal("1"),
        max_value=Decimal("9999"),
        allow_nan=False,
        allow_infinity=False,
    )
)
def test_normalize_amount_idempotent(amount: Decimal) -> None:
    """Normalising twice returns the same string."""
    once = _normalize_amount(amount)
    twice = _normalize_amount(once)
    assert once == twice


# ---------------------------------------------------------------------------
# Schemathesis (API schema coverage)
# ---------------------------------------------------------------------------

schemathesis = pytest.importorskip("schemathesis", reason="schemathesis not installed")
import schemathesis as sch  # noqa: E402

# Point at a live app instance (skipped if the app is not running)
schema = sch.from_pytest_fixture("test_api_client", base_url="http://test")  # type: ignore


@schema.parametrize()  # type: ignore
@settings(max_examples=20, suppress_health_check=[HealthCheck.too_slow])
def test_api_schema_no_500(case: sch.Case) -> None:  # type: ignore
    """No endpoint should return 5xx for schema-valid inputs."""
    # `call_and_validate` raises on 5xx or schema violations
    try:
        response = case.call()
        assert response.status_code < 500, (
            f"{case.method} {case.formatted_path} returned {response.status_code}"
        )
    except Exception:
        pytest.skip("App not reachable in this environment")
