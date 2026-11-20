# Redis and ClickHouse are not provisioned

Status: accepted

`docker-compose.yml` and the README used to provision Redis ("session storage and pub/sub") and
ClickHouse ("event logging"), but nothing under `apps/api-py/src` connects to either and
`pyproject.toml` has no client for them.

**Decision:** remove both until a feature needs them, so the local stack and the docs only describe
infrastructure the code uses.

Consequences:

- Rate limiting stays in-process (`slowapi`). With several uvicorn workers each worker counts
  separately, so limits are per worker. Move it to Redis when exact global limits matter.
- SSE fan-out is per process.
- When one of these is needed, add the service to `docker-compose.yml`, the client dependency to
  `pyproject.toml`, and its settings to `apps/api-py/src/core/config.py` in the same change.
