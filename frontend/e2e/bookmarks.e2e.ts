import { test, expect } from '@playwright/test';
import { mockAllRoutes } from './fixtures/mocks';

// Bookmarks page uses .bookmark-card divs, not ion-card/ion-item

test.describe('Bookmarks page', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllRoutes(page);
    await page.goto('/bookmarks');
  });

  test('displays existing bookmark card', async ({ page }) => {
    await expect(page.locator('.bookmark-card').first()).toBeVisible();
  });

  test('shows bookmarked bible reading', async ({ page }) => {
    await expect(page.getByText('John 3:15')).toBeVisible();
  });

  test('shows formatted date on bookmark', async ({ page }) => {
    // formatDate(6, 13) → "Jun 13"
    await expect(page.locator('.bookmark-card').first()).toContainText('Jun 13');
  });
});
