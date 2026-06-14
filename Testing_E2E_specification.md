# E2E Testing Specification — Encounter Daily

## Overview

End-to-end tests use **Playwright** running against the Angular dev server with **mocked API responses**.
No real backend or database is required in CI. Tests cover the 11 main user-facing features.

---

## Stack

| Layer | Tool |
|---|---|
| Test runner | Playwright (`@playwright/test`) |
| Browser | Chromium (headless in CI) |
| App server | `ng serve --configuration e2e` (auto-started by Playwright) |
| API layer | `page.route()` intercepts — no real backend needed |
| Environment | `environment.e2e.ts` (`bypassAuth: true`, `apiUrl: '/api/v1'`) |

---

## File Structure

```
frontend/
├── e2e/
│   ├── fixtures/
│   │   └── mocks.ts              # Typed mock data + route registration
│   ├── login.e2e.ts
│   ├── series.e2e.ts
│   ├── today.e2e.ts
│   ├── reading-detail.e2e.ts
│   ├── progress.e2e.ts
│   ├── bookmarks.e2e.ts
│   ├── journal.e2e.ts
│   ├── search.e2e.ts
│   ├── settings.e2e.ts
│   ├── admin-logs.e2e.ts
│   └── calendar.e2e.ts
├── playwright.config.ts
└── src/environments/
    └── environment.e2e.ts
```

---

## Running Tests

```bash
# Local (reuses existing ng serve if running)
cd frontend
npm run e2e

# CI mode (starts its own server, GitHub reporter)
npm run e2e:ci
```

---

## Gap Analysis Resolution

### Gap 1 — bypassAuth hides Guest button (HIGH)
**Problem:** `bypassAuth: true` redirects `/` → `/tabs/today` before the login page renders.
**Fix:** Login tests navigate explicitly to `/login` rather than relying on the default redirect.
The redirect behaviour is tested separately (`'redirects to /tabs/today when navigating to root'`).

### Gap 2 — No E2E build configuration (MEDIUM)
**Fix:** Added `environment.e2e.ts` with `bypassAuth: true` and `apiUrl: '/api/v1'`.
Added `e2e` build + serve configurations to `angular.json` with `fileReplacements` pointing to this environment.
`playwright.config.ts` uses `ng serve --configuration e2e`.

### Gap 3 — Mock data must match models exactly (HIGH)
**Fix:** `e2e/fixtures/mocks.ts` imports TypeScript interfaces directly from `src/app/core/models/`.
All mock objects are typed — TypeScript compiler will catch shape mismatches at build time.

### Gap 4 — Completion checkbox is scroll-dependent (MEDIUM)
**Fix:** `reading-detail.e2e.ts` uses `page.evaluate()` to call `scrollToBottom(0)` on `ion-content`
and dispatch a synthetic `ionScroll` event with `scrollTop: 9999`. A 300ms wait follows to allow
Angular change detection to set `readingSeen = true` and reveal `.complete-section`.

### Gap 5 — Journal needs seeded completion data (HIGH)
**Fix:** `MOCK_JOURNAL` in `mocks.ts` contains one `JournalEntryDto` with `isCompleted: true` and
`notes` populated. The mock is registered on `**/api/v1/progress/series/1/journal`.
Tests assert on the note content, not on an empty state.

### Gap 6 — Google/Facebook SDK scripts 404 in CI (LOW)
**Fix:** `mockAllRoutes()` blocks both SDK origins before page load:
```ts
await page.route('https://accounts.google.com/**', r => r.abort());
await page.route('https://connect.facebook.net/**', r => r.abort());
```
These are aborted silently; errors are caught in `initGoogle`/`initFacebook` and don't surface as test failures.

### Gap 7 — Admin logs API must be mocked (MEDIUM)
**Fix:** `mockAllRoutes()` registers `**/api/v1/logs**` → `MOCK_LOGS` (a valid `PagedLogsResult`).
With `bypassAuth: true` the `AdminGuard` passes unconditionally. Tests verify log content renders.

### Gap 8 — Playwright artifacts not in .gitignore (LOW)
**Fix:** Added to root `.gitignore`:
```
/frontend/test-results/
/frontend/playwright-report/
/frontend/playwright/.cache/
/frontend/blob-report/
```

### Gap 9 — Capacitor plugin imports (LOW)
No action required. `@codetrix-studio/capacitor-google-auth` is guarded by `Capacitor.isNativePlatform()`
at runtime. The static import is safe for browser/web builds.

### Gap 10 — Browser cache missing in CI (MEDIUM)
**Fix:** `ci.yml` e2e job includes:
```yaml
- name: Cache Playwright browsers
  uses: actions/cache@v4
  with:
    path: ~/.cache/ms-playwright
    key: playwright-${{ runner.os }}-${{ hashFiles('frontend/package-lock.json') }}
```
Cache key invalidates when `package-lock.json` changes (i.e., Playwright version bumps).

### Gap 11 — Calendar page untested (LOW)
**Fix:** Added `calendar.e2e.ts`. Tests that the page loads and the current month name is visible.
`/account` page is intentionally excluded — it is low-risk profile UI with no API calls.

### Gap 12 — Ionic tab scroll persistence (LOW)
**Fix:** Each test navigates fresh via `page.goto()`. Playwright's default context creates a new
browser context per test file. Tab scroll state does not persist between test files.
For tests within the same file that navigate between tabs, scroll position is reset by `page.goto()`.

### Gap 13 — webServer config needed (HIGH)
**Fix:** `playwright.config.ts` includes:
```ts
webServer: {
  command: 'npx ng serve --configuration e2e --port 4200',
  url: 'http://localhost:4200',
  reuseExistingServer: !process.env['CI'],
  timeout: 120_000,
}
```
In CI (`process.env.CI` is set), a fresh server is always started. Locally, an existing server is reused.

### Gap 14 — Route glob pattern for mocks (MEDIUM)
**Fix:** All route patterns use `**/api/v1/**` glob prefix which matches both
`http://localhost:4200/api/v1/...` (proxied) and direct API paths. Since `page.route()` intercepts
at the browser network layer, mock handlers fire before the proxy (`proxy.conf.json`) is ever reached —
no backend required.

---

## CI Pipeline Position

```
backend-tests ─┐
               ├─→ e2e-tests → (passes) → build → deploy
frontend-tests ─┘
```

E2E job runs on `ubuntu-latest` (no Mac runner needed — web E2E only).
On failure, the Playwright HTML report is uploaded as a CI artifact.

---

## Mock Data Reference

All mock shapes are in `e2e/fixtures/mocks.ts` and typed against the actual model interfaces.

| Mock | Type | Used in |
|---|---|---|
| `MOCK_SERIES` | `Series[]` | series, today, reading-detail |
| `MOCK_READING_DETAIL` | `ReadingDetail` | today, reading-detail |
| `MOCK_PROGRESS` | `ProgressDto[]` | progress, reading-detail |
| `MOCK_BOOKMARKS` | `BookmarkDto[]` | bookmarks |
| `MOCK_JOURNAL` | `JournalEntryDto[]` | journal |
| `MOCK_SEARCH_RESULTS` | `PagedResult<SearchResultDto>` | search |
| `MOCK_LOGS` | `PagedLogsResult` | admin-logs |

---

## Known Limitations

- **Native Android/iOS flows** are not covered — the native `GoogleAuth.signIn()` requires a real device.
  These are integration-tested manually or via a future Appium setup.
- **Facebook login** is blocked in CI (SDK aborted). The button visibility is tested; the full flow is not.
- **Scroll simulation** in reading-detail relies on `ion-content` internal DOM structure which may
  change across Ionic major versions. Pin `@ionic/angular` and review this test on major upgrades.
