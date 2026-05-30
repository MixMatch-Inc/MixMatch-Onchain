# Registration Flow

1. Client submits registration request

POST /auth/register

2. API validates request payload

3. User record is created

4. Starter session is generated

5. Auth token returned

Response:

{
  "user": {},
  "accessToken": ""
}