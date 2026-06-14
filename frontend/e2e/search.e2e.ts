import { test, expect } from '@playwright/test';
import { mockAllRoutes } from './fixtures/mocks';

// Search requires >=2 chars before firing. Results render in .result-card divs.

test.describe('Search page', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllRoutes(page);
    await page.goto('/search');
  });

  test('renders search input', async ({ page }) => {
    await expect(page.locator('ion-searchbar').first()).toBeVisible();
  });

  test('shows minimum-length hint with 1 character', async ({ page }) => {
    await page.locator('ion-searchbar').first().click();
    await page.keyboard.type('J');
    await expect(page.getByText(/at least 2 characters/i)).toBeVisible();
  });

  test('shows results after typing 2+ characters', async ({ page }) => {
    await page.locator('ion-searchbar').first().click();
    await page.keyboard.type('Jo');
    // Wait for debounce + mock response
    await expect(page.locator('.result-card').first()).toBeVisible({ timeout: 5000 });
  });

  test('result card shows bible reading', async ({ page }) => {
    await page.locator('ion-searchbar').first().click();
    await page.keyboard.type('Jo');
    await expect(page.locator('.result-card').first()).toContainText('John 3:16');
  });

  test('result card navigates to reading detail on click', async ({ page }) => {
    await page.locator('ion-searchbar').first().click();
    await page.keyboard.type('Jo');
    await page.locator('.result-card').first().click();
    await expect(page).toHaveURL(/\/reading\/101|\/tabs\/reading\/101/);
  });
});
