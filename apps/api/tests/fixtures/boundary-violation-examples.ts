/**
 * Test fixture to verify ESLint boundary rules work correctly
 * 
 * This file contains intentionally invalid imports that SHOULD fail lint.
 * It is excluded from normal builds and only used to test the lint rules.
 * 
 * TO TEST: Temporarily include this file in ESLint and verify it produces errors.
 */

// @ts-nocheck
// eslint-disable-next-line @typescript-eslint/no-unused-vars

// INVALID: API should not import from web app
// This should produce: Workspace "apps/api" is not allowed to import from "apps/web"
// import { HomePage } from '../../web/app/page';

// INVALID: API should not import from mobile app  
// This should produce: Workspace "apps/api" is not allowed to import from "apps/mobile"
// import { MobileScreen } from '../../mobile/src/screens/home';

// INVALID: Controllers should not directly import models
// This should produce: Layer "controllers" should not import from "models"
// In a real controller file:
// import { UserModel } from '../../domains/identity/user.model';

// VALID: API can import from packages
// These should NOT produce errors:
// import { User } from '@mixmatch/types';
// import { logger } from '@mixmatch/logger';
// import { env } from '@mixmatch/env-manifest';

export const BOUNDARY_TEST_FIXTURE = {
  description: 'This file documents invalid imports that should fail lint',
  invalidImports: [
    {
      from: 'apps/api',
      import: 'apps/web/app/page',
      reason: 'Apps cannot import from other apps',
    },
    {
      from: 'apps/api',
      import: 'apps/mobile/src/screens',
      reason: 'Apps cannot import from other apps',
    },
    {
      from: 'apps/api/controllers',
      import: 'apps/api/domains/identity/user.model',
      reason: 'Controllers must use services, not models directly',
    },
  ],
  validImports: [
    {
      from: 'apps/api',
      import: '@mixmatch/types',
      reason: 'Apps can import from shared packages',
    },
    {
      from: 'apps/api',
      import: '@mixmatch/logger',
      reason: 'Apps can import from shared packages',
    },
  ],
};
