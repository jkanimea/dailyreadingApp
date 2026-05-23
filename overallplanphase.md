# Encounter Daily — Remaining Work

**Updated:** 2026-05-23

---

## High Priority (blocks app usability)

### Phase 7: Login screen
| Screen | Current State | What's Needed |
|--------|--------------|---------------|
| **Login** | `<h1>Login</h1>` stub | Google + Facebook buttons, wire to auth service, loading/error states |

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

### Phase 7: Frontend component + E2E tests
- Write tests for all 5 stub screens once built
- Full E2E suite covering all scenarios

### Phase 9: Font scaling expansion
- Apply `--app-font-size` binding to remaining components (calendar, cards, etc.) beyond reading-detail

---

## Summary by Phase

| Phase | Status | Remaining |
|-------|--------|-----------|
| 1-6 | ✅ Complete | Nothing |
| 7 | ⚠️ 1/9 screens | Login screen only |
| 8 | ✅ Complete | E2E tests, server-side push, conflict resolution |
| 9 | ⚠️ Partial | Localization, manual summary review |
| 10 | ⚠️ Partial | Coverage verification, performance, accessibility, security, E2E |
