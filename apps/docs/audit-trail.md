# Audit Trail

## Scope

The audit trail provides a tamper-evident log of security-relevant events
for compliance, debugging, and incident response. Every action that mutates
state or accesses sensitive data is recorded with actor identity and
context. This document defines what gets logged, the contract for the
logging interface, and how to extend it for new modules.

## Why this matters

Without a defined audit contract, developers may log events inconsistently,
omit critical metadata, or block the request path with synchronous writes.
The audit trail contract ensures uniformity: every entry has a fixed schema,
every write is async fire-and-forget, and every module uses the same
`AuditService.record()` interface.

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

## Contracts

### AuditService interface

```ts
interface AuditService {
  record(action: AuditAction, entry: AuditEntryInput): Promise<void>;
}
```

Any module that needs to log an event calls `auditService.record()`. The
service MUST be injected via the module wiring system — never instantiated
directly in request handlers.

### InMemoryAuditStore

For testing, `InMemoryAuditStore` stores entries in an array. Use it in
unit tests where you need to assert that a specific action was recorded:

```ts
const store = new InMemoryAuditStore();
const audit = new AuditService(store);
await audit.record('USER_LOGGED_IN', { actorId: user.id });
expect(store.entries).toHaveLength(1);
expect(store.entries[0].action).toBe('USER_LOGGED_IN');
```

### Extending for new modules

To add audit logging to a new module:

1. Inject `AuditService` via the module's `initialize()` function.
2. Call `audit.record()` after the operation succeeds.
3. Include `actorId` whenever the user identity is known.
4. Include `resourceId` for the affected entity.
5. Never block the response on the audit write.

## Testing

Audit trail tests live in `apps/api/src/modules/audit/` and verify:

- Entry schema compliance
- Async fire-and-forget semantics
- InMemoryAuditStore retrieval
- PII scrubbing (tokens/passwords never stored)
