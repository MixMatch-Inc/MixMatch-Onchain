# Registration Flow

1. Client submits registration request

POST /api/v1/auth/register

2. API validates request payload

3. User record is created

4. Starter session is generated

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