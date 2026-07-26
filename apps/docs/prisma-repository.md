# Prisma Repository Pattern

## Scope

This document describes the repository pattern used for data access in the
MixMatch API, how to create new repositories, and the InMemory pattern for
testing without a database.

## Why this document matters

The repository pattern decouples business logic from the database layer. It
lets us swap Prisma for an in-memory implementation in tests, mock the
database in unit tests, and enforce consistent error handling across all
data access.

## Architecture

```
Module (e.g. users, properties)
├── types.ts            — domain interfaces
├── repository.ts       — interface + Prisma impl + InMemory impl
└── __tests__/
    ├── *.test.ts       — unit tests (mocked Prisma or InMemory)
```

### Shared utilities

```
shared/database/
├── prisma.ts              — singleton PrismaClient
└── repository-errors.ts   — error handling, retry, validation
```

## Creating a new repository

### 1. Define the types

Create `modules/<name>/<name>.types.ts` with the domain interface:

```typescript
export interface Widget {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### 2. Create the repository

Create `modules/<name>/<name>.repository.ts` with three exports:

```typescript
export interface CreateWidgetInput { name: string; }
export interface UpdateWidgetInput { name?: string; }

export interface WidgetRepository {
  findById(id: string): Promise<Widget | null>;
  create(input: CreateWidgetInput): Promise<Widget>;
  update(id: string, data: UpdateWidgetInput): Promise<Widget>;
  delete(id: string): Promise<void>;
}
```

### 3. Implement Prisma version

Use `wrapPrismaError` and `withRetry` from `repository-errors.ts`:

```typescript
export class PrismaWidgetRepository implements WidgetRepository {
  async findById(id: string): Promise<Widget | null> {
    validateId(id);
    return withRetry(async () => {
      try {
        return await prisma.widget.findUnique({ where: { id } });
      } catch (error) {
        wrapPrismaError(error);
      }
    });
  }
  // ... other methods follow the same pattern
}
```

### 4. Implement InMemory version

For tests that need a real repository without a database:

```typescript
export class InMemoryWidgetRepository implements WidgetRepository {
  private readonly widgets = new Map<string, Widget>();

  async findById(id: string): Promise<Widget | null> {
    return this.widgets.get(id) ?? null;
  }
  // ...
}
```

### 5. Add the Prisma model

Add the model to `prisma/schema.prisma`:

```prisma
model Widget {
  id        String   @id @default(uuid())
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("widgets")
}
```

Run `prisma generate` to update the client.

## Error handling

All Prisma errors are caught and wrapped via `wrapPrismaError`:

| Prisma code | RepositoryError code | Meaning                    |
|-------------|---------------------|----------------------------|
| P2002       | DUPLICATE           | Unique constraint violated |
| P2025       | NOT_FOUND           | Record not found           |
| P2003       | FOREIGN_KEY         | FK constraint failed       |
| other       | DATABASE_ERROR      | Catch-all                  |

Transient errors (connection failures, timeouts) are retried up to 2 times
with exponential backoff via `withRetry`.

Input validation runs before any database call:
- `validateId(id)` — rejects empty/whitespace-only strings
- `validateRequired({ field })` — rejects null/undefined/empty values

## Testing

### Unit tests with mocked Prisma

Mock `prisma.ts` with `vi.mock()` and test the Prisma repository directly:

```typescript
vi.mock('../../../shared/database/prisma.js', () => ({
  prisma: { widget: { findUnique: vi.fn(), create: vi.fn(), ... } },
}));

it('returns null when not found', async () => {
  mockPrisma.widget.findUnique.mockResolvedValue(null);
  const result = await repo.findById('missing');
  expect(result).toBeNull();
});
```

### Unit tests with InMemory

Use `InMemoryXxxRepository` for integration-style tests that verify
business logic without touching the database:

```typescript
const repo = new InMemoryWidgetRepository();
const widget = await repo.create({ name: 'test' });
const found = await repo.findById(widget.id);
expect(found).toEqual(widget);
```

### Error scenario tests

Test validation, Prisma error wrapping, and retry behavior using the
shared utilities in `repository-errors.ts`.

## Integration points

- **Prisma schema**: `apps/api/prisma/schema.prisma`
- **Prisma client**: `apps/api/src/shared/database/prisma.ts`
- **Error utilities**: `apps/api/src/shared/database/repository-errors.ts`
- **Users repo**: `apps/api/src/modules/users/users.repository.ts`
- **Properties repo**: `apps/api/src/modules/properties/properties.repository.ts`
- **Users tests**: `apps/api/src/modules/users/__tests__/`
- **Properties tests**: `apps/api/src/modules/properties/__tests__/`
