# System Architecture Overview

> Issue #1480 – accurate architecture with Mermaid diagrams.

## Monorepo Map

```
MixMatch-Onchain/
├── apps/
│   ├── api-py/          # FastAPI backend (primary)
│   ├── api/             # NestJS (legacy, decommissioning)
│   ├── web/             # Next.js frontend
│   └── mobile/          # Expo React Native
├── packages/
│   ├── shared/          # Shared TS types from OpenAPI
│   ├── stellar/         # Stellar/Soroban helpers
│   ├── kms/             # Vault Transit client
│   ├── ui/              # Shared React components
│   ├── eslint-config/
│   └── typescript-config/
├── docs/
├── loadtests/
└── scripts/
```

## Send-Payment Flow

```mermaid
sequenceDiagram
    participant Client
    participant API as api-py
    participant KMS as packages/kms
    participant Vault
    participant Stellar as Stellar Network

    Client->>API: POST /api/payments (JWT auth)
    API->>KMS: decrypt sender private key
    KMS->>Vault: Transit decrypt
    Vault-->>KMS: plaintext key
    KMS-->>API: keypair
    API->>Stellar: submit transaction
    Stellar-->>API: transaction result
    API->>API: persist payment row
    API-->>Client: PaymentResponse
```

## SEP-10 / SEP-24 Auth Flow

```mermaid
sequenceDiagram
    participant Client
    participant API as api-py
    participant Anchor as Anchor Server

    Client->>API: GET /api/anchor/challenge
    API->>Anchor: SEP-10 challenge
    Anchor-->>API: unsigned XDR
    API-->>Client: challenge XDR
    Client->>Client: sign with Stellar key
    Client->>API: POST /api/anchor/token (signed XDR)
    API->>Anchor: verify signature
    Anchor-->>API: JWT
    API-->>Client: anchor JWT
```

## Trust Boundaries

| Boundary | Direction | Protocol |
|---|---|---|
| Client → api-py | Inbound | HTTPS + JWT |
| api-py → Vault | Outbound | HTTPS + AppRole token |
| api-py → Stellar Horizon | Outbound | HTTPS |
| api-py → Anchor Server | Outbound | HTTPS (SEP-10/24) |
| api-py → Postgres | Internal | TLS optional (network-isolated) |

## Corrections from Previous Architecture Doc

- Circuit breakers exist **only** in `packages/stellar/src/escrow/pollingBackoff.ts` and the anchor service, not system-wide.
- Distributed locks are in-process (Python asyncio), not distributed.
- Taste, streaming, KMS and all packages are now included above.
