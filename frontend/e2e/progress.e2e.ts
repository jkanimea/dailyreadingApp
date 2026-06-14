import { test, expect } from '@playwright/test';
import { mockAllRoutes } from './fixtures/mocks';

// Progress page shows stats per series (streak, completedCount, percentage)
// not individual ProgressDto entries.

test.describe('Progress page', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllRoutes(page);
    await page.goto('/progress');
  });

  test('displays a series stats card', async ({ page }) => {
    await expect(page.locator('.stats-card').first()).toBeVisible();
  });

  test('shows series name in stats card', async ({ page }) => {
    await expect(page.locator('.stats-card').first()).toContainText('Daily Devotional');
  });

  test('shows completed count', async ({ page }) => {
    // Mock returns completedCount: 100
    await expect(page.getByText('100')).toBeVisible();
  });

  test('shows current streak', async ({ page }) => {
    // Mock returns streak: 3
    await expect(page.getByText(/3 day/)).toBeVisible();
  });
});
