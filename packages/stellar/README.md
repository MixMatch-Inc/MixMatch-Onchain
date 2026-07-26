# @mixmatch/stellar

Core Stellar account and wallet infrastructure for the platform: Horizon/Soroban
client configuration, account generation/loading, a non-custodial wallet
abstraction, and testnet Friendbot funding.

## Contents

- `src/types/index.ts` — `StellarNetwork`, `StellarAccountRef`
- `src/interfaces/index.ts` — `StellarClient`
- `src/config.ts` — `loadStellarConfig()`, reads `STELLAR_NETWORK` (`testnet` | `public`)
  and optional `RPC_URL`/`HORIZON_URL` overrides, matching `apps/api`'s
  `env.stellarNetwork`/`env.rpcUrl` (see `docs/ENVIRONMENT.md` and
  `apps/docs/env-integration.md`)
- `src/client.ts` — `createStellarClient()` / `DefaultStellarClient`, wrapping a
  configured `Horizon.Server` and Soroban `rpc.Server`
- `src/wallet.ts` — `Wallet` interface and `KeypairWallet`, the wallet custody
  model (see doc comment in the file for details)
- `src/account.ts` — `generateStellarAccount()`, `loadStellarAccount()`
- `src/friendbot.ts` — `fundTestnetAccount()`, testnet-only Friendbot funding

## Wallet custody model

A "wallet" is a thin, in-memory wrapper around a Stellar `Keypair`
(`KeypairWallet`). This package never persists, encrypts, or transmits a
secret key — it only holds one in memory for the lifetime of the object.
Callers decide how (or whether) to persist a secret key; the `Wallet`
interface lets a future custodial signer be swapped in without changing call
sites. See the doc comment at the top of `src/wallet.ts` for the full
rationale.

## Environment variables

| Variable          | Required | Default                                    | Description                        |
| ----------------- | -------- | ------------------------------------------- | ----------------------------------- |
| `STELLAR_NETWORK` | No       | `testnet`                                   | `testnet` or `public`               |
| `RPC_URL`         | No       | network default Soroban RPC endpoint        | Soroban RPC endpoint override       |
| `HORIZON_URL`     | No       | network default Horizon endpoint            | Horizon endpoint override           |

## Scripts

- `pnpm build` — compile to `dist/`
- `pnpm test` — run unit tests (fast, no network access)
- `pnpm lint` — run ESLint
- `pnpm typecheck` — type-check without emitting

## Integration tests

`src/testnet.integration.test.ts` makes live calls to Stellar testnet
(Friendbot + Horizon). It's skipped by default so `pnpm test` stays fast and
independent of testnet availability. Run it explicitly with:

```bash
RUN_STELLAR_INTEGRATION_TESTS=true pnpm --filter @mixmatch/stellar test
```
