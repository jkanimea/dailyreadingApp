import { test, expect } from '@playwright/test';
import { mockAllRoutes } from './fixtures/mocks';

// Journal cards are collapsed by default — click header to expand and reveal notes.

test.describe('Journal page', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllRoutes(page);
    await page.goto('/tabs/journal');
  });

  test('displays journal entry card', async ({ page }) => {
    await expect(page.locator('.journal-card').first()).toBeVisible();
  });

  test('shows bible reading reference in card header', async ({ page }) => {
    await expect(page.locator('.journal-subtitle').first()).toContainText('John 3:15');
  });

  test('shows series name in page header', async ({ page }) => {
    await expect(page.locator('.header-title-text')).toContainText('Daily Devotional');
  });

  test('reveals notes after expanding card', async ({ page }) => {
    // Cards are collapsed — click header to expand
    await page.locator('.journal-card-header').first().click();
    await expect(page.locator('.journal-notes').first()).toBeVisible();
    await expect(page.locator('.journal-notes').first()).toContainText('Great reading yesterday.');
  });
});
