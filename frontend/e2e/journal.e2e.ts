import { test, expect } from '@playwright/test';
import { mockAllRoutes } from './fixtures/mocks';
import type { Route } from '@playwright/test';

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

  test('renders both mock journal entries', async ({ page }) => {
    // MOCK_JOURNAL now has 2 entries
    await expect(page.locator('.journal-card')).toHaveCount(2);
  });

  test('second journal card shows June 12 reading', async ({ page }) => {
    await expect(page.locator('.journal-subtitle').nth(1)).toContainText('John 3:14');
  });

  test('second card notes visible after expand', async ({ page }) => {
    await page.locator('.journal-card-header').nth(1).click();
    // Scope to the second card to avoid ambiguity with first card's notes
    await expect(page.locator('.journal-card').nth(1).locator('.journal-notes')).toContainText('Reflections on faith.');
  });

  test('shows empty state when no journal entries', async ({ page }) => {
    await page.route('**/api/v1/progress/series/1/journal', (r: Route) =>
      r.fulfill({ json: [] })
    );
    await page.goto('/tabs/journal');
    await page.waitForTimeout(500);
    await expect(page.locator('.journal-card')).toHaveCount(0);
  });
});
