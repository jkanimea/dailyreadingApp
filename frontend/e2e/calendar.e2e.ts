import { test, expect } from '@playwright/test';
import { mockAllRoutes } from './fixtures/mocks';

test.describe('Calendar page', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllRoutes(page);
    await page.goto('/tabs/calendar');
  });

  test('calendar page loads', async ({ page }) => {
    await expect(page.locator('ion-content').first()).toBeVisible();
  });

  test('shows current month', async ({ page }) => {
    const now = new Date();
    const monthName = now.toLocaleString('default', { month: 'long' });
    await expect(page.getByText(new RegExp(monthName, 'i'))).toBeVisible();
  });

  test('shows month navigation arrows', async ({ page }) => {
    // Click the buttons themselves, not the icons (Ionic shadow DOM intercepts icon events)
    await expect(page.locator('.month-header ion-button').first()).toBeVisible();
    await expect(page.locator('.month-header ion-button').last()).toBeVisible();
  });

  test('shows day-name headers (Sun/Mon etc)', async ({ page }) => {
    const dayNames = page.locator('.day-names span');
    await expect(dayNames.first()).toBeVisible();
    await expect(dayNames).toHaveCount(7);
  });

  test('renders calendar grid cells', async ({ page }) => {
    await expect(page.locator('.calendar-cell').first()).toBeVisible();
  });

  test('previous month button changes month display', async ({ page }) => {
    const now = new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthName = prevMonth.toLocaleString('default', { month: 'long' });

    // Click the ion-button container, not the icon inside (Ionic intercepts icon pointer events)
    await page.locator('.month-header ion-button').first().click();
    await expect(page.getByText(new RegExp(prevMonthName, 'i'))).toBeVisible();
  });

  test('next month button changes month display', async ({ page }) => {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const nextMonthName = nextMonth.toLocaleString('default', { month: 'long' });

    await page.locator('.month-header ion-button').last().click();
    await expect(page.getByText(new RegExp(nextMonthName, 'i'))).toBeVisible();
  });

  test('clicking day 14 navigates to reading detail', async ({ page }) => {
    // MOCK_READING_DETAIL has day:14 — only cells with a loaded reading navigate
    // Wait for calendar to finish loading (readings are fetched async)
    await page.waitForTimeout(500);
    const day14 = page.locator('.calendar-cell').filter({ hasText: '14' });
    await expect(day14).toBeVisible();
    await day14.click();
    await expect(page).toHaveURL(/\/reading\/101|\/tabs\/reading\/101/);
  });
});
