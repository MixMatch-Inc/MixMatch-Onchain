# Logger

## Scope

The logger provides structured, context-rich logging across the API. It ensures
that every log entry carries consistent metadata (module, userId, correlationId)
so that production issues can be traced back to the specific request and user
that triggered them.

## Why structured logging matters

Plain `console.log` calls produce unstructured output that is difficult to
query, filter, or aggregate in production. A structured JSON logger ensures
that every entry is machine-parseable and carries enough context to reconstruct
the sequence of events that led to an error.

## Contract

### Log Levels

| Level | When to use |
|-------|-------------|
| `debug` | Verbose diagnostic information, suppressed in production |
| `info` | Normal operational events (session created, request completed) |
| `warn` | Unexpected but recoverable conditions (max sessions reached) |
| `error` | Unrecoverable failures that require attention |

### Log Context

Every log entry can carry a `LogContext` object with these fields:

```typescript
interface LogContext {
  userId?: string;
  correlationId?: string;
  module?: string;
  [key: string]: unknown;
}
```

| Field | Description |
|-------|-------------|
| `userId` | ID of the user performing the action |
| `correlationId` | UUID linking all events within a single request |
| `module` | Subsystem that produced the log (e.g. `auth`, `session`, `rate-limit`) |
| Extra fields | Module-specific metadata (e.g. `sessionId`, `activeSessionCount`) |

## Architecture

```
Request ──► logger.middleware.ts ──► correlationId generated
                   │
                   ▼
            Handler code
                   │
                   ▼
            logger.info('...', { module: 'auth', userId, correlationId })
                   │
                   ▼
            Structured JSON output
```

The request logger middleware generates a `correlationId` for each incoming
request and attaches it to the Express request object. Downstream handlers
pass this ID through log calls to maintain request-level traceability.

## Integration Points

| Component | Role |
|-----------|------|
| `apps/api/src/common/logger/logger.interface.ts` | Defines `IAppLogger`, `LogLevel`, `LogContext` |
| `apps/api/src/shared/logger/logger.ts` | Implements `IAppLogger` with structured JSON output |
| `apps/api/src/middleware/logger.middleware.ts` | Generates correlationId, logs request timing |
| `apps/api/src/utils/logger.ts` | Re-exports logger for convenience |

## Log Level Filtering

Use `setLogLevel` to control the minimum severity that gets written:

```typescript
import { logger, setLogLevel } from '../shared/logger/logger.js';
import { LogLevel } from '../common/logger/logger.interface.js';

setLogLevel(LogLevel.WARN); // only warn and error are written
```

Levels are ordered: `debug < info < warn < error`. Setting a minimum level
suppresses all entries below that threshold.

## Message Truncation

Messages exceeding 10,000 characters are automatically truncated with a
`...[truncated]` suffix to prevent excessive log output from consuming memory
or filling up log storage.

## Edge Cases

| Scenario | Behaviour |
|----------|-----------|
| Debug logs in production | Suppressed (log level filtering) |
| Logger called without context | Context fields default to `{ module: 'unknown' }` |
| Null/undefined context | Falls back to `{ module: 'unknown' }` |
| Error object with missing stack | `stack` field omitted, `message` defaults to `'Unknown error'` |
| Error object with missing name | `name` field defaults to `'Error'` |
| Message > 10,000 chars | Truncated with `...[truncated]` suffix |
| Log level filtering | Entries below minimum level are discarded |
| Multiple log calls in one request | All share the same correlationId |
| Unhandled error in handler | Error middleware logs with `module: 'error-middleware'` |
| CorrelationId missing | Log entries still produce valid JSON with null context fields |

## Usage

```typescript
import { logger } from '../shared/logger/logger.js';

// Within a request handler:
logger.info('New session created', {
  module: 'auth',
  userId: req.userId,
  correlationId: req.correlationId,
  sessionId: session.id,
});

logger.warn('Maximum active sessions reached', {
  module: 'auth',
  userId,
  activeSessionCount: count,
  maxAllowed: 5,
});

logger.error('Unhandled error in auth flow', error, {
  module: 'auth',
  userId,
});
```

## Testing

Unit tests: `apps/api/src/shared/__tests__/logger.test.ts`

Tests cover all log levels, formatContext output, JSON serialization, debug
suppression in production, context field propagation, null context handling,
error edge cases, message truncation, and log level filtering.
