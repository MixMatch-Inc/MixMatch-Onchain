# @mixmatch/stellar

Scaffold package for the future Stellar integration layer.

**This package currently contains no blockchain functionality.** It exists to
establish the package boundary, naming conventions, and build setup so that
wallet, account, transaction, and payment functionality can be added later
without restructuring the monorepo.

## Contents

- `src/types/index.ts` — placeholder types (e.g. `StellarNetwork`, `StellarAccountRef`)
- `src/interfaces/index.ts` — placeholder interfaces (e.g. `StellarClient`)

## Scripts

- `pnpm build` — compile to `dist/`
- `pnpm test` — run the scaffold smoke test
- `pnpm lint` — run ESLint
- `pnpm typecheck` — type-check without emitting
