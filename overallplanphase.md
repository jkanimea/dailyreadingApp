# Encounter Daily — Remaining Work

**Updated:** 2026-05-26

---

## High Priority (blocks app usability)

### Phase 7: Deliverables (✅ Complete)
| # | Screen | Status | Details |
|---|--------|--------|---------|
| 1 | **Search** | ✅ Done | Full-text search with debounced input, paginated results, navigation to reading detail |
| 2 | **Progress** | ✅ Done | Per-series completion %, streak tracking, progress bars |
| 3 | **Bookmarks** | ✅ Done | Bookmark list with swipe-to-delete, empty state, navigation to reading detail |
| 4 | **Login** | ✅ Done | Google Sign-In (GIS), Facebook Login (JS SDK), "Continue as Guest" fallback, loading/error states |
| 5 | **Header navigation** | ✅ Done | Search, Progress, Bookmark, Calendar nav icons added to all page headers for cross-screen access |
| 6 | **Backend API** | ✅ Done | Search, Progress, Bookmark controllers with full CRUD; fixed GetUserId() fallback for dev bypass |
| 7 | **Series Selection** | ✅ Done | Series list with descriptions, selection persists to preferences, navigates to today's reading |

### Phase 10: Verify test coverage
- Run `dotnet test /p:CollectCoverage=true` to confirm backend ≥ 80%
- Run `npx jest --coverage` to confirm frontend ≥ 80%

---

## Medium Priority

### Phase 9: Localization
- Extract i18n strings via `ng extract-i18n`
- Generate `.xlf` translation files
- Add language selector component
- Translate UI strings

### Phase 9: Manual AI summary review
- Review first 30 days per series for quality
- Fix any bad summaries via re-generation or manual edit

### Phase 8: Offline & notification E2E tests
- Write and pass OFF-01 to OFF-04
- Write and pass NOTIF-01 to NOTIF-03

---

## Lower Priority

### Phase 10: Performance testing
- Run k6 load test at `backend/tests/performance/load-test.js`
- Verify p95 < 500ms first request, < 200ms cached

### Phase 10: Accessibility
- Run axe-core scans on all frontend screens
- Fix any critical/serious violations

### Phase 10: Security scan
- Run OWASP ZAP against API endpoints
- Fix any high-severity findings

### Phase 10: Full E2E on iOS + Android
- Run Appium or Detox test suite on both platforms
- Verify regression smoke, critical, full suites

### Phase 8: Server-side push notifications
- Implement FCM push from backend for daily_reading, streak_milestone, series_complete payloads

### Phase 8: Conflict resolution
- Add version tracking for last-write-wins conflict resolution in sync service

### Phase 7: E2E tests
- Write E2E tests covering Phase 7 scenarios (search, progress, bookmarks, login)

### Phase 9: Font scaling expansion
- Apply `--app-font-size` binding to remaining components (calendar, cards, etc.) beyond reading-detail

---

## Summary by Phase

| Phase | Status | Remaining |
|-------|--------|-----------|
| 1-6 | ✅ Complete | Nothing |
| 7 | ✅ Complete | Search, Progress, Bookmarks, Login, Series Selection, header nav icons, backend API fixed |
| 8 | ✅ Complete | E2E tests, server-side push, conflict resolution |
| 9 | ⚠️ Partial | Localization, manual summary review |
| 10 | ⚠️ Partial | Coverage verification, performance, accessibility, security, E2E |
