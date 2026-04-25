import { test as setup } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const SESSION_FILE = path.join(__dirname, '.auth/session.json');

setup('inject auth session', async ({ page }) => {
  // Seed a fake auth token via cookie so middleware lets us through.
  // In CI the API is not running, so we inject a plausible session directly
  // into localStorage + cookie rather than hitting a real login endpoint.
  await page.goto('/');

  await page.evaluate(() => {
    const fakeUser = {
      id: 'test-user-1',
      name: 'Test User',
      email: 'test@mixmatch.io',
      role: 'DJ',
      onboardingCompleted: true,
    };
    const fakeToken = 'test-token-playwright';

    // Zustand persisted store
    localStorage.setItem(
      'mixmatch-auth-store',
      JSON.stringify({
        state: { user: fakeUser, role: fakeUser.role, token: fakeToken, isAuthenticated: true },
        version: 0,
      }),
    );
  });

  // Set the auth cookie that the middleware checks
  await page.context().addCookies([
    {
      name: 'mixmatch_auth_token',
      value: 'test-token-playwright',
      domain: '127.0.0.1',
      path: '/',
      sameSite: 'Lax',
    },
  ]);

  // Persist storage state
  fs.mkdirSync(path.dirname(SESSION_FILE), { recursive: true });
  await page.context().storageState({ path: SESSION_FILE });
});
