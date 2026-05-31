# Registration Flow

1. Client submits a registration request to the API:

POST /api/v1/auth/register

Request body:
```json
{
  "email": "user@example.com",
  "password": "password123",
  "role": "DJ"
}
```

2. API validates the request payload.
3. A new user record is created in the starter's in-memory repository.
4. A session bootstrap payload is generated.
5. The API returns a typed response envelope.

Response:
```json
{
  "success": true,
  "data": {
    "token": "<jwt>",
    "user": {
      "id": "1",
      "name": "user",
      "email": "user@example.com",
      "role": "DJ",
      "onboardingCompleted": false,
      "createdAt": "<timestamp>",
      "updatedAt": "<timestamp>"
    },
    "session": {
      "userId": "1",
      "role": "DJ",
      "onboardingCompleted": false,
      "issuedAt": "<timestamp>"
    }
  }
}
```

## Shared contract

This flow is defined by the shared contract in `packages/types/src/auth.ts`.
The API returns the same typed envelope used by web and mobile clients.
