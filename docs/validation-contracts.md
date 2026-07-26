# Validation Contracts

This document describes the Zod-based validation schemas used across the MixMatch API, how they integrate into the auth module, and how to extend them.

## Schema Definitions

All core Zod schemas live in `packages/shared/src/validation/`.

### `auth.schema.ts`

| Schema | Fields | Constraints |
|--------|--------|-------------|
| `emailSchema` | — | string, trimmed, lowercased, min 1, max 254, valid email format |
| `passwordSchema` | — | string, min 8, max 128 |
| `registerSchema` | `email`, `password` | Uses `emailSchema` + `passwordSchema`. Strict mode (rejects extra fields). |
| `loginSchema` | `email`, `password` | Uses `emailSchema`. Password: string, min 1, max 128. Strict mode. |

### `session.schema.ts`

| Schema | Fields | Constraints |
|--------|--------|-------------|
| `refreshTokenSchema` | `refreshToken` | string, min 1, max 1024. Strict mode. |
| `updateProfileSchema` | `email?`, `name?` | `emailSchema` optional. Name: trimmed, min 1, max 100 optional. Strict mode. |

### `validators.ts`

The `validate()`, `validateOrThrow()`, and `safeParse()` helper functions wrap Zod's `safeParse` and return structured results with `fieldErrors`.

## Integration in the Auth Module

`apps/api/src/modules/auth/auth.validators.ts` provides three parse functions:

- **`parseRegisterInput(input)`** — wraps `registerSchema` via `safeParse`. Throws `ValidationError` on failure.
- **`parseLoginInput(input)`** — wraps `loginSchema` via `safeParse`. Throws `ValidationError` on failure.
- **`parseRefreshInput(input)`** — manual validation (checks object shape, string type, non-empty). Throws `ValidationError` on failure.

These are consumed by `AuthController` which is wired into Express routes in `auth.routes.ts` and `tests/test-app.ts`.

## How to Add a New Validation Schema

1. Define the Zod schema in the appropriate file under `packages/shared/src/validation/`.
2. Export the schema and its inferred type.
3. If needed, create a parse wrapper in `apps/api/src/modules/auth/auth.validators.ts` that throws `ValidationError` on failure.
4. Add tests in `apps/api/src/modules/auth/__tests__/auth-validators.test.ts` for the new schema.
5. Add edge-case tests in `apps/api/src/modules/auth/__tests__/auth-edge-harden.test.ts`.

## Extending for New Modules

The schemas in `packages/shared/src/validation/` are shared across all apps. Add module-specific schemas alongside the existing files or create new schema files in the same directory. Always use strict mode on object schemas to prevent unexpected fields.
