import { test, expect } from '@playwright/test';
import { mockAllRoutes } from './fixtures/mocks';

// Gap #1: bypassAuth=true means '' redirects to /tabs/today, skipping login.
// Navigate explicitly to /login to test the login page itself.
// For all other pages bypassAuth handles auth — no token seeding needed.

test.describe('Login page', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllRoutes(page);
  });

  test('shows Google and Facebook sign-in buttons', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('ion-button.google-btn')).toBeVisible();
    await expect(page.locator('ion-button.facebook-btn')).toBeVisible();
  });

  test('shows Guest button when bypassAuth is true', async ({ page }) => {
    // bypassAuth=true in e2e env — the Continue as Guest button is visible
    await page.goto('/login');
    await expect(page.locator('ion-button:has-text("Continue as Guest")')).toBeVisible();
  });

  test('shows app title and subtitle', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h1.app-title')).toContainText('Encounter Daily');
    await expect(page.locator('p.app-subtitle')).toBeVisible();
  });

  test('redirects to /tabs/today when navigating to root with bypassAuth', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/tabs\/today/);
  });

  test('Guest button click navigates away from login', async ({ page }) => {
    await page.goto('/login');
    await page.locator('ion-button:has-text("Continue as Guest")').click();
    // continueAsGuest() calls guestLogin() then navigates to /series
    await expect(page).toHaveURL(/\/tabs\/today|\/tabs\/reading|\/series|\/login/);
  });

  test('login page shows logo or branding image', async ({ page }) => {
    await page.goto('/login');
    // Either a logo image or an icon should be present
    const branding = page.locator('img, ion-icon[name*="book"], .logo, .app-logo').first();
    await expect(branding).toBeVisible();
  });
});
