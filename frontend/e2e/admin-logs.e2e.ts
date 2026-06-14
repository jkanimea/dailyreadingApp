import { test, expect } from '@playwright/test';
import { mockAllRoutes, MOCK_LOGS_EMPTY } from './fixtures/mocks';
import type { Route } from '@playwright/test';

// Gap #7: Admin logs page calls GET /api/v1/logs — must be mocked.
// Gap #2: With bypassAuth=true, AdminGuard passes unconditionally.

test.describe('Admin logs page', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllRoutes(page);
    await page.goto('/admin/logs');
  });

  test('loads without redirect', async ({ page }) => {
    await expect(page).toHaveURL(/\/admin\/logs/);
  });

  test('displays log entries', async ({ page }) => {
    await expect(page.locator('ion-content').first()).toBeVisible();
    await expect(page.getByText('HTTP 401')).toBeVisible();
  });

  test('shows log level badge', async ({ page }) => {
    await expect(page.locator('ion-badge, .level-badge, [class*="level"]').first()).toBeVisible();
  });

  test('shows log source', async ({ page }) => {
    await expect(page.getByText('AuthInterceptor')).toBeVisible();
  });

  test('shows total entries count', async ({ page }) => {
    // "2 total entries" from MOCK_LOGS.totalCount
    await expect(page.getByText(/2 total entries/i)).toBeVisible();
  });

  test('shows filter section', async ({ page }) => {
    await expect(page.getByText('Filters')).toBeVisible();
    await expect(page.locator('ion-button:has-text("Apply")')).toBeVisible();
  });

  test('shows delete old logs button', async ({ page }) => {
    await expect(page.locator('ion-button:has-text("Delete Old Logs")')).toBeVisible();
  });

  test('delete old logs shows confirmation message', async ({ page }) => {
    await page.locator('ion-button:has-text("Delete Old Logs")').click();
    // Mock returns { deleted: 5, message: 'Deleted 5 log entries...' }
    await expect(page.getByText(/Deleted 5/i)).toBeVisible({ timeout: 3000 });
  });

  test('shows empty state when no logs', async ({ page }) => {
    await page.route('**/api/v1/logs**', (r: Route) => {
      if (r.request().method() !== 'POST') {
        return r.fulfill({ json: MOCK_LOGS_EMPTY });
      }
      return r.fulfill({ status: 200, json: { received: 1 } });
    });
    await page.goto('/admin/logs');
    await expect(page.locator('.empty-state')).toBeVisible({ timeout: 3000 });
    await expect(page.getByText(/No log entries found/i)).toBeVisible();
  });

  test('shows both log origins (client and server)', async ({ page }) => {
    // MOCK_LOGS has both 'client' and 'server' origin entries shown in .origin-badge
    await expect(page.locator('.origin-badge').filter({ hasText: 'client' })).toBeVisible();
    await expect(page.locator('.origin-badge').filter({ hasText: 'server' })).toBeVisible();
  });

  test('clear filter button is visible', async ({ page }) => {
    await expect(page.locator('ion-button:has-text("Clear")')).toBeVisible();
  });
});
