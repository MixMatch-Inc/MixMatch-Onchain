# MixMatch-Onchain

Decentralised social music-matching on Stellar. Users connect Spotify, build a taste profile, and are matched with others who share their sound. Payments and escrow run on Stellar/Soroban.

## Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.12, FastAPI, SQLAlchemy 2, Pydantic v2 |
| Web | Next.js 14, TypeScript, Tailwind CSS |
| Mobile | Expo 51, React Native |
| On-chain | Stellar SDK, Soroban smart contracts |
| KMS | HashiCorp Vault (Transit engine) |
| DB | PostgreSQL (production), SQLite (unit tests) |
| Monorepo | Turborepo, pnpm workspaces |

## Quickstart

### Prerequisites

- Node.js 20+, pnpm 9+
- Python 3.12, [uv](https://github.com/astral-sh/uv) or pip
- Docker and Docker Compose

### Start the full stack

```bash
# 1. Install JS dependencies
pnpm install

# 2. Start backing services (Postgres, Vault)
docker compose up -d postgres vault

# 3. Start the FastAPI backend (port 8000)
cd apps/api-py
uvicorn src.main:app --reload

# 4. Start the web frontend (port 3000)
pnpm --filter web dev

# 5. Start the mobile app
pnpm --filter mobile start
```

### Environment variables

Copy `.env.example` to `.env` and set:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | ≥ 32 character secret |
| `WALLET_ENCRYPTION_KEY` | 64-char hex AES-256 key |
| `VAULT_ADDR` | HashiCorp Vault address (optional in dev) |
| `STELLAR_NETWORK` | `testnet` or `public` |
| `HORIZON_URL` | Stellar Horizon URL |

## Feature Status

| Feature | Status |
|---|---|
| Auth (JWT + refresh tokens) | ✅ Live |
| Payments (Stellar XLM) | ✅ Live |
| Escrow (Soroban) | ✅ Live |
| Taste profiles | ⚠️ Preview (mock data, `is_mock: true`) |
| Matching / deck | 🚧 In progress |
| Anchor (SEP-24) | ✅ Live |

> **Taste data is currently mock.** The `is_mock` field in `/api/taste/profile/{user_id}` responses will be `true` until real embedding computation is deployed.

## Docs

See [`docs/index.md`](docs/index.md) for the full documentation index.

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md). MIT Licence.
