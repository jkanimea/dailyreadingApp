```
# Testing Suite Specification

## Project: Encounter Daily Mobile Application

### (4-Series Devotional Reading App)

---

## 1. TESTING OVERVIEW

| Testing Level | Backend (.NET Core) | Frontend (Angular/Ionic) |
|---------------|---------------------|---------------------------|
| **Unit Testing** | xUnit / NUnit | Jest |
| **Component Testing** | N/A | Jest + Angular Test Bed |
| **Integration Testing** | Microsoft.AspNetCore.TestHost | Cypress (component-level) |
| **End-to-End (E2E)** | Postman / Newman | Appium / Detox |
| **Regression Testing** | CI pipeline (GitHub Actions) | CI pipeline (GitHub Actions) |

---

## 2. BACKEND UNIT TESTING (.NET Core)

### 2.1 Testing Frameworks & Tools

| Tool | Purpose |
|------|---------|
| **xUnit** | Primary unit test framework |
| **Moq** | Mocking dependencies |
| **FluentAssertions** | Readable assertions |
| **Microsoft.EntityFrameworkCore.InMemory** | In-memory database for tests |
| **Coverlet** / **CoverageCollector** | Code coverage reporting |

### 2.2 Test Project Structure
```

EncounterDaily.Tests/
├── UnitTests/
│ ├── Core/
│ │ ├── Entities/
│ │ └── Enums/
│ ├── Services/
│ │ ├── ReadingServiceTests.cs
│ │ ├── ProgressServiceTests.cs
│ │ ├── SearchServiceTests.cs
│ │ ├── SeriesManagerServiceTests.cs
│ │ └── SummaryGeneratorServiceTests.cs
│ ├── Repositories/
│ │ ├── GenericRepositoryTests.cs
│ │ ├── ReadingRepositoryTests.cs
│ │ └── ProgressRepositoryTests.cs
│ └── Controllers/
│ ├── ReadingsControllerTests.cs
│ ├── ProgressControllerTests.cs
│ ├── SearchControllerTests.cs
│ └── SeriesControllerTests.cs
├── IntegrationTests/
│ ├── Api/
│ ├── Database/
│ └── Services/
├── TestHelpers/
│ ├── MockData/
│ ├── DatabaseFixture.cs
│ └── TestBase.cs
└── coverage/

**text**

```

### 2.3 Unit Test Requirements

#### Service Layer Tests (minimum counts)

| Service | Minimum Tests |
|---------|---------------|
| ReadingService | 12+ |
| ProgressService | 10+ |
| SearchService | 8+ |
| SeriesManagerService | 6+ |
| SummaryGeneratorService | 6+ |

#### Example Test Cases

**ReadingService.GetTodayReadingAsync:**
- Returns correct reading for given series on any date
- Throws `NotFoundException` if no reading exists for date
- Returns cached reading when offline flag is true
- Handles leap year dates correctly

**ProgressService.MarkCompleteAsync:**
- Creates progress record if not exists
- Updates existing record if already completed
- Does not duplicate completion records
- Updates streak count correctly

**SearchService.SearchAsync:**
- Returns results matching Bible reference
- Returns results matching text content
- Returns empty list for no matches
- Respects series filter parameter

### 2.4 Code Coverage Requirements

| Component | Minimum Coverage |
|-----------|------------------|
| Core/Entities | 80% |
| Services | 85% |
| Repositories | 80% |
| Controllers | 75% |
| **Overall** | **80%** |

### 2.5 Running Backend Tests

```bash
# Run all unit tests
dotnet test EncounterDaily.Tests/ --filter "Category=Unit"

# Run all integration tests
dotnet test EncounterDaily.Tests/ --filter "Category=Integration"

# Run with coverage report
dotnet test /p:CollectCoverage=true /p:CoverletOutputFormat=lcov

# Run specific test class
dotnet test --filter "FullyQualifiedName~ReadingServiceTests"
```

---

## 3. FRONTEND UNIT & COMPONENT TESTING

### 3.1 Testing Frameworks & Tools

| Tool                                | Purpose                        |
| ----------------------------------- | ------------------------------ |
| **Jest**                      | Test framework and runner      |
| **Angular Test Bed (ATB)**    | Angular component testing      |
| **Spectator**                 | Simplified Angular testing     |
| **Testing Library (Angular)** | User-centric testing           |
| **Ionic Mock Components**     | Mock Ionic UI components       |
| **@capacitor/core/testing**   | Mock Capacitor plugins         |

### 3.2 Test Project Structure

```
src/
├── app/
│   ├── core/
│   │   ├── models/*.spec.ts
│   │   ├── services/*.spec.ts
│   │   └── guards/*.spec.ts
│   ├── shared/components/*/*.spec.ts
│   └── features/*/*.spec.ts
└── setup-jest.ts
```

### 3.3 Component Test Requirements

#### ReadingCardComponent Tests

| Test Case                                             |
| ----------------------------------------------------- |
| should create                                         |
| should display reading title/bible reference          |
| should show summary when showSummary=true             |
| should not show summary when showSummary=false        |
| should show completed checkmark when isCompleted=true |
| should show bookmark icon when isBookmarked=true      |
| should emit onTap when clicked                        |
| should emit onComplete when complete button clicked   |
| should emit onBookmark when bookmark button clicked   |

#### CalendarDayComponent Tests

| Test Case                                        |
| ------------------------------------------------ |
| should display day number                        |
| should apply today class when isToday=true       |
| should show completed dot when isCompleted=true  |
| should show bookmark icon when isBookmarked=true |
| should emit daySelected when clicked             |

#### SeriesSelectorComponent Tests

| Test Case                                        |
| ------------------------------------------------ |
| should display all 4 series options              |
| should highlight selected series                 |
| should emit seriesChanged when selection changes |
| should show progress for each series             |

### 3.4 Service Unit Tests

#### ReadingService Tests

| Test Case                                         |
| ------------------------------------------------- |
| getTodayReading returns reading for active series |
| getReadingByDate returns correct reading          |
| getMonthReadings returns array of 28-31 readings  |
| getFullReading returns text content               |
| caches readings for offline access                |
| handles network errors gracefully                 |

#### ProgressService Tests

| Test Case                                 |
| ----------------------------------------- |
| markComplete sends POST request           |
| markComplete updates local state          |
| getProgress returns completion percentage |
| getStreak returns consecutive days        |
| syncOfflineProgress syncs when online     |
| saveNotes PUTs to correct endpoint        |
| getJournal GETs correct endpoint          |

### 3.5 Code Coverage Requirements (Frontend)

| Component Type     | Minimum Coverage | Current (jest.config.js) |
| ------------------ | ---------------- | ------------------------ |
| Services           | 85%              | —                        |
| Components (logic) | 80%              | —                        |
| Pipes              | 100%             | —                        |
| Guards             | 90%              | —                        |
| Directives         | 75%              | —                        |
| **Global thresholds (actual)** | **80%**   | Branches 20%, Functions 30%, Lines 35%, Statements 35% |

> **Note:** Current jest.config.js thresholds are set to minimum passing levels (20%/30%/35%/35%). These need to be raised to meet target coverage (80%+). Run `npx jest --coverage` to measure current actual coverage.

### 3.6 Running Frontend Tests

**bash**

```
# Run all unit tests (Jest, not ng test)
npx jest

# Run with coverage report
npx jest --coverage

# Run specific test file
npx jest --testPathPattern="reading.service"

# Run in watch mode (development)
npx jest --watch

# Run without coverage (faster)
npx jest --no-coverage
```

> **Note:** The project uses `jest` directly (not Angular's `ng test`) via `@angular-builders/jest`. The `package.json` script `"test": "jest"` supports `npm test` as an alias.

---

## 4. INTEGRATION TESTING

### 4.1 Backend Integration Tests

| Test Category | Endpoints to Test                                                                                |
| ------------- | ------------------------------------------------------------------------------------------------ |
| Readings API  | GET /api/readings/today, GET /api/readings/series/{id}/date/{m}/{d}, GET /api/readings/{id}/full |
| Progress API  | POST /api/progress/{id}/complete, GET /api/progress/series/{id}/streak                           |
| Search API    | GET /api/search?q=                                                                               |
| Series API    | GET /api/series                                                                                  |
| Auth API      | POST /api/auth/google                                                                            |

### 4.2 Database Integration Tests

| Test                                       |
| ------------------------------------------ |
| UnitOfWork.CompleteAsync saves all changes |
| Repository.Add then GetById returns entity |
| Repository.Update modifies existing entity |
| Repository.Delete removes entity           |
| Concurrent updates handled correctly       |

### 4.3 Frontend Integration Tests

| Test                                  | Components Involved              |
| ------------------------------------- | -------------------------------- |
| Today page loads reading from service | TodayPage + ReadingService       |
| Calendar updates when series changes  | CalendarPage + SeriesSelector    |
| Bookmarks persist across sessions     | BookmarksPage + BookmarkService  |
| Search results update in real-time    | SearchPage + SearchBar           |
| Progress syncs after coming online    | ProgressService + OfflineStorage |

---

## 5. END-TO-END (E2E) TESTING

### 5.1 Testing Frameworks & Tools

| Tool              | Platform          | Purpose                   |
| ----------------- | ----------------- | ------------------------- |
| **Appium**  | iOS + Android     | Cross-platform mobile E2E |
| **Detox**   | iOS + Android     | Alternative mobile E2E    |
| **Cypress** | Web (development) | Fast E2E for web preview  |
| **Newman**  | API               | API contract testing      |

### 5.2 E2E Test Project Structure

**text**

```
e2e/
├── config/
├── specs/
│   ├── authentication/
│   ├── readings/
│   ├── progress/
│   ├── bookmarks/
│   ├── search/
│   ├── series/
│   ├── offline/
│   └── navigation/
├── pages/
├── helpers/
└── reports/
```

### 5.3 Core E2E Test Scenarios

#### Authentication Flow (AUTH-01 to AUTH-05)

| Test ID | Scenario                              |
| ------- | ------------------------------------- |
| AUTH-01 | Google Login Success                  |
| AUTH-02 | Facebook Login Success                |
| AUTH-03 | First-time User sees Series Selection |
| AUTH-04 | Returning User goes to Today screen   |
| AUTH-05 | Logout works                          |

#### Reading Flow (READ-01 to READ-05)

| Test ID | Scenario                           |
| ------- | ---------------------------------- |
| READ-01 | View Today's Reading               |
| READ-02 | Read Full Text                     |
| READ-03 | Series 2 Dual Text (tab switching) |
| READ-04 | Font Size Adjustment               |
| READ-05 | Dark Mode Toggle                   |

#### Progress Tracking (PROG-01 to PROG-05)

| Test ID | Scenario              |
| ------- | --------------------- |
| PROG-01 | Mark Reading Complete |
| PROG-02 | Streak Calculation    |
| PROG-03 | Broken Streak Resets  |
| PROG-04 | Calendar Color Coding |
| PROG-05 | Series Independence   |

#### Search Functionality (SRCH-01 to SRCH-06)

| Test ID | Scenario                 |
| ------- | ------------------------ |
| SRCH-01 | Search Bible Reference   |
| SRCH-02 | Search Text Content      |
| SRCH-03 | Search by Page Reference |
| SRCH-04 | Filter by Series         |
| SRCH-05 | Search All Series        |
| SRCH-06 | No Results Message       |

#### Bookmark Flow (BKMK-01 to BKMK-05)

| Test ID | Scenario             |
| ------- | -------------------- |
| BKMK-01 | Add Bookmark         |
| BKMK-02 | View Bookmarks       |
| BKMK-03 | Remove Bookmark      |
| BKMK-04 | Bookmark from Search |
| BKMK-05 | Series Grouping      |

#### Series Switching (SER-01 to SER-04)

| Test ID | Scenario                   |
| ------- | -------------------------- |
| SER-01  | Switch Series              |
| SER-02  | Preserve Progress          |
| SER-03  | All Four Series Available  |
| SER-04  | Series Description Correct |

#### Offline Support (OFF-01 to OFF-04)

| Test ID | Scenario                   |
| ------- | -------------------------- |
| OFF-01  | Offline Reading from Cache |
| OFF-02  | Offline Bookmark Syncs     |
| OFF-03  | Offline Progress Syncs     |
| OFF-04  | Cache Miss Shows Error     |

#### Push Notifications (NOTIF-01 to NOTIF-03)

| Test ID  | Scenario                   |
| -------- | -------------------------- |
| NOTIF-01 | Request Permission         |
| NOTIF-02 | Daily Reminder             |
| NOTIF-03 | Notification Tap Opens App |

### 5.4 Running E2E Tests

**bash**

```
# iOS Simulator
npm run e2e:ios

# Android Emulator
npm run e2e:android

# Web preview (fast development)
npm run e2e:web

# Specific test file
npm run e2e -- --spec e2e/specs/readings/today-reading.spec.ts

# Generate report
npm run e2e:report
```

---

## 6. REGRESSION TESTING

### 6.1 Regression Test Suite Structure

**text**

```
regression/
├── smoke/                    # Quick sanity checks (run on every commit)
│   ├── login.smoke.spec.ts
│   ├── today-loads.smoke.spec.ts
│   └── search-works.smoke.spec.ts
├── critical/                 # Core functionality (run daily)
│   ├── authentication.critical.spec.ts
│   ├── reading.critical.spec.ts
│   ├── progress.critical.spec.ts
│   └── series.critical.spec.ts
├── full/                     # Complete suite (run before release)
└── performance/              # Performance regression
```

### 6.2 Regression Triggers

| Trigger              | Tests to Run             |
| -------------------- | ------------------------ |
| Every Pull Request   | Smoke tests + Unit tests |
| Daily (midnight)     | Critical tests           |
| Before Release (tag) | Full regression suite    |
| Dependency Update    | All tests + performance  |
| Database Migration   | Integration tests + E2E  |

### 6.3 Current Test Status

**Current test count:** **287 tests, 25 suites, all passing**

#### Frontend Spec Files (25 total)

| File | Type |
|------|------|
| `admin.guard.spec.ts` | Guard |
| `auth.guard.spec.ts` | Guard |
| `bookmark.model.spec.ts` | Model |
| `paged-result.model.spec.ts` | Model |
| `progress.model.spec.ts` | Model |
| `reading.model.spec.ts` | Model |
| `user.model.spec.ts` | Model |
| `admin-log.service.spec.ts` | Service |
| `api.service.spec.ts` | Service |
| `auth.service.spec.ts` | Service |
| `bookmark.service.spec.ts` | Service |
| `logging.service.spec.ts` | Service |
| `preferences.service.spec.ts` | Service |
| `progress.service.spec.ts` | Service |
| `reading.service.spec.ts` | Service |
| `series.service.spec.ts` | Service |
| `sync.service.spec.ts` | Service |
| `log-viewer.component.spec.ts` | Component |
| `avatar-button.component.spec.ts` | Component |
| `journal.module.spec.ts` | Feature (36 tests) |
| `login.module.spec.ts` | Feature |
| `progress.module.spec.ts` | Feature |
| `reading-detail.spec.ts` | Feature |
| `reading-detail-notes.spec.ts` | Feature |
| `today.module.spec.ts` | Feature |

### 6.4 Automation Pipeline (CI/CD)

**yaml**

```
# .github/workflows/ci.yml (actual configuration)
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  backend-unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-dotnet@v4
        with:
          dotnet-version: 10.0.x
      - run: dotnet test --filter "Category=Unit" --collect:"XPlat Code Coverage"

  frontend-unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22.x
      - run: npm ci
      - run: npx jest --no-coverage
```

---

## 7. PERFORMANCE TESTING

### 7.1 Tool

| Aspect | Specification |
|--------|---------------|
| Tool | **k6** (Grafana) — designed for load testing; scripts in JavaScript; integrates with GitHub Actions |
| Test file location | `tests/performance/load-test.js` |

### 7.2 Load Test Scenarios

| Scenario | Target | Concurrent users | Duration |
|----------|--------|-----------------|----------|
| Today's reading | `/api/v1/readings/today` | 50 | 2 minutes |
| Calendar month | `/api/v1/readings/series/1/month/5` | 30 | 2 minutes |
| Search | `/api/v1/search?q=love` | 20 | 2 minutes |
| Auth login | `POST /api/v1/auth/google` | 10 | 1 minute |
| Cross-series search | `/api/v1/search/all?q=faith` | 15 | 2 minutes |

### 7.3 Performance Baselines

| Metric | Acceptable | Degradation alert |
|--------|-----------|-------------------|
| API p95 response time (first request) | < 500ms | > 550ms |
| API p95 response time (subsequent) | < 200ms | > 250ms |
| Error rate under load | < 1% | > 2% |
| 50 concurrent users | No timeout failures | Any timeout |

Regenerate baseline metrics after major schema changes or dependency updates.

---

## 8. SECURITY TESTING

### 8.1 Automated Security Scanning

| Aspect | Specification |
|--------|---------------|
| Tool | **OWASP ZAP** (Zed Attack Proxy) via `zaproxy/action-full-scan` GitHub Action |
| Frequency | On every PR to `main` and `develop` |
| Target | Staging environment URL |
| Scan type | Full scan (spider + active scan) |

### 8.2 Manual Security Test Cases

| Test | Expected behavior |
|------|-------------------|
| JWT tampering | Modify any claim → API returns 401 |
| Token replay | Use same token from different IP → accepted within lifetime (tokens are stateless) |
| Refresh token reuse | Use same refresh token 3+ times → server invalidates it and all associated access tokens |
| SQL injection | `q='; DROP TABLE DailyReadings; --` → parameterized query rejects; returns 400 or empty results |
| XSS in search query | `<script>alert('xss')</script>` → output encoded; no script execution |
| OAuth state parameter replay | Replay `state` from another session → rejected |
| Rate limit bypass | Exceed 100 req/min → 429 response; verify count resets after window |

---

## 9. ACCESSIBILITY TESTING

| Aspect | Specification |
|--------|---------------|
| Standard | WCAG 2.1 Level AA |
| Automation tool | `cypress-axe` — `cy.checkA11y()` in Cypress E2E tests |
| CI job | `frontend-a11y-tests` in test.yml (runs axe-core against all main screens) |
| Manual verification | iOS: VoiceOver + XCUIAccessibility; Android: TalkBack + Accessibility Scanner |

### 9.1 Specific Checks

| Screen | Key accessibility requirements |
|--------|-------------------------------|
| Login | All buttons have accessible labels; focus order matches visual order |
| Today's reading | Screen reader announces new content when reading loads; mark complete action announces state change |
| Full reading | Font resizing does not break layout at 200%; dark mode contrast ≥ 4.5:1 |
| Calendar | Touch targets ≥ 44x44px; selected date announced by screen reader |
| Search | Search results announced when they appear; no focus trap |

---

## 10. TEST ENVIRONMENT MATRIX

| Platform | OS versions | Device types |
|----------|------------|--------------|
| **iOS** | iOS 18 (latest), iOS 17 (previous) | iPhone 16 series + iPad (one model) |
| **Android** | API 35, 34, 33 (latest + 2 back) | Pixel 9 series + Android tablet (one model) |
| **Web (preview only)** | Chrome (latest), Safari (latest) | Desktop viewport |

| Environment | URL / Config | Used for |
|------------|-------------|----------|
| Local development | `localhost` + SQL Express LocalDB | Unit tests, component tests |
| CI (GitHub Actions) | Ephemeral runner + in-memory DB | All automated tests |
| Staging | `staging.encounterdaily.com` + staging SQL DB | Integration tests, security scan, E2E |
| Production | `encounterdaily.com` + production SQL DB | Smoke tests only (post-deploy) |

---

## 11. TEST DATA MANAGEMENT

### 7.1 Mock Data Fixtures

**typescript**

```
// test/mocks/mock-readings.ts (specification only)

export const mockSeries1Readings = {
  jan1: {
    id: 1,
    seriesId: 1,
    month: 1,
    day: 1,
    bibleReading: "Mark 1:1; Luke 1",
    primaryBookPageRange: "DA 19-21",
    summaryPoints: [
      "Introduction to the Gospel narrative",
      "John the Baptist's role as forerunner",
      "The divine nature of Christ"
    ]
  }
};

export const mockUser = {
  id: 999,
  email: "test@example.com",
  displayName: "Test User",
  selectedSeriesId: 1
};
```

### 7.2 Test Database Seeding

| Seed Data                  | Purpose                                   |
| -------------------------- | ----------------------------------------- |
| `SeedAllSeries()`        | Populates all 4 series with readings      |
| `SeedUserWithProgress()` | Creates test user with varied progress    |
| `SeedEdgeCases()`        | Creates leap year dates, missing readings |
| `SeedLargeVolume()`      | Performance testing (10,000+ records)     |

---

## 12. TEST REPORTING

### 12.1 Report Formats

| Format    | Tool                        | When Generated        |
| --------- | --------------------------- | --------------------- |
| HTML      | ReportGenerator, Jest HTML  | Local development     |
| JUnit XML | xUnit, Jest                 | CI pipeline           |
| JSON      | Custom formatter            | Data analysis         |
| Allure    | Allure Framework            | Release documentation |

### 12.2 Required Reports

| Report Name             | Frequency      |
| ----------------------- | -------------- |
| unit-test-report.html   | Per commit     |
| integration-report.html | Per PR         |
| e2e-report.html         | Daily          |
| regression-report.html  | Before release |
| performance-report.html | Weekly         |

---

## 13. ACCEPTANCE CRITERIA FOR TESTING

* All unit tests pass with coverage ≥ 80% (backend) and ≥ 80% (frontend)
* All integration tests pass
* All E2E test scenarios pass on both iOS and Android
* Regression smoke tests pass on every PR
* Performance tests show no degradation > 10% from baseline and meet SLA targets (p95 < 500ms)
* Accessibility tests pass with zero critical or serious violations (WCAG 2.1 AA)
* Security scan (OWASP ZAP) passes with no high-severity findings
* Test reports are automatically generated and archived
* Failed tests block PR merge
* Test suite runs in < 10 minutes total
* Offline tests specifically verify sync functionality
* Series 2 dual-text feature has dedicated E2E tests
* Test environments match the defined matrix (iOS 18/17, Android API 35/34/33)

---

## 14. TESTING COMMAND REFERENCE

**bash**

```
# === BACKEND ===
dotnet test                                    # Run all backend tests
dotnet test --filter "Category=Unit"          # Unit tests only
dotnet test --filter "Category=Integration"   # Integration tests only
dotnet test /p:CollectCoverage=true           # With coverage

# === FRONTEND ===
ng test                                        # Run unit tests
ng test --code-coverage                        # With coverage
ng test --watch                                # Watch mode
npx cypress run                                # Run Cypress E2E

# === E2E MOBILE ===
npm run e2e:ios                                # iOS simulator
npm run e2e:android                            # Android emulator
npm run e2e:web                                # Web preview

# === REGRESSION ===
npm run test:smoke                             # Smoke tests
npm run test:critical                          # Critical path
npm run test:full                              # Full regression
npm run test:performance                       # Performance tests

# === REPORTS ===
npm run report:generate                        # Generate all reports
npm run report:open                            # Open reports in browser
```

---

## 15. NOTES FOR DEVELOPER

### Print Testing (Journal Page)

The journal print feature uses a **new-window approach** (`window.open` + `buildPrintHtml()`) to bypass Ionic's shadow DOM scroll container. Tests validate:

- `buildPrintHtml()` generates valid standalone HTML with all entries
- Selected-entry filtering (only checked entries appear)
- HTML escaping for notes, series name, and bible references
- Inline CSS includes `@media print` with `break-inside: avoid` for multi-page pagination
- Window lifecycle: opens, writes content, closes on `onafterprint`
- Edge cases: no entries, `window.open` returns null (popup blocked)

The tests use a **plain mock object pattern** (not TestBed) — the component is a hand-built object replicating all methods and state. This avoids Ionic's complex TestBed setup and keeps tests fast.

### Global CSS Regression Test

One test reads `src/global.scss` from the filesystem and asserts the `@media print` block contains `contain: none !important`, `height: auto !important`, and `overflow: visible !important` on `ion-content::part(scroll)`. This ensures the CSS safety net for in-page printing is never accidentally removed.

* All tests must be **deterministic** (no flaky tests)
* External API calls (OAuth) should be **mocked** in unit/integration tests
* Real OAuth endpoints can be used in E2E tests with test accounts
* Capacitor native plugins must be **mocked** using `@capacitor/core/testing`
* For E2E tests on mobile, use **test identifiers** (`data-testid`) for reliable element selection
* Regenerate baseline performance metrics after major optimizations
