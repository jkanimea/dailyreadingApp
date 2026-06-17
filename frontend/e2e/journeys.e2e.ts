import { test, expect } from '@playwright/test';
import { mockAllRoutes } from './fixtures/mocks';
import type { Route } from '@playwright/test';

// Cross-feature integration tests — simulate real user flows across multiple pages.

test.describe('User journeys', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllRoutes(page);
  });

  // ── Tab navigation ────────────────────────────────────────────────────────────
  test('tab bar navigates between Today, Calendar, Journal, More', async ({ page }) => {
    await page.goto('/tabs/today');
    await expect(page.locator('ion-tab-bar')).toBeVisible();

    // Calendar tab
    await page.locator('ion-tab-button[tab="calendar"]').click();
    await expect(page).toHaveURL(/\/tabs\/calendar/);

    // Journal tab
    await page.locator('ion-tab-button[tab="journal"]').click();
    await expect(page).toHaveURL(/\/tabs\/journal/);

    // More tab
    await page.locator('ion-tab-button[tab="more"]').click();
    await expect(page).toHaveURL(/\/tabs\/more/);

    // Back to Today
    await page.locator('ion-tab-button[tab="today"]').click();
    await expect(page).toHaveURL(/\/tabs\/today/);
  });

  // ── More → Search → Result → Reading Detail ──────────────────────────────────
  test('journey: More → Search → result → reading detail', async ({ page }) => {
    await page.goto('/tabs/more');

    // Navigate to Search via More tile
    await page.locator('.more-item').filter({ hasText: 'Search' }).click();
    await expect(page).toHaveURL(/\/search/);

    // Type search query and wait for results
    await page.locator('ion-searchbar').first().click();
    await page.keyboard.type('Jo');
    await expect(page.locator('.result-card').first()).toBeVisible({ timeout: 5000 });

    // Click result to go to reading detail
    await page.locator('.result-card').first().click();
    await expect(page).toHaveURL(/\/reading\/101|\/tabs\/reading\/101/);

    // Reading detail shows bible reference inside section body
    await expect(page.locator('app-reading-detail .bible-section-title')).toContainText('John 3:16');
  });

  // ── Today → Settings → back ──────────────────────────────────────────────────
  test('journey: Today → Settings → back to Today', async ({ page }) => {
    await page.goto('/tabs/today');

    // Click the ion-button directly (not inner icon — Ionic shadow DOM intercepts)
    await page.locator('ion-buttons[slot="end"] > ion-button').first().click();
    await expect(page).toHaveURL(/\/settings/);
    await expect(page.getByText('Bible Version')).toBeVisible();

    // Navigate back
    await page.goBack();
    await expect(page).toHaveURL(/\/tabs\/today/);
  });

  // ── More → Bookmarks → Reading Detail ────────────────────────────────────────
  test('journey: More → Bookmarks → reading detail', async ({ page }) => {
    await page.goto('/tabs/more');
    await page.locator('.more-item').filter({ hasText: 'Bookmarks' }).click();
    await expect(page).toHaveURL(/\/bookmarks/);

    await expect(page.locator('.bookmark-card').first()).toBeVisible();
    await page.locator('.bookmark-card').first().click();
    await expect(page).toHaveURL(/\/reading\/100|\/tabs\/reading\/100/);
  });

  // ── More → Progress page loads stats ─────────────────────────────────────────
  test('journey: More → Progress shows series stats', async ({ page }) => {
    await page.goto('/tabs/more');
    await page.locator('.more-item').filter({ hasText: 'Progress' }).click();
    await expect(page).toHaveURL(/\/progress/);
    await expect(page.locator('.stats-card').first()).toBeVisible();
    await expect(page.getByText('100')).toBeVisible(); // completedCount
  });

  // ── Calendar → day click → Reading Detail ────────────────────────────────────
  test('journey: Calendar day click → reading detail', async ({ page }) => {
    await page.goto('/tabs/calendar');
    // Wait for readings to load then click day 14 (has MOCK_READING_DETAIL with id:101)
    await page.waitForTimeout(500);
    const day14 = page.locator('.calendar-cell').filter({ hasText: '14' });
    await expect(day14).toBeVisible();
    await day14.click();
    await expect(page).toHaveURL(/\/reading\/101|\/tabs\/reading\/101/);
  });

  // ── Journal → expand card → see notes ────────────────────────────────────────
  test('journey: Journal expand reveals notes text', async ({ page }) => {
    await page.goto('/tabs/journal');
    await expect(page.locator('.journal-card').first()).toBeVisible();
    await page.locator('.journal-card-header').first().click();
    await expect(page.locator('.journal-notes').first()).toContainText('Great reading yesterday.');
  });

  // ── More → Account page ───────────────────────────────────────────────────────
  test('journey: More → Account shows Account page', async ({ page }) => {
    await page.goto('/tabs/more');
    await page.locator('.more-item').filter({ hasText: 'Account' }).click();
    await expect(page).toHaveURL(/\/account/);
    await expect(page.locator('app-account ion-title')).toContainText('Account');
  });

  // ── Root redirect ─────────────────────────────────────────────────────────────
  test('navigating to root redirects to Today tab', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/tabs\/today/);
    await expect(page.locator('ion-tab-bar')).toBeVisible();
  });

  // ── Admin shortcut from More ──────────────────────────────────────────────────
  test('admin logs page accessible via direct URL', async ({ page }) => {
    await page.goto('/admin/logs');
    await expect(page).toHaveURL(/\/admin\/logs/);
    await expect(page.getByText('HTTP 401')).toBeVisible();
  });
});
