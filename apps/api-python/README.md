# FastAPI health probes

This checkout has no existing FastAPI application. This minimal service covers
issue #1078 only; it does not migrate the NestJS application or its business routes.

Requires Python 3.10+. From `apps/api-python`:

```sh
python -m venv .venv
# Activate .venv using your shell's activation script.
python -m pip install -r requirements-dev.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Export `DATABASE_URL` using the same PostgreSQL URL as the NestJS service (see
the root `.env.example`). The service reads the process environment; it does not
automatically load `.env` files. Start PostgreSQL with the root Docker Compose
configuration when testing against a real database.

- `GET /healthz`: returns HTTP 200 with `{"status":"ok"}` without accessing the DB.
- `GET /readyz`: runs `SELECT 1`; returns HTTP 200 with `{"status":"ok"}` on success,
  or HTTP 503 with `{"status":"unavailable"}` when configuration is missing or
  the database check fails. Database error details are never returned.

Both endpoints are unauthenticated. Readiness opens and closes a connection per
request, with a 3-second connection timeout and a 3-second statement timeout.
Configure orchestration probe timeouts to allow for both phases; these are not
a single total request deadline.

Run the service's complete test suite:

```sh
python -m pytest -q
```

Tests mock the PostgreSQL driver and do not require a running database.
