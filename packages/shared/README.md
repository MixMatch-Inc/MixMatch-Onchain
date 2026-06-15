# @mixmatch/shared

Shared TypeScript types and validation schemas used by `apps/api` and `apps/web`.

## Contents

- `src/types/auth.ts` — shared authentication types (`AuthUser`, `RegisterInput`, `LoginInput`, `AuthTokenResponse`)
- `src/validation/auth.schema.ts` — `zod` schemas for registration and login payloads

## Scripts

- `pnpm build` — compile to `dist/`
- `pnpm test` — run unit tests with Vitest
- `pnpm lint` — run ESLint
- `pnpm typecheck` — type-check without emitting

Keep this package limited to genuinely shared concerns. Business logic belongs in the owning app/module.
