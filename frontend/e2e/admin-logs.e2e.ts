import { test, expect } from '@playwright/test';
import { mockAllRoutes } from './fixtures/mocks';

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
});
