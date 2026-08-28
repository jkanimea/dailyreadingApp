import { test, expect } from '@playwright/test';
import { mockAllRoutes, MOCK_PROGRESS, MOCK_READING_DETAIL } from './fixtures/mocks';
import type { Route } from '@playwright/test';

test.describe('Reading detail', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllRoutes(page);
    await page.goto('/tabs/reading/101');
  });

  test('displays bible reading reference', async ({ page }) => {
    await expect(page.locator('.bible-section-title')).toContainText('John 3:16');
  });

  test('displays reading body text', async ({ page }) => {
    await expect(page.getByText(/Today's devotional text/)).toBeVisible();
  });

  test('shows page range metadata', async ({ page }) => {
    await expect(page.getByText('170-172')).toBeVisible();
  });

  test('completion checkbox hidden until 85% scroll (gap #4)', async ({ page }) => {
    // Checkbox lives inside .complete-section which is guarded by readingSeen
    const checkbox = page.locator('.complete-section ion-checkbox');
    await expect(checkbox).not.toBeVisible();

    // Scroll ion-content to bottom to trigger readingSeen flag
    await page.evaluate(() => {
      const content = document.querySelector('ion-content');
      if (content) {
        (content as any).scrollToBottom(0);
        // Also dispatch a synthetic scroll event so Angular picks it up
        const el = content.shadowRoot?.querySelector('.inner-scroll') ?? content;
        el.dispatchEvent(new CustomEvent('ionScroll', {
          bubbles: true,
          detail: { scrollTop: 9999 }
        }));
      }
    });

    // Give Angular change detection a tick
    await page.waitForTimeout(300);
    await expect(checkbox).toBeVisible();
  });

  test('marks reading complete after scrolling', async ({ page }) => {
    // Scroll ion-content to bottom to trigger readingSeen flag (same approach as test #4)
    await page.evaluate(() => {
      const content = document.querySelector('ion-content');
      if (content) {
        (content as any).scrollToBottom(0);
        const el = content.shadowRoot?.querySelector('.inner-scroll') ?? content;
        el.dispatchEvent(new CustomEvent('ionScroll', {
          bubbles: true,
          detail: { scrollTop: 9999 }
        }));
      }
    });
    await page.waitForTimeout(300);

    const checkbox = page.locator('.complete-section ion-checkbox');
    await expect(checkbox).toBeVisible({ timeout: 3000 });
    // Click the checkbox label text which Ionic turns into a toggle interaction
    await page.locator('.complete-section').getByText('I have read this passage').click();
    await page.waitForTimeout(1000);
    await expect(page.locator('ion-badge.completed-badge')).toBeVisible({ timeout: 5000 });
  });
});

// Journal section tests use a separate describe with a custom progress mock so
// checkCompleted() finds reading 101 as completed+with notes — no dev-mode hacks needed.
test.describe('Reading detail — navigation arrows', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllRoutes(page);
    await page.goto('/tabs/reading/101');
  });

  test('renders left arrow before date and right arrow after series', async ({ page }) => {
    const arrows = page.locator('.meta-primary .nav-arrow');
    await expect(arrows).toHaveCount(2);
    await expect(arrows.nth(0)).toBeEnabled();
    await expect(arrows.nth(1)).toBeEnabled();
    await expect(arrows.nth(0).locator('ion-icon')).toHaveAttribute('name', 'chevron-back');
    await expect(arrows.nth(1).locator('ion-icon')).toHaveAttribute('name', 'chevron-forward');
  });

  test('right arrow navigates to next reading', async ({ page }) => {
    await page.route('**/api/v1/reading/102/full**', (r: Route) =>
      r.fulfill({ json: { ...MOCK_READING_DETAIL, id: 102, day: 15 } })
    );
    await page.route('**/api/v1/reading/102/summary', (r: Route) =>
      r.fulfill({ json: { id: 102, summaryPoints: null } })
    );
    await page.locator('.meta-primary .nav-arrow').nth(1).click();
    await expect(page).toHaveURL(/\/reading\/102/);
  });
});

test.describe('Reading detail — journal section', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllRoutes(page);
    // Override progress to return reading 101 as completed with notes (last-registered wins)
    await page.route('**/api/v1/progress/series/**', (r: Route) =>
      r.fulfill({ json: [
        MOCK_PROGRESS[0],
        {
          readingId: 101, seriesId: 1, isCompleted: true,
          notes: 'My saved note.', completedAt: '2026-06-14T10:00:00Z',
          month: 6, day: 14, bibleReading: 'John 3:16'
        }
      ] })
    );
    await page.goto('/tabs/reading/101');
  });

  test('journal section appears when reading is completed with notes', async ({ page }) => {
    // checkCompleted() loads notes from the mocked progress → journal section shows
    await expect(page.locator('.journal-toggle')).toBeVisible({ timeout: 5000 });
  });

  test('journal notes textarea shown after expanding journal section', async ({ page }) => {
    // checkCompleted() auto-expands showNotes when notes exist, so textarea is already visible
    await expect(page.locator('ion-textarea.journal-textarea')).toBeVisible({ timeout: 5000 });
  });
});
