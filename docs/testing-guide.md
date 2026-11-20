# Testing Guide

> Issue #1474 – covers every test suite, flake tracking and JUnit reporting.

## Suites and How to Run Them

### Python unit tests (api-py)

```bash
cd apps/api-py
pytest tests/ -v --durations=10

# With JUnit XML output (required for CI artifact upload)
pytest tests/ --junitxml=reports/junit.xml
```

### TypeScript unit tests

```bash
# Individual package
pnpm --filter <package-name> test

# All packages
pnpm turbo test
```

### Mobile unit tests

```bash
pnpm --filter mobile test
```

### Web unit tests

```bash
pnpm --filter web test
```

### Load tests

```bash
locust -f loadtests/locustfile.py --headless -u 50 -r 5 --run-time 60s
```

### End-to-end tests (Playwright)

```bash
pnpm --filter web exec playwright test
```

## CI Configuration

All test jobs upload JUnit XML reports as CI artifacts:

```yaml
- name: Upload test results
  uses: actions/upload-artifact@v4
  with:
    name: test-results
    path: reports/junit.xml
  if: always()
```

## Flake Tracking

1. Any test that fails ≥2 times in 5 consecutive runs is labelled **flaky**.
2. Flaky tests are quarantined with `@pytest.mark.xfail(strict=False, reason="flaky")`
   until the root cause is fixed.
3. The slowest 10 tests per run are logged by `--durations=10`.
4. Track flakes in a GitHub issue labelled `flaky-test`.

## Writing New Tests

### Python

```python
import pytest
from httpx import AsyncClient

@pytest.mark.anyio
async def test_example(test_api_client: AsyncClient, auth_token_factory):
    token = auth_token_factory(user_id="u1", role="USER")
    resp = await test_api_client.get("/api/health", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
```

### TypeScript

Use Vitest + Testing Library. Place test files in `__tests__/` or colocate as `*.test.ts`.
