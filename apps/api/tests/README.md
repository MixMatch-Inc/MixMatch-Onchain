# 🛠️ V2 Core E2E Test Harness Guide

Welcome to the NexaFx testing baseline infrastructure. This testing harness decouples E2E execution flows from external Stellar ledger updates and handles database isolation cleanly between local test runs.

## 🚀 Architectural Breakdown
The test harness provides two main utilities to speed up feature integration tests:
1. `DbTestUtils`: Automates cascading table truncations (`clearDatabase`) and flushes active Redis instances (`clearRedis`) before each test run.
2. `TestHarness`: Bootstraps the Nest.js application context, injects mock dependencies for blockchain verification, and spins up a factory to generate pre-authenticated HTTP clients instantly.

## 📝 Usage Example

When building features on the `v2` track (e.g., Compliance Dashboards, Payment Splits, Financial Health), use this clean template to write your E2E specs:

```typescript
import { TestHarness } from './harness/test-agent-factory';
import { DbTestUtils } from './harness/db-test-utils';
import { HttpStatus } from '@nestjs/common';

describe('Feature Suite Name (E2E)', () => {
  const harness = new TestHarness();

  beforeAll(async () => {
    // 1. Core setup initializes isolated Nest application context & mocks external signatures
    await harness.initialize();
  });

  afterAll(async () => {
    // 2. Tear down connections to avoid memory leaks
    await harness.close();
  });

  beforeEach(async () => {
    // 3. Keep runs isolated by wiping state data without altering table definitions
    await DbTestUtils.clearDatabase(harness.dataSource);
    await DbTestUtils.clearRedis(harness.redisClient);
  });

  it('GET /v2/protected-route -> should allow authenticated requests', async () => {
    // Factory method instantly creates a pre-authenticated agent with appropriate RBAC roles
    const authAgent = harness.createAuthenticatedAgent({
      id: 'usr_882847',
      email: 'dev@nexafx.com',
      role: 'USER',
    });

    await authAgent
      .get('/v2/protected-route')
      .expect(HttpStatus.OK);
  });
});