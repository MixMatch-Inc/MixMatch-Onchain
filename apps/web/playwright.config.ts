import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  use: {
    baseURL: 'http://127.0.0.1:3100',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'pnpm dev --hostname 127.0.0.1 --port 3100',
    cwd: __dirname,
    url: 'http://127.0.0.1:3100',
    reuseExistingServer: false,
  },
});
