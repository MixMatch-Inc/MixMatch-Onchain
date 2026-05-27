# TheMixMatch Onchain

TheMixMatch Onchain is being rebuilt as a clean open source hackathon starter for teams shipping a full-stack MVP with web, mobile, API, and Stellar components from one repository.

This reset keeps the monorepo baseline and removes the previous product implementation so contributors can build forward from a clear starting point.

## What is in the starter

- `apps/api`: Express API starter in TypeScript
- `apps/web`: Next.js web app starter
- `apps/mobile`: Expo mobile workspace starter
- `apps/stellar-service`: standalone Stellar integration service
- `packages/config`: shared TypeScript configuration
- `packages/types`: shared contracts and domain types

## Rebuild roadmap

The MVP backlog will move in this order:

1. Authentication and session foundations
2. User profiles and contributor-safe account flows
3. Stellar wallet linking and network operations
4. Core hackathon MVP feature flows
5. Observability, testing, deployment, and polish

Batch 1 of the public issue backlog is reserved for Authentication.

## Getting started

### Prerequisites

- Node.js 20+
- `pnpm` via Corepack

```bash
corepack enable
pnpm install
```

### Run the apps

```bash
pnpm dev
```

Default ports:

- Web: `http://localhost:3000`
- API: `http://localhost:3001`
- Stellar service: `http://localhost:3002`
- Expo: use the Metro output from `apps/mobile`

### Useful commands

```bash
pnpm build
pnpm typecheck
pnpm lint
```

## Contributor expectations

- Treat the previous implementation as legacy history, not as active architecture.
- Build small but meaningful increments that support a hackathon MVP.
- Prefer shared types and config packages instead of copy-pasted app-local contracts.
- Keep repo-ops and issue-generation artifacts out of commits unless explicitly requested.

## Current status

This repository is intentionally reset to a minimal baseline. The first implementation milestone is authentication across API, web, mobile, and Stellar-linked account workflows.
