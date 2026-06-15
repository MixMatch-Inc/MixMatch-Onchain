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

```text
themixmatch-onchain/
│
├── apps/
│   ├── api/                # Backend API service
│   ├── web/                # Web application
│   ├── mobile/             # Mobile application
│   └── stellar-service/    # Stellar integration layer
│
├── packages/
│   ├── config/             # Shared configuration
│   └── types/              # Shared TypeScript contracts
│
└── docs/
```

---

# Applications

## API

`apps/api`

The backend provides the core application logic.

Responsibilities include:

* authentication,
* user management,
* creator profiles,
* discovery APIs,
* collaboration workflows,
* community features,
* communication with Stellar services.

---

## Web Application

`apps/web`

The web platform provides the full browser experience.

It is designed for:

* creator onboarding,
* profile management,
* community experiences,
* dashboards,
* discovery features,
* operational tools.

The web app provides a richer interface for creators and platform management.

---

## Mobile Application

`apps/mobile`

The mobile app is designed around everyday music interactions.

Core experiences include:

* creator discovery,
* community engagement,
* profile exploration,
* fan interactions,
* mobile-first creator workflows.

---

## Stellar Service

`apps/stellar-service`

The Stellar service isolates blockchain-related functionality.

Responsibilities include:

* wallet operations,
* Stellar network communication,
* transaction handling,
* payment workflows,
* blockchain-based receipts.

Keeping Stellar separate allows the platform to evolve while maintaining a clean application architecture.

---

# Development Roadmap

The MVP development approach follows these stages:

1. Authentication and account foundations.
2. User and creator profiles.
3. Stellar wallet integration.
4. Core music discovery workflows.
5. Creator and fan engagement features.
6. Blockchain-powered experiences.
7. Testing, observability, and production readiness.

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

Start all applications:

```bash
pnpm dev
```

Individual services:

```bash
pnpm dev:api
pnpm dev:web
pnpm dev:mobile
pnpm dev:stellar
```

Default ports:

```text
Web:
http://localhost:3000

API:
http://localhost:3001

Stellar Service:
http://localhost:3002
```

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
apps/stellar-service/.env.example
```

Copy the required environment file before running locally.

---

# Product Vision

TheMixMatch Onchain aims to become a platform where music creators and fans can discover, collaborate, and engage in new ways.

The long-term vision is to combine music culture with accessible blockchain technology, enabling stronger creator communities, better discovery, and new opportunities for participation.

---

# License

MIT
