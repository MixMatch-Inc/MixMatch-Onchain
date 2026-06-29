# Token Persistence

## Overview

Token persistence manages refresh token storage across sessions. The
implementation uses a `SessionStore` interface with two backends:

- **InMemorySessionStore**: Lightweight, no-dependency store for development
  and test environments.
- **PrismaSessionStore**: Production-grade store backed by PostgreSQL via
  Prisma. The `sessions` table stores refresh tokens with expiry timestamps.

## Session Table

| Column        | Type     | Description                        |
| ------------- | -------- | ---------------------------------- |
| `id`          | UUID     | Primary key                        |
| `userId`      | UUID     | References `users.id`              |
| `refreshToken`| Text     | Unique refresh token (cascade delete) |
| `expiresAt`   | DateTime | Token expiration timestamp         |
| `createdAt`   | DateTime | Session creation timestamp         |

## Session Config

| Setting                | Default | Description                        |
| ---------------------- | ------- | ---------------------------------- |
| `refreshTokenExpiryMs` | 7 days  | Time before a refresh token expires|
| `maxActiveSessions`    | 5       | Max concurrent sessions per user   |

## Edge Cases

- **Expired sessions**: `cleanupExpired()` is called periodically to remove
  stale records from the database.
- **Max sessions**: When a user exceeds `maxActiveSessions`, the oldest
  session is revoked to make room.
- **Cascade delete**: Deleting a user automatically removes all associated
  sessions via Prisma's `onDelete: Cascade`.

## Usage

```ts
import { PrismaSessionStore } from '../modules/auth/prisma-session.store.js';
import { SessionService } from '../modules/auth/session.service.js';

const store = new PrismaSessionStore();
const sessionService = new SessionService(store);
```
