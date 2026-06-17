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
    await expect(page.locator('.bible-section-title')).toContainText('John 3:16');
  });

  test('shows page range for primary book', async ({ page }) => {
    await expect(page.getByText('170-172')).toBeVisible();
  });

  test('shows series name in reading meta', async ({ page }) => {
    // Series name now in .meta-series beside the date
    await expect(page.locator('.meta-series')).toContainText('Daily Devotional');
  });

  test('shows formatted date', async ({ page }) => {
    // MOCK_READING_DETAIL has month:6, day:14 → "Jun 14"
    await expect(page.getByText('Jun 14')).toBeVisible();
  });

  test('settings button is visible in header', async ({ page }) => {
    // Find the direct ion-button child in the end slot (avoids avatar button)
    await expect(page.locator('ion-buttons[slot="end"] > ion-button').first()).toBeVisible();
  });

  test('settings button navigates to settings page', async ({ page }) => {
    // Click the ion-button directly — clicking inner ion-icon is intercepted by Ionic shadow DOM
    await page.locator('ion-buttons[slot="end"] > ion-button').first().click();
    await expect(page).toHaveURL(/\/settings/);
  });

  test('bible reading section is visible and expandable', async ({ page }) => {
    // Section header
    await expect(page.locator('.section-header').first()).toBeVisible();
    await expect(page.locator('.section-header').first()).toContainText('Bible Reading');
    // Bible section title inside body
    await expect(page.locator('.bible-section-title')).toContainText('John 3:16');
  });

  test('complete checkbox is visible on today page (no scroll gate)', async ({ page }) => {
    // Today page does NOT have 85% scroll gate — checkbox is always visible
    await expect(page.locator('.complete-section ion-checkbox')).toBeVisible();
  });
});
