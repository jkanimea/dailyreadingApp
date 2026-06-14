import { test, expect } from '@playwright/test';
import { mockAllRoutes } from './fixtures/mocks';

test.describe('Settings page', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllRoutes(page);
    await page.goto('/settings');
  });

  test('settings page loads without error', async ({ page }) => {
    await expect(page.locator('ion-content').first()).toBeVisible();
  });

  test('shows Settings header title', async ({ page }) => {
    await expect(page.locator('ion-title')).toContainText('Settings');
  });

  test('shows Reading section', async ({ page }) => {
    await expect(page.getByText('Reading')).toBeVisible();
  });

  test('shows Appearance section', async ({ page }) => {
    await expect(page.getByText('Appearance')).toBeVisible();
  });

  test('shows Notifications section', async ({ page }) => {
    await expect(page.getByText('Notifications')).toBeVisible();
  });

  test('shows Bible Version select', async ({ page }) => {
    await expect(page.locator('ion-select').first()).toBeVisible();
    await expect(page.getByText('Bible Version')).toBeVisible();
  });

  test('shows Theme select', async ({ page }) => {
    await expect(page.getByText('Theme')).toBeVisible();
  });

  test('shows Font Size select', async ({ page }) => {
    await expect(page.getByText('Font Size')).toBeVisible();
  });

  test('shows daily reminder toggle', async ({ page }) => {
    await expect(page.locator('ion-toggle')).toBeVisible();
    await expect(page.getByText(/Daily Devotional Reminders/i)).toBeVisible();
  });

  test('Switch Series button navigates to /series', async ({ page }) => {
    await page.locator('ion-item[button]').first().click();
    await expect(page).toHaveURL(/\/series/);
  });
});
