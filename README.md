# MixMatch 🎧

**Connect through taste, not just swiping.** 

Welcome to **MixMatch** — a revolutionary social connection platform that matches people based on their true music identity. By analyzing your Spotify (and soon Apple Music) streaming history, we generate a deeply accurate "Taste Profile" powered by AI embeddings. We connect you with others who share your vibe, enabling deeper human connection through the universal language of music.

MixMatch is a community-driven, open-source project. We believe that discovering friends, collaborators, and partners through music is a core social utility, and we're building the best platform in the world to facilitate it.

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
* **`apps/api` (Backend):** A strict, modular monolith built with **NestJS**. This ensures strong domain boundaries so contributors can work without stepping on each other's toes.
* **`apps/web` (Internal/Creator Dashboards):** Built with **Next.js** (App Router) for SEO, performance, and robust routing.
* **`apps/mobile` (Consumer App):** Built with **React Native via Expo** for rapid cross-platform (iOS/Android) deployment.
* **`packages/*` (Shared Libraries):** Extracted UI components, ESLint rules, and TypeScript configs to keep the apps DRY.

### Infrastructure & Data
* **Database:** PostgreSQL (utilizing `pgvector` for AI similarity matching).
* **ORM:** Drizzle ORM for extreme type-safety between the database and our TypeScript APIs.
* **Cache/Realtime:** Redis for session storage and pub/sub.
* **Analytics:** ClickHouse for fast, high-volume event logging.

---

## 🚀 Getting Started (Zero to Hello World)

We adhere strictly to a **"Zero to Hello World"** philosophy. You should be able to spin up the entire stack locally in under 5 minutes without needing any cloud API keys.

### Prerequisites
1. Node.js (v20+)
2. [pnpm](https://pnpm.io/installation) (v9+)
3. Docker & Docker Compose

### Step-by-Step Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/MixMatch-Inc/MixMatch-Onchain.git
   cd MixMatch-Onchain
   ```

2. **Install all dependencies:**
   ```bash
   pnpm install
   ```

3. **Spin up local infrastructure:**
   This command starts local instances of Postgres, Redis, and ClickHouse.
   ```bash
   docker compose up -d
   ```

4. **Start the development servers:**
   Run the entire stack concurrently. Turborepo handles caching and parallel execution.
   ```bash
   pnpm dev
   ```

You are now running!
* **API**: `http://localhost:3000`
* **Web**: `http://localhost:3001`
* **Mobile**: Follow the Expo terminal prompts to open the app on your iOS simulator or Android emulator.

---

## 🤝 Contributing to MixMatch

We are actively looking for open-source contributors of all skill levels! Whether you want to build sleek React Native animations, optimize SQL vector queries, or write documentation, there is a place for you here.

### Finding Work
1. Navigate to the **Issues** tab on GitHub.
2. Look for issues labeled `good first issue` or `help wanted`.
3. We tag our issues by domain: `[Backend]`, `[Mobile]`, `[Frontend]`, and `[Design]`. Pick an issue that aligns with your expertise.

### Contributor Guidelines
* **Contract-First API Design:** Before building a frontend feature, the backend API schema (using Drizzle/Zod) must be agreed upon. This allows frontend and backend contributors to work in parallel.
* **Strict Modularity (NestJS):** If you are working in the `Taste Engine` NestJS module, do not directly import logic from the `Messaging` module. Keep domain logic completely isolated to maintain the monolith's integrity.
* **Testing:** We require basic unit tests for all core algorithmic logic (especially the Match Engine).
* **Pull Requests:** Ensure your PR is linked to an existing issue. Our GitHub Actions CI pipeline will automatically lint and build your code (`pnpm build`, `pnpm lint`). PRs must pass CI to be merged.

### The Roadmap (Current Milestones)
* **Milestone 1:** The Foundation & Music Identity (Turborepo, NestJS, Postgres, Auth) — *Currently In Progress*
* **Milestone 2:** The Match Engine (Taste Profile Generation, Compatibility Algorithms, Swipes)
* **Milestone 3:** Consumer UI (React Native Swipe Cards, Onboarding)
* **Milestone 4:** Messaging & Realtime (WebSocket Chat)
* **Milestone 5:** Content & Creators (Audio Uploads, Transcoding)

---

## 📜 License & Code of Conduct

MixMatch is licensed under the [MIT License](./LICENSE).

Please read our [Code of Conduct](./CODE_OF_CONDUCT.md) to keep our community approachable and respectable.

---

*Built with ❤️ for the music community.*
