# Contributor Guide

## Coding standards

- TypeScript strict mode is enabled across the monorepo (`tsconfig.base.json`).
- ESLint (flat config, `eslint.config.base.mjs`) and Prettier are the source
  of truth for linting and formatting. Run `pnpm lint` and `pnpm format`
  before committing.
- Avoid `any`; prefer explicit types and interfaces.
- Keep modules self-contained: a module owns its controllers/services/
  validators/repositories/types/tests. Shared infrastructure goes in
  `shared/` (api) or `packages/shared` (cross-app).

## Project structure

```
apps/
  api/      Express modular monolith (auth + users modules)
  web/      Next.js authentication frontend
  mobile/   Expo/React Native foundation
packages/
  shared/   Shared types & validation schemas
  stellar/  Placeholder scaffold for future Stellar integration
docs/       Architecture, environment, and testing documentation
```

See each package's `README.md` for details specific to that package.

## Development workflow

1. Install dependencies: `pnpm install`
2. Copy `.env.example` → `.env` in each app you're running
3. Start everything: `pnpm dev` (or `pnpm --filter <package> dev`)
4. Run checks before opening a PR:
   ```bash
   pnpm lint
   pnpm typecheck
   pnpm test
   pnpm build
   ```

## Adding a new module (API)

Create a new directory under `apps/api/src/modules/<name>/` following the
`auth` module's layout (controller, service, repository, validators, types,
routes, tests). Register its router in `src/app.ts`. Do not put business
logic in `src/shared/`.

## Contribution expectations

- Keep changes scoped — this is a hackathon starter kit, not a place for
  speculative features.
- Every new module needs tests that run without external services where
  reasonably possible (see `InMemoryUserRepository` in `apps/api` for the
  pattern).
- Pull requests must pass all relevant GitHub Actions workflows
  (`.github/workflows/`).
