# TheMixMatch Onchain

**TheMixMatch Onchain** is a music-focused platform designed to connect DJs, artists, creators, and fans through discovery, collaboration, and blockchain-powered experiences.

The platform combines web, mobile, API, and Stellar infrastructure to create a modern ecosystem where music communities can interact, discover talent, collaborate, and participate in new creator-driven experiences.

TheMixMatch Onchain uses Stellar to introduce fast, affordable, and transparent blockchain interactions while keeping the user experience simple and accessible.

---

# Overview

The music industry is built around communities, creators, and shared experiences. However, many independent artists and DJs still struggle with discovery, collaboration opportunities, fan engagement, and direct monetization.

TheMixMatch Onchain aims to improve this by creating a platform where:

* DJs can build their presence and connect with opportunities.
* Artists and creators can discover collaborators.
* Fans can engage with creators in meaningful ways.
* Communities can participate in music experiences.
* Blockchain technology enables new forms of ownership, support, and interaction.

The platform combines familiar music community features with Stellar-powered infrastructure.

---

# Core Features

## Creator Profiles

Creators can establish their presence on TheMixMatch Onchain through dedicated profiles.

Profiles can include:

* DJ or artist information,
* music preferences,
* portfolio details,
* social links,
* performance history,
* community activity.

The goal is to create a central identity layer for music creators.

---

## Music Discovery

TheMixMatch Onchain focuses on helping users discover creators and music experiences.

Discovery experiences may include:

* finding DJs and artists,
* exploring music communities,
* matching creators with similar interests,
* discovering events and collaborations,
* personalized music experiences.

---

## Creator Collaboration

Music creation is highly collaborative.

The platform supports workflows around:

* DJ discovery,
* artist matching,
* collaboration opportunities,
* community-driven connections,
* creator networking.

The goal is to make it easier for creators to find and work with each other.

---

## Fan Engagement

Fans are an important part of the music ecosystem.

The platform enables future fan-focused experiences such as:

* following creators,
* supporting artists,
* joining communities,
* participating in exclusive experiences,
* interacting with creator content.

---

## Stellar Integration

TheMixMatch Onchain uses Stellar as the blockchain infrastructure powering creator and community interactions.

Potential Stellar-powered features include:

* wallet connections,
* creator support payments,
* digital rewards,
* transaction receipts,
* transparent ownership records,
* blockchain-based engagement features.

Stellar provides the speed and low transaction costs needed for consumer-facing experiences without adding unnecessary complexity for users.

---

# Technology Stack

TheMixMatch Onchain is built with a modern full-stack TypeScript architecture.

| Area               | Technology                       |
| ------------------ | -------------------------------- |
| Web Application    | Next.js + React + TypeScript     |
| Mobile Application | Expo + React Native + TypeScript |
| Backend API        | Express.js + TypeScript          |
| Blockchain Layer   | Stellar                          |
| Package Manager    | pnpm                             |
| Architecture       | Monorepo                         |

---

# Repository Structure

This repository is currently a **foundation release**: monorepo tooling plus
authentication only. Everything else described in the Product Vision below
is future scope and is intentionally not implemented yet.

```text
themixmatch-onchain/
│
├── apps/
│   ├── api/        # Express modular monolith — authentication backend
│   ├── web/        # Next.js web app — login & signup
│   └── mobile/     # Expo/React Native foundation (no screens yet)
│
├── packages/
│   ├── shared/     # Shared TypeScript types & validation schemas
│   └── stellar/    # Placeholder scaffold for future Stellar integration
│
├── docs/           # Environment, testing, and contributor documentation
└── .github/
    └── workflows/  # Per-package CI (install, lint, test, build)
```

---

# Applications

## API

`apps/api`

A modular-monolith Express + TypeScript backend. Currently implements only
the **auth** and **users** modules:

* registration (`POST /api/auth/register`)
* login (`POST /api/auth/login`)
* current user (`GET /api/auth/me`, requires a bearer token)

Data is persisted to PostgreSQL via Prisma. See [apps/api/README.md](apps/api/README.md).

---

## Web Application

`apps/web`

A Next.js (App Router) app with two pages: `/login` and `/signup`. Shares
validation schemas and types with the API via `@mixmatch/shared`. See
[apps/web/README.md](apps/web/README.md).

---

## Mobile Application

`apps/mobile`

An Expo/React Native + TypeScript foundation: project structure, linting,
formatting, and testing setup only. No screens, navigation, or
authentication yet. See [apps/mobile/README.md](apps/mobile/README.md).

---

## Stellar Package

`packages/stellar`

A scaffold-only package establishing the future Stellar integration
boundary (placeholder types and interfaces, no blockchain logic). See
[packages/stellar/README.md](packages/stellar/README.md).

---

# Getting Started

## Requirements

* Node.js 20+
* pnpm 10+

Enable pnpm:

```bash
corepack enable
```

Install dependencies:

```bash
pnpm install
```

---

# Running the Platform

Copy each app's `.env.example` to `.env` first (see
[docs/ENVIRONMENT.md](docs/ENVIRONMENT.md)). The API requires a local
PostgreSQL database.

Start everything:

```bash
pnpm dev
```

Individual apps:

```bash
pnpm --filter @mixmatch/api dev
pnpm --filter @mixmatch/web dev
pnpm --filter @mixmatch/mobile dev
```

Default ports:

```text
Web: http://localhost:3000
API: http://localhost:3001
```

---

# Running Tests

```bash
pnpm test
```

See [docs/TESTING.md](docs/TESTING.md) for per-package details.

---

# Quality Checks

Run:

```bash
pnpm build
pnpm typecheck
pnpm lint
```

---

# Environment Configuration

Each application provides its own environment template:

```text
apps/api/.env.example
apps/web/.env.example
apps/mobile/.env.example
```

Copy the required environment file before running locally. See
[docs/ENVIRONMENT.md](docs/ENVIRONMENT.md) for variable descriptions and
secrets handling.

---

# Product Vision

TheMixMatch Onchain aims to become a platform where music creators and fans can discover, collaborate, and engage in new ways.

The long-term vision is to combine music culture with accessible blockchain technology, enabling stronger creator communities, better discovery, and new opportunities for participation.

---

# Contributing

See [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) for coding standards,
project structure, and the development workflow.

---

# License

MIT
