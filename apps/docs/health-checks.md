# Health Checks

## Scope

The health check endpoint provides a lightweight, unauthenticated liveness probe
for load balancers, container orchestrators, and monitoring systems. It confirms
the API process is running and able to accept HTTP requests.

## Contract

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

### Error Responses

The health endpoint is designed to be maximally available. It does not perform
database connectivity checks, external service pings, or dependency validation.
A 200 response confirms only that the Express process is running.

| Status | Condition |
|--------|-----------|
| 200    | API process is alive and accepting requests |

## TypeScript Contract

```typescript
interface HealthResponse {
  status: 'ok';
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
```

The health route is mounted directly on the Express app before any middleware
that might fail (auth, rate limiting, error handling). This ensures the probe
always reaches a handler as long as the process is alive.

## Integration Points

| Component | Role |
|-----------|------|
| `apps/api/src/app.ts` | Mounts `GET /health` route |
| Load balancer / k8s | Polls `/health` for liveness |
| Monitoring | Alerts on non-200 responses |

## Edge Cases

| Scenario | Behaviour |
|----------|-----------|
| Database is down | 200 (health check does not verify DB) |
| JWT_SECRET not set | 200 (health check does not verify auth config) |
| All other routes fail | 200 (health check is independent of error middleware) |
| Request includes auth header | 200 (auth is not validated on this route) |
| HEAD request | Express serves GET handler for HEAD automatically |

## Testing

See `apps/api/src/health.test.ts` — verifies 200 response with `{ status: 'ok' }` body.

## Design Decisions

- **No dependency checks**: The health endpoint intentionally avoids checking
  database connectivity, external APIs, or message queues. This keeps it fast
  and prevents cascading failures where a DB outage also takes down the
  liveness probe.
- **Minimal response**: The `{ status: 'ok' }` shape is standard for
  Kubernetes liveness/readiness probes and load balancer health checks.
- **Error middleware not involved**: The route is registered before the error
  middleware, so it cannot be affected by error-handling bugs.
