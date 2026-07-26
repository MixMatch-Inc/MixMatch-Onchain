# Prisma Repository

This document describes the repository pattern used for data access in the MixMatch API, focusing on the users table.

## Repository Interface

Defined in `apps/api/src/modules/users/users.repository.ts`:

```typescript
interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(input: CreateUserInput): Promise<User>;
  update(id: string, data: UpdateUserInput): Promise<User>;
}
```

### Input Types

```typescript
interface CreateUserInput {
  email: string;
  passwordHash: string;
}

interface UpdateUserInput {
  email?: string;
  passwordHash?: string;
}
```

### User Type

Defined in `apps/api/src/modules/users/users.types.ts`:

```typescript
interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}
```

## Implementations

### PrismaUserRepository

The production implementation. Delegates all operations to Prisma Client against the `users` table.

- `findByEmail` — `prisma.user.findUnique({ where: { email } })`
- `findById` — `prisma.user.findUnique({ where: { id } })`
- `create` — `prisma.user.create({ data: { ...input, role: 'USER' } })`
- `update` — `prisma.user.update({ where: { id }, data })`

### InMemoryUserRepository

An in-memory implementation backed by a `Map<string, User>`. Used in tests to avoid database dependencies.

- Generates UUIDs for `id` via `randomUUID()`.
- Sets `createdAt` and `updatedAt` to `Date.now()` at creation.
- `update` sets `updatedAt` to a new `Date()` and merges fields.

## Contract Tests

The repository contract test suite (`apps/api/src/modules/users/__tests__/user-repository.test.ts`) exercises the `UserRepository` interface against any implementation. It verifies:

- `create` returns a user with all required fields
- `findByEmail` finds created users and returns null for unknowns
- `findById` finds created users and returns null for unknowns
- `update` changes fields and updates `updatedAt`
- `update` throws for non-existent users
- Multiple users have unique IDs

To test a new `UserRepository` implementation, call `assertUserRepositoryContract(repo)` in a describe block.

## How to Extend

1. Add new methods to the `UserRepository` interface.
2. Implement them in both `PrismaUserRepository` and `InMemoryUserRepository`.
3. Add corresponding assertions to the contract test.
4. If creating a repository for a new table, follow the same pattern: interface, Prisma implementation, in-memory implementation, and contract tests.
