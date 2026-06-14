import { test, expect } from '@playwright/test';
import { mockAllRoutes } from './fixtures/mocks';

test.describe('Calendar page', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllRoutes(page);
    await page.goto('/tabs/calendar');
  });

  test('calendar page loads', async ({ page }) => {
    await expect(page.locator('ion-content').first()).toBeVisible();
  });

  test('shows current month', async ({ page }) => {
    const now = new Date();
    const monthName = now.toLocaleString('default', { month: 'long' });
    // Calendar should show current month name somewhere
    await expect(page.getByText(new RegExp(monthName, 'i'))).toBeVisible();
  });
});
