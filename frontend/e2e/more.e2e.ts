import { test, expect } from '@playwright/test';
import { mockAllRoutes } from './fixtures/mocks';

// More page lives at /tabs/more — a 3-column grid of .more-item tiles.
// Each tile navigates to its destination via routerLink.

test.describe('More page', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllRoutes(page);
    await page.goto('/tabs/more');
  });

  test('renders 6 navigation tiles', async ({ page }) => {
    await expect(page.locator('.more-item')).toHaveCount(6);
  });

  test('shows Search tile', async ({ page }) => {
    await expect(page.locator('.more-item').filter({ hasText: 'Search' })).toBeVisible();
  });

  test('shows Bookmarks tile', async ({ page }) => {
    await expect(page.locator('.more-item').filter({ hasText: 'Bookmarks' })).toBeVisible();
  });

  test('shows Progress tile', async ({ page }) => {
    await expect(page.locator('.more-item').filter({ hasText: 'Progress' })).toBeVisible();
  });

  test('shows Settings tile', async ({ page }) => {
    await expect(page.locator('.more-item').filter({ hasText: 'Settings' })).toBeVisible();
  });

  test('shows Account tile', async ({ page }) => {
    await expect(page.locator('.more-item').filter({ hasText: 'Account' })).toBeVisible();
  });

  test('shows Switch Series tile', async ({ page }) => {
    await expect(page.locator('.more-item').filter({ hasText: 'Switch Series' })).toBeVisible();
  });

  test('Search tile navigates to /search', async ({ page }) => {
    await page.locator('.more-item').filter({ hasText: 'Search' }).click();
    await expect(page).toHaveURL(/\/search/);
  });

  test('Bookmarks tile navigates to /bookmarks', async ({ page }) => {
    await page.locator('.more-item').filter({ hasText: 'Bookmarks' }).click();
    await expect(page).toHaveURL(/\/bookmarks/);
  });

  test('Progress tile navigates to /progress', async ({ page }) => {
    await page.locator('.more-item').filter({ hasText: 'Progress' }).click();
    await expect(page).toHaveURL(/\/progress/);
  });

  test('Settings tile navigates to /settings', async ({ page }) => {
    await page.locator('.more-item').filter({ hasText: 'Settings' }).click();
    await expect(page).toHaveURL(/\/settings/);
  });

  test('tab bar is visible on More page', async ({ page }) => {
    await expect(page.locator('ion-tab-bar')).toBeVisible();
  });
});
