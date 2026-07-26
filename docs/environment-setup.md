# Environment Setup Guide

## Prerequisites
- Node.js >= 20
- pnpm 10+
- Docker (for PostgreSQL)

## Environment Variables

### Required
| Variable | Description | Example |
|----------|-------------|---------|
| DATABASE_URL | PostgreSQL connection string | postgresql://user:pass@localhost:5432/mixmatch |
| JWT_SECRET | Secret for JWT signing (32+ chars) | your-secret-key-here |
| JWT_EXPIRES_IN | Token expiry duration | 1h |

### Optional
| Variable | Description | Default |
|----------|-------------|---------|
| PORT | API server port | 3001 |
| WEB_ORIGIN | CORS origin for web app | http://localhost:3000 |
| STELLAR_NETWORK | Stellar network | testnet |
| RPC_URL | Stellar RPC endpoint | https://soroban-testnet.stellar.org |

## Setup Steps
1. Copy `.env.example` to `.env`
2. Generate JWT secret: `openssl rand -hex 32`
3. Start PostgreSQL: `docker-compose up -d`
4. Run migrations: `pnpm prisma migrate dev`
5. Start dev servers: `pnpm dev`
