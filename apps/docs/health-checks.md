# Health Checks

## Scope

The health check endpoints provide lightweight, unauthenticated probes for load
balancers, container orchestrators, and monitoring systems. The basic endpoint
confirms the API process is running; the detailed endpoint validates database
connectivity and returns component-level status.

## Endpoints

| Endpoint | Purpose | Auth Required |
|----------|---------|---------------|
| `GET /health` | Liveness probe | No |
| `GET /health/detailed` | Readiness probe with component checks | No |

## Contract — `GET /health`

### Request

```
GET /health
```

No authentication required. No request body.

### Success Response

```
HTTP 200
{
  "status": "ok"
}
```

### TypeScript Contract

```typescript
interface HealthResponse {
  status: 'ok';
}
```

## Contract — `GET /health/detailed`

### Request

```
GET /health/detailed
```

No authentication required. No request body.

### Success Response (database healthy)

```
HTTP 200
{
  "status": "ok",
  "timestamp": "2026-07-26T12:00:00.000Z",
  "components": {
    "database": {
      "status": "ok",
      "latencyMs": 2
    }
  }
}
```

### Degraded Response (database unreachable)

```
HTTP 503
{
  "status": "degraded",
  "timestamp": "2026-07-26T12:00:00.000Z",
  "components": {
    "database": {
      "status": "error",
      "error": "Connection refused"
    }
  }
}
```

### Error Response

```
HTTP 500
{
  "status": "error",
  "message": "Health check failed"
}
```

### TypeScript Contract

```typescript
interface DetailedHealthResponse {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  components: {
    database: {
      status: 'ok' | 'error';
      latencyMs?: number;
      error?: string;
    };
  };
}
```

## Architecture

```
Client                          Express API
  │                                  │
  │  GET /health                     │
  │ ───────────────────────────────► │
  │                                  │
  │  200 { status: 'ok' }           │
  │ ◄─────────────────────────────── │
  │                                  │
  │  GET /health/detailed            │
  │ ───────────────────────────────► │
  │                                  │
  │  200/503 { status, components }  │
  │ ◄─────────────────────────────── │
```

## Integration Points

| Component | Role |
|-----------|------|
| `apps/api/src/app.ts` | Mounts both health routes |
| `apps/api/src/health.test.ts` | Regression tests for both endpoints |
| Load balancer / k8s | Polls `/health` for liveness |
| Monitoring | Polls `/health/detailed` for readiness, alerts on degraded status |

## Edge Cases

| Scenario | `/health` | `/health/detailed` |
|----------|-----------|-------------------|
| Database is down | 200 (no DB check) | 503 with `status: 'degraded'` |
| JWT_SECRET not set | 200 | 200 or 503 (depends on DB) |
| All other routes fail | 200 | 200 or 503 |
| Request includes auth header | 200 | 200 or 503 |
| HEAD request | 200 (Express serves GET for HEAD) | 200 or 503 |

## Testing

### Test coverage

The test suite in `apps/api/src/health.test.ts` covers:

- Basic 200 response with `{ status: 'ok' }`
- JSON content-type header
- Status field presence and type
- HTTP method restrictions (POST, PUT, DELETE return 404)
- HEAD request handling
- Rapid sequential requests (10 requests)
- Concurrent requests (3 parallel)
- CORS header presence
- Response time under 1 second
- Detailed endpoint component structure
- Detailed endpoint status (ok or degraded)
- ISO timestamp format

### Running tests

```bash
cd apps/api && npx vitest run --grep "health"
```

## Design Decisions

- **Two endpoints**: `/health` is a fast liveness probe; `/health/detailed` is a
  slower readiness probe that validates dependencies.
- **`GET /health` has no dependency checks**: Keeps it fast and prevents
  cascading failures where a DB outage takes down the liveness probe.
- **`GET /health/detailed` returns 503 on degradation**: Load balancers and
  orchestrators interpret 503 as "stop sending traffic here."
- **5-second database timeout**: Prevents slow DB queries from blocking the
  health response indefinitely.
- **Error middleware not involved**: Health routes are registered before the
  error middleware, so they are unaffected by error-handling bugs.
