# Phase 1 Architecture

## Services

- `apps/web`: Next.js app for registration, login, dashboard, discovery, and booking surfaces
- `apps/api`: Express API for auth, profiles, discovery, bookings, and seed/test workflows
- `apps/stellar-service`: separate Express service for Stellar account, payment, escrow, claim, and history operations
- `packages/types`: shared enums and DTO-style transport contracts

## Core flow

1. A user registers or logs in through the web app.
2. The web app stores the issued token and uses it for protected dashboard routes.
3. DJs, planners, and fans complete onboarding through role-specific profile creation.
4. Public DJ discovery reads published DJ profiles from the API.
5. Planners create booking requests and DJs review them through booking inbox pages.

## Current constraints

- Discovery and booking flows are intentionally lightweight for Phase 1.
- Stellar integration exists as a separate service but is not yet orchestrated by the API.
- Mobile and admin workflows are deferred to later phases.
