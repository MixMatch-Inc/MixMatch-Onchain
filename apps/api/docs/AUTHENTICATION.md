# Authentication

## Overview

The reset starter uses a contract-first authentication model.

Authentication logic lives in:

- apps/api
- packages/types

No legacy authentication systems are required.

## Shared Contracts

Registration DTOs:
- RegisterRequest
- RegisterResponse

Authentication DTOs:
- LoginRequest
- LoginResponse

Runtime routes:
- `POST /api/v1/auth/register` — create a new account and return token + session bootstrap
- `POST /api/v1/auth/login` — sign in an existing account and return token + session bootstrap

Location:
packages/types/auth.ts