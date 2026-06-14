import { test, expect } from '@playwright/test';
import { mockAllRoutes } from './fixtures/mocks';

test.describe('Today page', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllRoutes(page);
    await page.goto('/tabs/today');
  });

  test('displays todays reading title', async ({ page }) => {
    await expect(page.locator('ion-title, h1, h2').first()).toBeVisible();
  });

  test('shows bible reading reference', async ({ page }) => {
    await expect(page.getByText('John 3:16')).toBeVisible();
  });

  test('shows page range for primary book', async ({ page }) => {
    await expect(page.getByText('170-172')).toBeVisible();
  });
});
