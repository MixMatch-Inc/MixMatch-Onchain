# Environment Setup

Each app has its own `.env.example`. Copy it to `.env` (or `.env.local`)
before running the app locally.

## apps/api/.env

| Variable          | Description                                            | Example                                                        |
| ----------------- | ------------------------------------------------------- | --------------------------------------------------------------- |
| `PORT`            | Port the API listens on                                 | `3001`                                                           |
| `NODE_ENV`        | Runtime environment                                     | `development`                                                    |
| `DATABASE_URL`    | PostgreSQL connection string (used by Prisma)           | `postgresql://postgres:postgres@localhost:5432/mixmatch?schema=public` |
| `JWT_SECRET`      | Secret used to sign access tokens                       | a long random string                                             |
| `JWT_EXPIRES_IN`  | Access token lifetime                                   | `1h`                                                              |
| `WEB_ORIGIN`      | Allowed CORS origin for the web app                     | `http://localhost:3000`                                          |

## apps/web/.env

| Variable              | Description                  | Example                  |
| --------------------- | ----------------------------- | -------------------------- |
| `NEXT_PUBLIC_API_URL` | Base URL of the API           | `http://localhost:3001`    |

## apps/mobile/.env

| Variable              | Description        | Example                |
| --------------------- | -------------------- | ------------------------ |
| `EXPO_PUBLIC_API_URL` | Base URL of the API | `http://localhost:3001`  |

## Local database

The API requires a PostgreSQL database. The simplest local option is Docker:

```bash
docker run --name mixmatch-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=mixmatch \
  -p 5432:5432 -d postgres:16
```

Then, from `apps/api`:

```bash
pnpm prisma:migrate
```

## Secrets handling

- Never commit `.env` files — they are gitignored.
- `JWT_SECRET` must be a long, random value in any non-local environment.
- CI uses a non-secret placeholder `JWT_SECRET` defined in the workflow files,
  which is only used to run the test suite.
