# Auth Error Handling

## Strategy

The API uses a consistent error response format across all endpoints. Every error
is rendered by the central `errorMiddleware` as a JSON object with an `error`
key containing a machine-readable `code` and a human-readable `message`.

```
{ "error": { "code": "UNAUTHORIZED", "message": "Invalid or expired token" } }
```

### Error hierarchy

All expected errors extend `AppError`, a base class defined in
`apps/api/src/shared/errors/AppError.ts`. Throwing an `AppError` subclass
automatically produces the correct HTTP status code and error code by the time
the response reaches the client. Unhandled (unexpected) errors fall through to a
generic `500 INTERNAL_SERVER_ERROR`.

## Error code reference

| HTTP Status | Code                     | Meaning                            |
|-------------|--------------------------|------------------------------------|
| 400         | `VALIDATION_ERROR`       | Request body failed schema checks  |
| 401         | `UNAUTHORIZED`           | Missing or invalid credentials     |
| 401         | `INVALID_REFRESH_TOKEN`  | Refresh token is invalid/expired   |
| 403         | `FORBIDDEN`              | Insufficient permissions           |
| 404         | `NOT_FOUND`              | Resource does not exist            |
| 404         | `SESSION_NOT_FOUND`      | Session not found or already ended |
| 409         | `CONFLICT`               | Resource already exists (e.g. email in use) |
| 423         | `ACCOUNT_LOCKED`         | Account is temporarily locked      |
| 429         | `RATE_LIMITED`           | Too many requests                  |
| 500         | `INTERNAL_SERVER_ERROR`  | Unexpected server error            |

## Integrating error handling in clients

Consume error responses uniformly by checking `error.code` rather than the HTTP
status alone. Example (TypeScript / fetch):

```typescript
interface ApiError {
  error: { code: string; message: string };
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = (await response.json()) as ApiError;
    // Route based on error.code
    switch (body.error.code) {
      case 'UNAUTHORIZED':
      case 'INVALID_REFRESH_TOKEN':
        // Redirect to login
        break;
      case 'FORBIDDEN':
        // Show permission denied UI
        break;
      case 'RATE_LIMITED':
        // Implement exponential backoff
        break;
      default:
        // Show generic error toast
    }
    throw new Error(body.error.message);
  }
  return response.json() as Promise<T>;
}
```

### Best practices

- **Never** parse the `message` field in client logic — it is intended for
  display only and may be localised in the future. Always use `code`.
- Implement exponential backoff when receiving `RATE_LIMITED` (429).
- Redirect to the login page on `UNAUTHORIZED` or `INVALID_REFRESH_TOKEN`.
- Log `INTERNAL_SERVER_ERROR` occurrences on the client to aid debugging.
