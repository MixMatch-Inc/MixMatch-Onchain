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

---

## 📖 The Core Vision

Modern social matching apps rely entirely on visual first impressions. MixMatch flips this script:
1. **The Taste Engine:** We securely ingest your streaming history to build an AI vector embedding representing your unique musical DNA (your "Taste Profile").
2. **The Match Engine:** Using `pgvector` and Approximate Nearest Neighbor (ANN) search, we algorithmically pair you with users whose musical geometry aligns with yours.
3. **The Core Loop:** You receive a daily "Deck" of highly compatible matches. A mutual swipe unlocks 1:1 messaging and listening parties.
4. **Creator Economy (Future):** Built-in tools for independent musicians to collaborate, share music, and get tipped directly on-chain using invisible Stellar infrastructure.

---

## 🏗 Architecture & Tech Stack

This project is structured as a modern monorepo powered by **Turborepo**. We chose our stack to maximize type safety, modularity, and contributor velocity.

### The Monorepo
* **`apps/api-py` (Backend):** High-performance asynchronous REST and Server-Sent Events (SSE) backend built with **FastAPI** and **Python 3.11+**, structured as a domain-driven modular monolith.
* **`apps/web` (Internal/Creator Dashboards):** Built with **Next.js** (App Router) for SEO, performance, and robust routing.
* **`apps/mobile` (Consumer App):** Built with **React Native via Expo** for rapid cross-platform (iOS/Android) deployment.
* **`packages/*` (Shared Libraries):** Extracted UI components, ESLint rules, and TypeScript configs to keep the apps DRY.

### Infrastructure & Data
* **Database:** PostgreSQL 16 (with `pgvector` for vector similarity matching and aiosqlite for hermetic testing).
* **ORM:** **SQLAlchemy 2.0 (Async)** with strict Pydantic v2 validation schemas.
* **KMS & Secrets:** HashiCorp Vault Transit engine with AES-256-GCM fallback encryption.
* **Blockchain:** Official Stellar Python SDK with Horizon SSE streaming and SEP-10 web authentication.
* **Cache/Realtime:** SlowAPI rate limiting, SSE streaming with client subscription caching.

---

## 🚀 Getting Started (Zero to Hello World)

We adhere strictly to a **"Zero to Hello World"** philosophy. You should be able to spin up the entire stack locally in under 5 minutes without needing any cloud API keys.

### Prerequisites

### One command

```bash
make setup   # env files, dependencies (pnpm + a Python venv), Postgres, database schema
make dev     # Postgres, the FastAPI backend with reload, and the web/mobile dev servers
```

The steps below are what `make setup` does, if you prefer to run them yourself.

### Step-by-Step Setup

### Start the full stack

3. **Spin up local infrastructure:**
   This starts Postgres, builds and starts the FastAPI backend (API on `http://localhost:8000`) and the web app (`http://localhost:3000`). Add `--profile vault` for a dev-mode Vault.
   ```bash
   docker compose up -d --build
   ```
   To run only the database and use the dev servers below, start just `postgres`: `docker compose up -d postgres`.

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
