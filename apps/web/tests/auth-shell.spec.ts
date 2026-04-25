import { test, expect } from '@playwright/test';

test('dashboard renders app shell when authenticated', async ({ page }) => {
  await page.goto('/dashboard');
  // Should not redirect to login
  await expect(page).not.toHaveURL(/\/login/);
  await expect(page.getByRole('heading', { name: 'MixMatch dashboard' })).toBeVisible();
});

test('dashboard overview page loads', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).not.toHaveURL(/\/login/);
  // Page renders without crashing
  await expect(page.locator('body')).toBeVisible();
});

test('discover route is accessible when authenticated', async ({ page }) => {
  await page.goto('/dashboard/discover');
  await expect(page).not.toHaveURL(/\/login/);
  await expect(page.locator('body')).toBeVisible();
});

test('resonance route is accessible when authenticated', async ({ page }) => {
  await page.goto('/dashboard/resonance');
  await expect(page).not.toHaveURL(/\/login/);
  await expect(page.locator('body')).toBeVisible();
});
