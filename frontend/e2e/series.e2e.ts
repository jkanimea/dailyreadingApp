import { test, expect } from '@playwright/test';
import { mockAllRoutes } from './fixtures/mocks';

test.describe('Series list', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllRoutes(page);
    await page.goto('/series');
  });

  test('displays series cards', async ({ page }) => {
    // Series page uses .series-card divs, not ion-card
    await expect(page.locator('.series-card').first()).toBeVisible();
  });

  test('shows series name', async ({ page }) => {
    await expect(page.locator('.series-card').first()).toContainText('Daily Devotional');
  });

  test('shows primary book name', async ({ page }) => {
    await expect(page.locator('.series-card').first()).toContainText('Oswald Chambers');
  });

  test('navigates into a series on tap', async ({ page }) => {
    await page.locator('.series-card').first().click();
    await expect(page).toHaveURL(/\/tabs\/today|\/reading|\/series\/1/);
  });
});
