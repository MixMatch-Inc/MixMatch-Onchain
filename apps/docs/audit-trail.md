# Audit Trail

## Overview

The audit trail captures security-relevant events for compliance, debugging,
and monitoring. Every action that mutates state or accesses sensitive data
is recorded with actor identity and context.

## Actions

| Action                | Trigger                      |
| --------------------- | ---------------------------- |
| `USER_REGISTERED`     | New account creation         |
| `USER_LOGGED_IN`      | Successful login             |
| `USER_LOGGED_OUT`     | Session revocation           |
| `PROFILE_UPDATED`     | Profile change (email, etc)  |
| `TOKEN_REFRESHED`     | Refresh token rotation       |
| `SESSION_REVOKED`     | Manual session termination   |
| `RATE_LIMIT_EXCEEDED` | Rate limit hit               |
| `ACCESS_DENIED`       | Authorization failure        |

## Audit Entry Schema

| Field       | Type     | Description                      |
| ----------- | -------- | -------------------------------- |
| `id`        | UUID     | Unique entry identifier          |
| `action`    | Enum     | One of the AuditAction values    |
| `actorId`   | UUID?    | User who performed the action    |
| `resourceId`| String?  | Affected resource identifier     |
| `metadata`  | Object?  | Extensible event-specific data   |
| `ip`        | String?  | Client IP address                |
| `userAgent` | String?  | Client user-agent string         |
| `timestamp` | ISO8601  | When the event occurred          |

## Usage

```ts
import { AuditService } from '../modules/audit/audit.service.js';
import { InMemoryAuditStore } from '../modules/audit/in-memory-audit.store.js';

const audit = new AuditService(new InMemoryAuditStore());

await audit.record('USER_REGISTERED', {
  actorId: userId,
  ip: req.ip,
  userAgent: req.headers['user-agent'],
});
```

## Edge Cases

- **Async fire-and-forget**: Audit writes MUST NOT block the request path.
  Use `catch(() => {})` or queue-based offloading.
- **Storage limits**: Implement TTL-based pruning for production stores to
  prevent unbounded growth.
- **PII**: Avoid logging raw passwords, tokens, or sensitive personal data
  in metadata.
