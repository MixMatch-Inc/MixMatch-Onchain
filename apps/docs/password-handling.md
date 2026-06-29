# Password Handling

## Password Policy

The API enforces the following password rules:

| Context   | Rule                          | Schema                                     |
|-----------|-------------------------------|--------------------------------------------|
| Register  | Minimum 8 characters          | `registerSchema.password` (`min(8)`)       |
| Login     | Non-empty string              | `loginSchema.password` (`min(1)`)          |

Password validation is intentionally asymmetric between registration and login
to avoid leaking information about whether an account exists.

### No complexity requirements

The API does **not** enforce character-class rules (uppercase, lowercase, digit,
special character). This follows current best practice
([NIST SP 800-63B](https://pages.nist.gov/800-63-3/sp800-63b.html)), which
recommends a focus on minimum length rather than arbitrary complexity rules
that often lead to predictable patterns (e.g. `Password1!`).

## Edge cases handled

| Input                          | Register | Login | Rationale                                           |
|--------------------------------|----------|-------|-----------------------------------------------------|
| Empty string                   | Rejected | Rejected | `min(8)` / `min(1)` Zod check fails                |
| Single character               | Rejected | Accepted | Meets login `min(1)` requirement                   |
| Exactly 8 characters           | Accepted | Accepted | Boundary of min length for registration            |
| Very long (100 000 chars)      | Rejected | Rejected | Request body parsing limits (HTTP/JSON)            |
| Whitespace-only                | Rejected | Accepted | Register: fails `min(8)`; Login: passes `min(1)`   |
| Leading/trailing whitespace    | Accepted | Accepted | Server does not trim password (security decision)  |
| Unicode / emoji                | Accepted | Accepted | No restriction on character encoding               |
| Special characters (`!@#$%`)   | Accepted | Accepted | No restriction on allowed characters               |

## Security considerations

### Bcrypt hashing

Passwords are hashed using **bcryptjs** with a cost factor of 10 before being
stored. The hash is **never** returned in API responses.

### No user enumeration

Login returns the same `401` error and message regardless of whether the email
exists or the password is wrong. This prevents attackers from enumerating valid
accounts.

### Rate limiting

All auth endpoints are rate-limited (see
[rate-limiting.md](./rate-limiting.md)). Excessive password attempts are
throttled before reaching the application layer.

### Validation at the edge

Input validation uses **Zod** schemas defined in
`packages/shared/src/validation/auth.schema.ts`. These schemas are shared
between the API and the frontend, ensuring consistent validation at every
entry point.

## Integration points

- **Schema definitions**: `packages/shared/src/validation/auth.schema.ts`
- **Schema tests**: `packages/shared/src/__tests__/auth.schema.test.ts`
- **Service layer**: `apps/api/src/modules/auth/auth.service.ts` (hashing, lookup)
- **Endpoint tests**: `apps/api/src/modules/auth/tests/`
- **Frontend forms**: `apps/web/src/app/(auth)/register/page.tsx`, `apps/web/src/app/(auth)/login/page.tsx`
