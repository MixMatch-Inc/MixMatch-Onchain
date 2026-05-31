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

5. Auth token returned in the shared response envelope

Response:

```json
{
  "success": true,
  "data": {
    "token": "...",
    "user": {
      "id": "...",
      "name": "...",
      "email": "...",
      "role": "DJ",
      "onboardingCompleted": false,
      "createdAt": "...",
      "updatedAt": "..."
    },
    "session": {
      "userId": "...",
      "role": "DJ",
      "onboardingCompleted": false,
      "issuedAt": "..."
    }
  }
}
```
