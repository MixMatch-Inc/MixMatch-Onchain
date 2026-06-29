# @mixmatch/api

Authentication backend for TheMixMatch Onchain, implemented as a **modular monolith**.

## Architecture

```
src/
  modules/
    auth/      registration, login, current-user endpoint
    users/      user persistence (Prisma + in-memory test repository)
  shared/
    config/     environment configuration
    database/   Prisma client
    middleware/ auth guard, async handler, error handler
    errors/     AppError hierarchy
    logger/     minimal structured logger
  app.ts         Express app wiring
  server.ts      process entry point
```

Each module owns its controllers, services, validation, repository access,
types, and tests. Shared infrastructure lives in `shared/` and contains no
business logic.

## Endpoints

| Method | Path              | Auth required | Description                |
| ------ | ----------------- | -------------- | -------------------------- |
| POST   | `/api/auth/register` | No          | Create an account           |
| POST   | `/api/auth/login`    | No          | Log in and receive a token  |
| GET    | `/api/auth/me`       | Yes (Bearer) | Get the current user        |
| GET    | `/health`            | No          | Health check                |

## Local setup

```bash
cp .env.example .env
# update DATABASE_URL to point at a local Postgres instance
pnpm install        # also runs `prisma generate`
pnpm prisma:migrate # creates the users table
pnpm dev
```

## Testing

```bash
pnpm test
```

The auth module's tests run against an in-memory user repository, so they
require no database connection.
