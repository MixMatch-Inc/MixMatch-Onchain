# Developer Onboarding

This guide takes you from cloning the repository to running the full stack
locally. It covers the core flow, the architectural contracts a new developer
needs to understand, and common pitfalls.

---

## Scope of Onboarding

This repository is currently a **foundation release**: monorepo tooling plus
authentication only. Onboarding covers:

- Setting up the local development environment
- Understanding the monorepo and package boundaries
- Running the auth flow end-to-end (register → login → me)
- Writing and running tests
- Adding a new feature

---

## Prerequisites

- **Node.js 20+** (check with `node --version`)
- **pnpm 10+** (enable with `corepack enable && corepack prepare pnpm@latest --activate`)
- **Docker** (for local PostgreSQL — any Docker install works)
- **Git**

---

## Quick Start (10 minutes)

### 1. Clone and install

```bash
git clone https://github.com/your-org/themixmatch-onchain.git
cd themixmatch-onchain
pnpm install
```

### 2. Start PostgreSQL

```bash
docker run --name mixmatch-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=mixmatch \
  -p 5432:5432 -d postgres:16
```

### 3. Configure environment

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

At minimum, `apps/api/.env` needs a `JWT_SECRET`:

```bash
# Generate a secure secret
openssl rand -hex 32

# Paste it into apps/api/.env:
# JWT_SECRET=<generated-value>
```

### 4. Run database migrations

```bash
cd apps/api
pnpm prisma:migrate dev
cd ../..
```

### 5. Start the dev servers

```bash
pnpm dev
```

- API: http://localhost:3001
- Web: http://localhost:3000

### 6. Verify the auth flow

```bash
# Register
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Login (capture the access token from the response)
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Me (replace TOKEN with the access token)
curl http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer TOKEN"
```

---

## Architectural Contracts

### Monorepo boundaries (`pnpm workspaces`)

| Package/Dir       | Responsibility                                      | Public API                    | Depends on                   |
|-------------------|-----------------------------------------------------|-------------------------------|------------------------------|
| `apps/api`        | Express modular monolith — auth + users modules     | REST endpoints (`/api/auth/*`)| `@mixmatch/shared`           |
| `apps/web`        | Next.js App Router — login & signup pages           | `/login`, `/signup`           | `@mixmatch/shared`           |
| `apps/mobile`     | Expo foundation (no screens yet)                    | —                             | —                            |
| `packages/shared` | Types, Zod schemas, and validation logic            | Exports via `src/index.ts`    | —                            |
| `packages/stellar`| Placeholder scaffold (no blockchain logic yet)      | —                             | —                            |

### Shared package contract

`@mixmatch/shared` (aliased as `@mixmatch/shared` in package.json) is the
**single source of truth** for cross-cutting concerns:

- Auth schemas: `registerSchema`, `loginSchema`
- Types: `AuthResponse`, `ErrorResponse`, etc.
- Every consumer (API, web, mobile) imports from this package; **never**
  duplicate validation logic.

### API contract

The API exposes three endpoints today:

| Method | Path              | Request body                 | Success response            |
|--------|-------------------|------------------------------|-----------------------------|
| POST   | `/api/auth/register` | `{ email, password }`        | `201 { user, accessToken }` |
| POST   | `/api/auth/login`    | `{ email, password }`        | `200 { user, accessToken }` |
| GET    | `/api/auth/me`       | Bearer token in `Authorization` header | `200 { user }`    |

All errors follow a uniform envelope:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "..." } }
```

### In-memory repository pattern

API tests use `InMemoryUserRepository` instead of a real database. This means
tests require **zero infrastructure** — clone, install, and run. The pattern
is defined in `apps/api/src/shared/repositories/implementations/InMemoryUserRepository.ts`.

---

## Common Troubleshooting

### "pnpm: command not found"

```bash
corepack enable && corepack prepare pnpm@latest --activate
```

### "Cannot find module '@mixmatch/shared'"

```bash
pnpm install
pnpm --filter @mixmatch/shared build
```

The shared package must be built before other packages can import it.

### "Prisma: database does not exist"

```bash
# Start PostgreSQL
docker start mixmatch-postgres

# Create the database
docker exec mixmatch-postgres createdb -U postgres mixmatch

# Run migrations
cd apps/api && pnpm prisma:migrate dev
```

### "JWT_SECRET must be at least 32 characters"

Generate a random 64-character hex string:

```bash
openssl rand -hex 32
```

Then update `apps/api/.env`.

### "Port already in use"

Check what is running on the port:

```bash
lsof -i :3001
lsof -i :3000
```

Kill the process (`kill -9 <PID>`) or change the port in `.env`.

### Tests fail after switching branches

```bash
pnpm install
pnpm --filter @mixmatch/shared build
```

---

## Next Steps

| If you want to...                                | Read                                           |
|--------------------------------------------------|------------------------------------------------|
| Understand the full test setup                   | [docs/TESTING.md](./TESTING.md)                |
| Contribute code                                  | [docs/CONTRIBUTING.md](./CONTRIBUTING.md)      |
| Configure environment variables                 | [docs/ENVIRONMENT.md](./ENVIRONMENT.md)         |
| Understand password handling and security        | [apps/docs/password-handling.md](../apps/docs/password-handling.md) |
| Learn about auth error codes                     | [apps/docs/auth-errors.md](../apps/docs/auth-errors.md) |
| Understand the API module structure              | `apps/api/README.md`                           |
| Understand the web app structure                 | `apps/web/README.md`                           |
