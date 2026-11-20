# Package and App README Reference

> Issue #1482 – captures setup, env vars, scripts and structure for each app
> and package until individual README files are updated in place.

## apps/web

**Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS  
**Port:** 3000  
**Key env vars:** `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_STELLAR_NETWORK`  
**Scripts:**
```bash
pnpm dev      # development server
pnpm build    # production build
pnpm test     # unit tests (vitest)
```

## apps/mobile

**Stack:** Expo 51, React Native, TypeScript  
**Key env vars:** `EXPO_PUBLIC_API_URL`  
**Scripts:**
```bash
npx expo start          # start Metro bundler
npx expo run:android    # Android emulator
npx expo run:ios        # iOS simulator
pnpm test               # Jest unit tests
```

## apps/api-py

**Stack:** FastAPI 0.111, SQLAlchemy 2 (async), Pydantic v2, Python 3.12  
**Port:** 8000  
**Key env vars:** `DATABASE_URL`, `JWT_SECRET`, `VAULT_ADDR`, `WALLET_ENCRYPTION_KEY`, `STELLAR_NETWORK`, `HORIZON_URL`  
**Scripts:**
```bash
uvicorn src.main:app --reload   # development
pytest apps/api-py/tests/       # unit + integration tests
```

## packages/shared

Shared TypeScript types derived from the OpenAPI schema. Exports: auth, payments, escrow, anchor, users, taste.  
`import { UserSchema, TasteProfileSchema } from '@mixmatch/shared'`

## packages/stellar

Stellar/Soroban helpers: path payments, escrow, multisig, SEP-1, friendbot.

## packages/kms

Vault Transit client, AppRole auth, circuit breaker, key versioning.

## packages/eslint-config

Shared ESLint configurations: `base`, `next`, `react-internal`.

## packages/typescript-config

Shared `tsconfig.json` bases.
