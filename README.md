# MixMatch

Welcome to the MixMatch codebase! This is a **monorepo** managing the frontend, backend API, and Stellar/Web3 services for the MixMatch platform.

We use **[pnpm workspaces](https://pnpm.io/workspaces)** for dependency management and **[TurboRepo](https://turbo.build/)** for high-performance build orchestration.

## 🚀 Tech Stack

- **Monorepo Manager:** pnpm workspaces + TurboRepo
- **Frontend:** Next.js 14+ (App Router), TailwindCSS
- **Backend:** Node.js, Express, TypeScript
- **Web3:** Stellar SDK (Soroban)
- **Language:** TypeScript (Strict Mode)

---

[MIXMATCH FIGMA](https://www.figma.com/design/wYIPrjvmHc1UuR2kFgXdao/Mixmatch?node-id=0-1&t=YGbg33TLval6HRoP-1)

## 🛠 Prerequisites

Before you start, ensure you have the following installed:

1. **Node.js** (v18 or higher recommended)
2. **pnpm** (We use this instead of npm/yarn)

```bash
corepack enable
# OR
npm install -g pnpm

```

---

## ⚡️ Getting Started

Follow these steps to get the entire platform running locally.

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd MixMatch-Onchain

# Install all dependencies for all apps and packages
pnpm install

```

### 1.5 Configure Environment Variables

Copy each checked-in example file before starting the services:

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
cp apps/stellar-service/.env.example apps/stellar-service/.env
```

Required values:

- `apps/api/.env`
  - `MONGO_URI`
  - `JWT_SECRET`
- `apps/web/.env.local`
  - `NEXT_PUBLIC_API_URL`
- `apps/stellar-service/.env`
  - `STELLAR_SEC_KEY`
  - `STELLAR_NETWORK`
  - `STELLAR_HORIZON_URL`

The API and Stellar service now fail fast during startup when required
environment variables are missing.

### 2. Run Development Server

This command starts **all** applications (Web, API, and Stellar Service) in parallel.

```bash
pnpm dev

```

You will see output from all services in your terminal. They are available at:

- **Web App:** [http://localhost:3000](https://www.google.com/search?q=http://localhost:3000)
- **Backend API:** [http://localhost:3001](https://www.google.com/search?q=http://localhost:3001)
- **Stellar Service:** [http://localhost:3002](https://www.google.com/search?q=http://localhost:3002)

---

## 📂 Project Structure

```text
mixmatch/
├── apps/
│   ├── web/               # Next.js Frontend (User & Admin Interface)
│   ├── api/               # Core Backend API (Express + Node.js)
│   └── stellar-service/   # Isolated Service for Blockchain/Payments
│
├── packages/
│   ├── types/             # Shared TypeScript interfaces & DTOs
│   ├── config/            # Shared configurations (TSConfig, ESLint)
│   └── ui/                # Shared React UI components (Tailwind)
│
└── turbo.json             # Build pipeline configuration

```

---

## 📜 Available Scripts

Run these from the **root** folder:

| Command      | Description                                  |
| ------------ | -------------------------------------------- |
| `pnpm dev`   | Starts all apps in development mode.         |
| `pnpm build` | Builds all apps and packages for production. |
| `pnpm lint`  | Runs ESLint across the entire monorepo.      |
| `pnpm test`  | Runs package tests when a workspace exposes them. |
| `pnpm clean` | (Optional) Clears Turbo cache and artifacts. |

---

## 🧩 Adding Dependencies

Since we use a monorepo, you must specify **where** to install a package.

**To add a library to the Frontend (`apps/web`):**

```bash
# Example: Adding Framer Motion to the web app
cd apps/web
pnpm add framer-motion

```

**To add a library to the Backend (`apps/api`):**

```bash
cd apps/api
pnpm add mongoose

```

**To use a shared package (e.g., using Types in API):**
_Note: This is already set up, but for reference:_

```bash
cd apps/api
pnpm add "@mixmatch/types@workspace:*" -D

```

---

## ⚠️ Troubleshooting

**"Module not found" or Type Errors**
If you just pulled fresh code or switched branches:

```bash
pnpm install
# If issues persist, force a clean install
rm -rf node_modules
pnpm install

```

**Git is ignoring files I want to commit**
We strictly ignore `node_modules` and build artifacts (`.next`, `dist`).

- **Do not** force commit `node_modules`.
- If your `node_modules` are showing up in Git, run:

```bash
git rm -r --cached .
git add .
git commit -m "fix: clear cached node_modules"

```

---

## 🤝 Contribution Guidelines

1. Always run `pnpm lint` before pushing.
2. Keep shared logic (types, configs) in `packages/`.
3. Do not edit `apps/*/node_modules` manually.
