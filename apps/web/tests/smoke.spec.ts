import { test, expect } from '@playwright/test';

test('loads the home page', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Auth Store Snapshot')).toBeVisible();
});

test('loads the register page', async ({ page }) => {
  await page.goto('/register');
  await expect(page.getByRole('heading', { name: 'Create your MixMatch account' })).toBeVisible();
});

test('redirects protected dashboard routes to login', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/);
});
