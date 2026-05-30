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

Location:
packages/types/auth.ts