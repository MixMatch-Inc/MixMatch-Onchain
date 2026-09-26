# MixMatch Backend Architecture (FastAPI Migration)

## Executive Summary
MixMatch's backend has migrated from Express/NestJS to a high-performance **FastAPI (Python 3.11+)** async modular monolith. The architecture provides sub-millisecond route latency, strong typing via Pydantic v2 and SQLAlchemy 2.0 Async, robust SSE streaming for live payment updates, and native integration with the official Python `stellar-sdk`.

## Component Architecture

```
                  ┌─────────────────────────────────────┐
                  │   Reverse Proxy (Nginx / Cloud)     │
                  │   Traffic-splitting & Canary Router │
                  └──────────────────┬──────────────────┘
                                     │
           ┌─────────────────────────┴─────────────────────────┐
           ▼                                                   ▼
┌──────────────────────┐                           ┌───────────────────────┐
│ Next.js Web App      │                           │ React Native Mobile   │
│ (apps/web)           │                           │ (apps/mobile)         │
└──────────┬───────────┘                           └───────────┬───────────┘
           │                                                   │
           └─────────────────────────┬─────────────────────────┘
                                     │ HTTP / SSE
                                     ▼
                   ┌───────────────────────────────────┐
                   │    FastAPI Application            │
                   │    (apps/api-py: main.py)         │
                   ├───────────────────────────────────┤
                   │  Middlewares:                     │
                   │  - SlowAPI Rate Limiting          │
                   │  - BaseDomainError Exception Trap │
                   └──────┬────────────────────────┬───┘
                          │                        │
         ┌────────────────┴──────┐       ┌─────────┴──────────────┐
         ▼                       ▼       ▼                        ▼
┌──────────────────┐ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐
│ Payments Module  │ │ Anchor Module  │ │ Escrow Module  │ │ Users & Auth   │
│ - router.py      │ │ - anchor_router│ │ - escrow_router│ │ - users_router │
│ - service.py     │ │ - anchor_svc   │ │ - escrow_svc   │ │ - users_repo   │
│ - repository.py  │ │ - SEP-10 Auth  │ │ - escrow_repo  │ │ - bcrypt/JWT   │
│ - reconcile_job  │ └────────────────┘ └────────────────┘ └────────────────┘
│ - SSE stream     │
└────────┬─────────┘
         │
         ├────────────────────────┬──────────────────────┐
         ▼                        ▼                      ▼
┌─────────────────┐      ┌─────────────────┐    ┌─────────────────┐
│  SQLAlchemy DB  │      │  Stellar Core   │    │ HashiCorp Vault │
│  (PostgreSQL/   │      │  (Horizon API & │    │ (Transit Engine │
│   aiosqlite)    │      │   SSE Stream)   │    │  KMS Signing)   │
└─────────────────┘      └─────────────────┘    └─────────────────┘
```

## Core Design Principles
1. **Async Everywhere**: All database access uses SQLAlchemy `AsyncSession` and async connection pooling.
2. **Strict Financial Precision**: Exact `decimal.Decimal` calculations throughout payment normalization, eliminating IEEE-754 floating point imprecision.
3. **Multi-Instance Lock Safety**: Distributed timestamped locks with automatic timeout prevent duplicate worker executions during parallel transaction reconciliation.
4. **Resilient Boundary Clients**: Circuit breakers and exponential backoff on anchor interactions and Horizon payment stream retries.
