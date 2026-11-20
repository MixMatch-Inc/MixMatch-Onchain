# Test File Renaming Guide

> Issue #1473 – plan for renaming contributor-named test files to module-based names.

## Problem

The following files in `apps/api-py/tests/` are named after contributors rather
than the behaviour or module they test:

| Current name | Should become | Reason |
|---|---|---|
| `test_devdeen213.py` | `test_auth_validation.py` | Tests auth/validation logic |
| `test_hasidasbuilds.py` | `test_payment_flow.py` | Tests payment flows |
| `test_heisenbug404.py` | `test_edge_cases.py` | Tests edge cases and error paths |
| `test_rougepandaq.py` | `test_escrow_service.py` | Tests escrow service |

## Duplicates to Consolidate

| Duplicate pair | Keep | Remove |
|---|---|---|
| `test_payments_service.py` vs `test_payments_service_spec.py` | `test_payments_service.py` | `test_payments_service_spec.py` |

## Procedure for Each File

1. Read the existing file and confirm what it actually tests.
2. Create a new file with the correct name and move the tests.
3. Update any `conftest.py` references.
4. Delete the old file in the same commit.
5. Confirm coverage numbers do not drop.

## Naming Convention

```
test_<module>_<behaviour>.py

Examples:
  test_payments_normalize.py
  test_auth_refresh_token.py
  test_escrow_state_machine.py
  test_stellar_client_retry.py
```

## Status

| File | Renamed | PR |
|---|---|---|
| `test_devdeen213.py` | ❌ Pending | — |
| `test_hasidasbuilds.py` | ❌ Pending | — |
| `test_heisenbug404.py` | ❌ Pending | — |
| `test_rougepandaq.py` | ❌ Pending | — |
