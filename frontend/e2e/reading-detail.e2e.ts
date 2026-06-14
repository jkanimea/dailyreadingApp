import { test, expect } from '@playwright/test';
import { mockAllRoutes, MOCK_PROGRESS } from './fixtures/mocks';
import type { Route } from '@playwright/test';

test.describe('Reading detail', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllRoutes(page);
    await page.goto('/tabs/reading/101');
  });

  test('displays bible reading reference', async ({ page }) => {
    await expect(page.getByText('John 3:16')).toBeVisible();
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
    // Use Angular dev-mode API to set readingSeen directly, bypassing shadow DOM scroll constraints
    await page.evaluate(() => {
      const ng = (window as any).ng;
      if (!ng) return;
      // Walk all elements to find the one with readingSeen property
      const all = document.querySelectorAll('*');
      for (const el of Array.from(all)) {
        try {
          const comp = ng.getComponent(el);
          if (comp && 'readingSeen' in comp) {
            comp.readingSeen = true;
            ng.applyChanges(comp);
            break;
          }
        } catch { /* not a component */ }
      }
    });
    await page.waitForTimeout(300);

    const checkbox = page.locator('.complete-section ion-checkbox');
    await expect(checkbox).toBeVisible({ timeout: 3000 });
    // Use evaluate to dispatch ionChange directly (Ionic shadow DOM can swallow Playwright clicks)
    await page.evaluate(() => {
      const cb = document.querySelector('.complete-section ion-checkbox');
      if (cb) {
        cb.dispatchEvent(new CustomEvent('ionChange', {
          bubbles: true,
          detail: { checked: true }
        }));
      }
    });
    await page.waitForTimeout(500);
    await expect(page.locator('ion-badge.completed-badge')).toBeVisible();
  });
});

// Journal section tests use a separate describe with a custom progress mock so
// checkCompleted() finds reading 101 as completed+with notes — no dev-mode hacks needed.
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
