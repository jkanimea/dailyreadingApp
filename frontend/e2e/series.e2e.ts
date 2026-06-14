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

  test('renders both mock series cards', async ({ page }) => {
    // MOCK_SERIES now has 2 entries
    await expect(page.locator('.series-card')).toHaveCount(2);
  });

  test('shows second series name (Youth Series)', async ({ page }) => {
    await expect(page.locator('.series-card').nth(1)).toContainText('Youth Series');
  });

  test('shows second series book title', async ({ page }) => {
    // Template renders "Based on {title}" — author is not displayed separately
    await expect(page.locator('.series-card').nth(1)).toContainText('Steps to Christ');
  });
});
