import { test, expect } from '@playwright/test';
import { mockAllRoutes } from './fixtures/mocks';

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
    await checkbox.click();
    await expect(page.locator('ion-badge.completed-badge')).toBeVisible();
  });
});
