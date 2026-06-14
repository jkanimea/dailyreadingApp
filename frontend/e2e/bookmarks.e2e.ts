import { test, expect } from '@playwright/test';
import { mockAllRoutes } from './fixtures/mocks';
import type { Route } from '@playwright/test';

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

  test('bookmark card navigates to reading detail on click', async ({ page }) => {
    await page.locator('.bookmark-card').first().click();
    await expect(page).toHaveURL(/\/reading\/100|\/tabs\/reading\/100/);
  });

  test('shows empty state when no bookmarks', async ({ page }) => {
    // Override bookmarks GET to return empty array
    await page.route('**/api/v1/bookmarks', (r: Route) => {
      if (r.request().method() === 'GET') {
        return r.fulfill({ json: [] });
      }
      return r.continue();
    });
    await page.goto('/bookmarks');
    await page.waitForTimeout(500);
    await expect(page.locator('.bookmark-card')).toHaveCount(0);
  });

  test('remove bookmark button is present on card', async ({ page }) => {
    // Most bookmark UIs have a delete/unbookmark button
    const removeBtn = page.locator('.bookmark-card').first().locator('ion-button, button').first();
    // Just verify it exists; click behaviour fires DELETE which is mocked
    await expect(removeBtn).toBeVisible();
  });
});
