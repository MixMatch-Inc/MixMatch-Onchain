import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'setup',
      testMatch: '**/auth.setup.ts',
    },
    {
      name: 'authenticated',
      testMatch: ['**/auth-shell.spec.ts', '**/discovery-card-snapshots.spec.ts'],
      dependencies: ['setup'],
      use: { storageState: 'tests/.auth/session.json' },
    },
    {
      name: 'unauthenticated',
      testMatch: '**/smoke.spec.ts',
    },
  ],
  webServer: {
    command: 'pnpm dev --hostname 127.0.0.1 --port 3000',
    cwd: __dirname,
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: true,
  },
});
