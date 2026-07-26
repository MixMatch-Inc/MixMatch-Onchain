# Testing Guide

## Test Frameworks
- **Web/Mobile**: Vitest + Testing Library
- **API**: Vitest + Supertest
- **Shared**: Vitest

## Test Structure
- Unit tests: `*.test.ts` co-located with source
- Integration tests: `__tests__/` directories
- E2E tests: `apps/api/__tests__/`

## Running Tests
```bash
pnpm test          # Run all unit tests
pnpm test:e2e      # Run API end-to-end tests
```

## Writing Tests
### API Tests
```typescript
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../app';

describe('POST /api/auth/register', () => {
  it('creates a new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'Password123!' });
    expect(res.status).toBe(201);
  });
});
```

### Web Tests
```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Component } from './Component';

it('renders correctly', () => {
  render(<Component />);
  expect(screen.getByText('Hello')).toBeInTheDocument();
});
```

## Coverage Requirements
- Statements: 80%
- Branches: 75%
- Functions: 80%
