# MixMatch 🎧

Welcome to **MixMatch** — a social connection platform that matches people based on their true music identity, rather than just how they look. We use your Spotify streaming history to generate a deeply accurate "Taste Profile" and connect you with others who share your vibe.

This project is open-source and built for the community. We believe human connection through music is a core utility, and we're building the best platform to facilitate it.

## 🏗 Architecture & Stack

This is a modern monorepo powered by **Turborepo** and `pnpm`. Our stack is chosen for strict typing, modularity, and scalability:

- **Backend (`apps/api`)**: A modular monolith built with **NestJS**. Enforces strong domain boundaries.
- **Database**: PostgreSQL (with `pgvector` for AI similarity matching), Redis for caching, and Drizzle ORM.
- **Web App (`apps/web`)**: Next.js (App Router).
- **Mobile App (`apps/mobile`)**: React Native via Expo.

## 🚀 Getting Started for Local Development

We adhere to the **"Zero to Hello World"** rule. You should be able to spin up the entire stack locally in under 5 minutes without needing any cloud API keys (we use mock data for local dev).

### Prerequisites
- Node.js (v20+)
- [pnpm](https://pnpm.io/installation) (v9+)
- Docker & Docker Compose

### 1. Clone & Install
```bash
git clone https://github.com/your-org/mixmatch.git
cd mixmatch
pnpm install
```

### 2. Spin up Infrastructure
We use Docker to run our local Postgres database, Redis cache, and ClickHouse instance.
```bash
docker compose up -d
```

### 3. Run the Development Servers
Start all applications (API, Web, and Mobile) concurrently using Turborepo:
```bash
pnpm dev
```

* **API**: http://localhost:3000
* **Web**: http://localhost:3001
* **Mobile**: Follow the Expo terminal prompts to open the app on your iOS/Android simulator.

## 🤝 Contributing to MixMatch

We love open-source contributors! Our roadmap is broken down into specific domains so you can work on features without blocking others.

### Where to start?
1. Check out our **Issue Tracker** and look for issues labeled `good first issue` or `help wanted`.
2. Our work is split by domains (e.g., `[Backend]`, `[Mobile]`, `[Design]`). Pick one that matches your skillset!
3. Review our [GitHub Work Roadmap](./docs/roadmap.md) (if you want the big picture).

### Contributor Guidelines
- **Contract-First:** Before building a frontend feature, ensure the backend API schema (Zod/Drizzle) is agreed upon.
- **Strict Modularity:** If you are working in the `Taste Engine` NestJS module, do not directly import services from the `Messaging` module. Keep domains isolated.
- **Tests Required:** We expect unit tests for core logic (especially in the Match Engine).

## 📜 License

[MIT License](./LICENSE)
