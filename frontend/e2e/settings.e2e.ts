import { test, expect } from '@playwright/test';
import { mockAllRoutes } from './fixtures/mocks';

test.describe('Settings page', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllRoutes(page);
    await page.goto('/settings');
  });

  test('settings page loads without error', async ({ page }) => {
    await expect(page.locator('ion-content').first()).toBeVisible();
  });

  test('shows settings header', async ({ page }) => {
    await expect(page.locator('ion-title, h1, h2').first()).toBeVisible();
  });
});
