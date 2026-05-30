# Auth Contracts

Shared between frontend and API.

## RegisterRequest

{
  email: string;
  password: string;
}

## RegisterResponse

{
  user: User;
  accessToken: string;
}