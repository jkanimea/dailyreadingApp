import { test, expect } from '@playwright/test';
import { mockAllRoutes, seedAuthToken, seedGuestToken } from './fixtures/mocks';

// Account page: /account
// - Guest view: shown when auth.isGuest() → true (token = 'guest-token-12345')
// - Authenticated view: shown when auth.isGuest() → false (real JWT in localStorage)
//   The page calls GET /api/v1/auth/me to refresh user data.

test.describe('Account page — authenticated', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllRoutes(page);
    // Navigate to a page first so localStorage is accessible, then seed
    await page.goto('/tabs/today');
    await seedAuthToken(page);
    await page.goto('/account');
  });

  test('shows user display name', async ({ page }) => {
    await expect(page.getByText('Test User')).toBeVisible({ timeout: 5000 });
  });

  test('shows user email', async ({ page }) => {
    await expect(page.getByText('test@example.com')).toBeVisible({ timeout: 5000 });
  });

  test('shows role badge', async ({ page }) => {
    await expect(page.locator('ion-badge')).toContainText('User');
  });

  test('shows provider (signed in with Google)', async ({ page }) => {
    await expect(page.getByText('Google')).toBeVisible({ timeout: 5000 });
  });

  test('shows logout button', async ({ page }) => {
    await expect(page.locator('ion-button[color="danger"]')).toBeVisible();
    await expect(page.locator('ion-button[color="danger"]')).toContainText('Logout');
  });

  test('does not show guest section', async ({ page }) => {
    await expect(page.locator('.guest-section')).not.toBeVisible();
  });
});

test.describe('Account page — guest', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllRoutes(page);
    await page.goto('/tabs/today');
    await seedGuestToken(page);
    await page.goto('/account');
  });

  test('shows Guest display name', async ({ page }) => {
    await expect(page.locator('.guest-section .display-name')).toContainText('Guest');
  });

  test('shows sign-in prompt text', async ({ page }) => {
    await expect(page.getByText(/sign in to save/i)).toBeVisible({ timeout: 5000 });
  });

  test('shows Sign In button', async ({ page }) => {
    await expect(page.locator('.guest-section ion-button')).toContainText('Sign In');
  });

  test('Sign In button navigates to login page', async ({ page }) => {
    await page.locator('.guest-section ion-button').click();
    await expect(page).toHaveURL(/\/login/);
  });
});
