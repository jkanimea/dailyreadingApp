# Overall Implementation Plan — Encounter Daily

**Last updated:** 2026-06-11

> **Progress Summary:** Phases 1–8 ✅ Complete | Phase 9 ✅ Complete (AI summary, dark mode, font scaling) | Phase 10 ⚠️ Partial (coverage/performance/security not verified) — **287 tests passing across 25 suites**

## Project Scope

| Layer | What | Scale |
|---|---|---|
| **Backend** | .NET 8 Web API with Repository/Unit of Work pattern | 9 tables, 18+ endpoints |
| **Frontend** | Angular + Ionic + Capacitor mobile app | 8 screens, 7 shared components |
| **Database** | SQL Server with Full-Text Search | ~1,460 daily readings across 4 series |
| **Auth** | Google + Facebook OAuth with JWT + refresh tokens | |
| **Offline** | SQLite cache with bidirectional sync | 3-tier caching |
| **Notifications** | FCM push notifications | |
| **Testing** | xUnit, Jest, E2E (Appium/Detox), k6, OWASP ZAP | 80%+ coverage required |

## Data Architecture — Reusable Content Storage

EGW books (DA/AA/GC/PP/PK) and the KJV Bible are stored **once** in reusable tables, not duplicated per-reading:

- **Bible**: `BibleBooks` (66 books) + `BibleVerses` (31,100 verses) — downloaded once from JSON
- **EGW**: `EgwPages` (3,214 pages across 5 books) — scraped once from ellenwhite.info
- **At query time**: `ReadingService` assembles text by looking up `BibleVerse` (for Bible reading) and `EgwPages` (for page range), then returns it in the DTO
- **Result**: Adding a new series/reference that uses existing books requires **zero HTTP requests** — text is assembled from cached EgwPages

✅ **Status: Complete** — Both Bible and EGW storage implemented, tested, and verified with 185+ passing tests.

---

## Phased Plan (10-11 weeks)

### Phase 1: Foundation  ✅ COMPLETED
**Duration:** 1.5 weeks | **Commits:** `44a993c`, `4ea4f70`, `49d6abf`

**Deliverables:**
- ✅ Create `EncounterDaily.sln` with all 4 projects (API, Core, Infrastructure, Tests)
- ✅ Create all entity classes matching spec tables (`Series`, `Book`, `DailyReading`, `User`, `UserProgress`, `UserBookmark`, `UserSeriesPreference`, `SearchHistory`)
- ✅ Create `AppDbContext` with `DbSet` for each table
- ✅ Implement `IRepository<T>` (generic CRUD interface)
- ✅ Implement `GenericRepository<T>`
- ✅ Implement `IUnitOfWork` and `UnitOfWork`
- ✅ Enums (`SeriesType`, `BookType`)
- ✅ Base entity class (`BaseEntity`)
- ✅ Abstract Service layer: `IService<T>` (generic interface), `BaseService<T>` (generic implementation), specific service interfaces and implementations for Series, Reading, Progress, Bookmark
- ✅ Abstract Controller layer: `BaseController<T>` (generic controller), specific controllers for Series, Reading, Progress, Bookmark
- ✅ DI registration for DbContext, UnitOfWork, and all services

**Tests:**
- ✅ Backend unit tests on entities
- ✅ Backend unit tests on `GenericRepository<T>`
- ✅ Backend unit tests on `BaseService<T>` and specific services
- ✅ Backend unit tests on `BaseController<T>` and specific controllers
- ✅ `dotnet test backend/ --filter "Category=Unit"`

---

### Phase 2: Authentication  ✅ COMPLETED
**Duration:** 1 week | **Commits:** `ae8a023`, `8bb3aaa`, `f3c615b`, `c947bc5`, `ff9cd64`

**Deliverables:**
- ✅ Google OAuth endpoint (`POST /api/v1/auth/google`)
- ✅ Facebook OAuth endpoint (`POST /api/v1/auth/facebook`)
- ✅ JWT issuance with RS256 signing (15-min access, 30-day refresh)
- ✅ Refresh token rotation (`POST /api/v1/auth/refresh`)
- ✅ `GET /api/v1/auth/me` — current user
- ✅ `POST /api/v1/auth/logout` — logout endpoint
- ✅ Rate limiting (partitioned per-IP/per-user buckets)
- ✅ CORS hardening
- ✅ `AuthService` backend
- ✅ `@capacitor-secure-storage-plugin` integration for token storage (Phase 6)
- ✅ Angular `AuthInterceptor` (401 auto-refresh) (Phase 6)
- ✅ Auth guard (`auth.guard.ts`) (Phase 6)
- ✅ DevMode:BypassAuth flag for local testing

**Tests:**
- ✅ Auth service unit tests (GetCurrentUser, RefreshToken rotation, reuse detection)
- ✅ Auth controller unit tests (login, refresh, error handling)
- ✅ Full test suite re-run

**Implemented backend:**
- `RefreshToken` entity with reuse tracking (revoke after 3 reuses)
- `IUserRepository` + `UserRepository` (find by OAuth provider)
- Auth DTOs: `LoginRequest`, `TokenResponse`, `RefreshRequest`, `UserDto`
- `IAuthService` + `AuthService`: Google/Facebook login, RS256 JWT (15min), refresh token rotation (30 days), `/auth/me`
- `AuthController` with `POST /api/v1/auth/google`, `POST /api/v1/auth/facebook`, `POST /api/v1/auth/refresh`, `GET /api/v1/auth/me`

---

### Phase 3: Series & Readings Backend  ✅ COMPLETED
**Duration:** 1.5 weeks | **Commits:** `372847c`, `3ec11d9`, `664ea29`, `64cea99`, `feb3654`, `1ea46d7`, `727a611`, `5fdcc6c`, `9d7b4d6`, `336503a`, `8648d30`

**Deliverables:**
- ✅ CSV import tool (`EncounterDaily.ImportTool` console app) — generate or import CSV seed data for all 4 series (~1,464 rows)
- ✅ Seed CSV files in `database/seed-data/` (4 files, 366 readings each for 2024 leap year)
- ✅ `IReadingRepository` with series-specific queries (GetBySeriesDate, GetBySeriesMonth, GetBySeriesYear, SearchByText)
- ✅ `ReadingService` with new methods: `GetTodayReadingAsync`, `GetFullReadingAsync`, `GetSummaryAsync`
- ✅ `ISeriesRepository` and `SeriesRepository` with book includes
- ✅ All reading endpoints: `GET /api/v1/reading/series/{id}/today`, `/series/{id}/date/{m}/{d}`, `/series/{id}/month/{m}`, `/{id}/full`, `/{id}/summary`, `search/{id}`
- ✅ All series endpoints: `GET /api/v1/series`, `GET /api/v1/series/{id}`, `GET /api/v1/series/{id}/config`
- ✅ `SeriesFactory` pattern (`ISeriesFactory`, `SeriesFactory`, `SeriesConfig` DTO)
- ✅ DTOs: `DailyReadingDto`, `ReadingDetailDto`, `SummaryDto`, `SeriesConfig`
- ✅ Broader search: `SearchByTextAsync` now searches `FullTextSecondary` and `SummaryPoints` too
- ✅ Aligned routes to `/api/v1/` prefix

**Phase 3 extended — Reusable EGW text storage:**
- ✅ Added `EgwPage` entity (BookId, PageNumber, Text) with unique index on (BookId, PageNumber)
- ✅ `IngestTextCommand` now **scrapes once** → stores pages in `EgwPage` table → assembles `FullTextPrimary` from cached pages
- ✅ On re-run or when adding a new series: checks `EgwPage` cache first — **skips web scrape** if pages already exist, assembles directly from DB
- ✅ `ReadingService.GetFullReadingAsync` assembles EGW text at query time from `EgwPages` (like `BibleVerse` lookup), not from per-reading entity fields
- ✅ `EgwPage` table: ~3,214 total pages (DA: 716, AA: 587, GC: 659, PP: 595, PK: 657)
- ✅ New `BibleBooks`/`BibleVerses` tables (66 books, ~31K verses) — **Bible** downloaded once from public JSON, stored permanently, looked up at query time
- ✅ `IRepository<T>.Query()` method added for ad-hoc IQueryable access (used by Bible + EgwPage lookups)
- ✅ Bible auto-seed on API startup via `BibleSeedService`
- ✅ Bible verse lookup fixes: full book names, ranges, section headings, verse styles
- ✅ 6 new unit tests covering EgwPage assembly edge cases (185 total, all passing)
- ✅ Bible sections regression tests; single-verse heading format fix
- ✅ Empty string returned on Bible lookup failure so frontend hides placeholder

---

### Phase 4: Progress & Bookmarks Backend  ✅ COMPLETED
**Duration:** 1 week | **Commits:** `1740344`, `a74c25c`

**Deliverables:**
- ✅ DTOs: `ProgressDto`, `BookmarkDto`
- ✅ `IProgressRepository` and `ProgressRepository` (GetUserReadingProgress, GetStreak, GetUserProgressForSeries, GetCompletionPercentage)
- ✅ `ProgressService` — mark complete (`MarkCompleteAsync`), unmark (`UnmarkCompleteAsync`), streak calculation
- ✅ `IBookmarkRepository` and `BookmarkRepository` (GetUserBookmarks, GetUserBookmark, GetUserBookmarksBySeries)
- ✅ `BookmarkService` — add bookmark (`AddBookmarkAsync`), remove bookmark (`RemoveBookmarkAsync`)
- ✅ Progress endpoints: `GET /api/v1/progress/series/{seriesId}`, `GET /api/v1/progress/series/{seriesId}/streak`, `POST /api/v1/progress/{readingId}/complete`, `DELETE /api/v1/progress/{readingId}/complete`, `GET /api/v1/progress/series/{seriesId}/percentage`
- ✅ Bookmark endpoints: `GET /api/v1/bookmarks`, `POST /api/v1/bookmarks/{readingId}`, `DELETE /api/v1/bookmarks/{readingId}`
- ✅ Auth context: userId extracted from JWT claims (not URL params)
- ✅ Controllers inherit `ControllerBase` directly (no inherited CRUD routes)

**Tests:**
- ✅ `ProgressServiceTests` (12 tests) — including mark/unmark complete
- ✅ `BookmarkServiceTests` (10 tests) — including add/remove bookmark
- ✅ `ProgressControllerTests` (5 tests) — including POST/DELETE
- ✅ `BookmarkControllerTests` (5 tests) — including POST/DELETE
- ✅ Full test suite: **162 tests, all passing**

---

### Phase 5: Search Backend  ✅ COMPLETED
**Duration:** 0.5 weeks | **Commits:** `cbb464e`, `fc614c9`

**Deliverables:**
- ✅ DTOs: `SearchResultDto`, `PagedResult<T>`
- ✅ `ISearchRepository` and `SearchRepository` with paginated search (`OFFSET/FETCH`)
- ✅ `SearchService` with DTO mapping (includes `SeriesName`, `Month`, `Day`, `BibleReading`)
- ✅ Search endpoints: `GET /api/v1/search?q=&seriesId=&page=&pageSize=`, `GET /api/v1/search/all?q=&page=&pageSize=`
- ✅ Pagesize clamped to max 100, page minimum 1
- ✅ Search term minimum 2 characters (prevents single-char DoS)
- ✅ `SearchRepository` injected via `IUnitOfWork.Search`
- ✅ Search history logged to `SearchHistory` table on per-series searches
- ✅ **Search method**: Uses EF Core `.Contains()` (SQL `LIKE '%term%'`) rather than SQL Server Full-Text Search — chosen for database portability (works with SQLite/LocalDB without FTS configuration). Update to `EF.Functions.FreeText()` if deploying to SQL Server with FTS enabled.

**Tests:**
- ✅ `SearchServiceTests` (10 tests) — pagination, cross-series, DTO mapping, history logging
- ✅ `SearchControllerTests` (8 tests) — query validation, min-length, page size clamping
- ✅ Full test suite: **179 tests, all passing**

---

### Phase 6: Frontend Core  ✅ COMPLETED
**Duration:** 1.5 weeks | **Commit:** `842ff5e`

**Deliverables:**
- ✅ Angular + Ionic project initialization (Angular 20, Ionic 8, Capacitor)
- ✅ All core services (`auth`, `api`, `series`, `reading`, `progress`, `bookmark`, `search`, `notification`, `offline-storage`, `sync`, `preferences`, `secure-storage`)
- ✅ Shared components: `ReadingCard`, `ReadingSummary`, `CalendarDay`, `ProgressBar`, `SearchBar`, `SeriesSelector`, `MarkdownViewer`
- ✅ Base classes: `BaseReadingPageComponent`, `BaseCalendarPageComponent`
- ✅ App routing module (all 9 routes with lazy loading)
- ✅ Environment configs (dev + prod)
- ✅ Capacitor config for native builds
- ✅ Auth guard + Auth interceptor

**Tests:**
- ✅ Service unit tests with mocks
- ✅ Component tests (ReadingCard, CalendarDay, SeriesSelector)
- ✅ Jest configuration + setup

---

### Phase 7: Frontend Screens  ✅ COMPLETED (9/9 screens fully implemented)
**Duration:** 1.5 weeks | **Commits:** `842ff5e`, `76f0c21`, `1b4b44a`, `e0b9c1e`, `61146f2`, `c79caf5`, `d9523a4`, `f2b97b8`, `4087de4`, `1eaa253`, `d5335e7`

**Deliverables:**
- ✅ Login screen — **FULLY IMPLEMENTED** (Google Sign-In, Guest login, loading/error states; Facebook button removed, system Share API covers it)
- ✅ Series Selection screen — **FULLY IMPLEMENTED** (series list with descriptions, selection persists, navigates to today)
- ✅ Today's Reading screen — **FULLY IMPLEMENTED** (icon header `[sunny] Today — {seriesName}`, loading/error/data states, collapsible cards, AI Summarize button on notes, bottom tab nav)
- ✅ Full Reading screen — **FULLY IMPLEMENTED** (Bible sections, EGW text with paragraph refs, font-size binding, series switching via action sheet, date formatting, Bible translation toggle ASV/WEB)
- ✅ Calendar View screen — **FULLY IMPLEMENTED** (icon header `[calendar] Calendar`, month navigation, day grid with completed/today/bookmarked styling)
- ✅ Search screen — **FULLY IMPLEMENTED** (debounced full-text search, paginated results, navigation to reading detail)
- ✅ Progress Dashboard screen — **FULLY IMPLEMENTED** (per-series completion %, streak tracking, progress bars)
- ✅ Bookmarks screen — **FULLY IMPLEMENTED** (bookmark list with swipe-to-delete, empty state, navigation to reading detail)
- ✅ Journal screen — **FULLY IMPLEMENTED** (icon header `[book] Journal — {seriesName}`, chronologically-sorted reading cards with expandable notes, completion badges, select/deselect checkboxes, toggle select all, print via new-window approach with standalone HTML for reliable multi-page output, share via Web Share API, AI Summarize per-entry, loading/error/empty states)
- ✅ Settings screen — **FULLY IMPLEMENTED** (theme select, font size, daily reminder toggle with time picker, series selector via tappable row navigating to `/series`, logout)

**UI refinements:**
- ✅ Bottom tab navigation — Today, Journal, Calendar tabs with consistent icon headers
- ✅ Collapsible reading cards with chevron indicators
- ✅ Skeleton loading shimmer on all screens
- ✅ Completion badge inline with date
- ✅ EGW unavailable state handling
- ✅ Journal/Today/Calendar consistent icon headers

**Tests:**
- ✅ **287 tests passing across 25 spec files**
- ✅ Journal page tests: 36 tests covering print (new-window buildPrintHtml, HTML escaping, window lifecycle), share, selection, expand/collapse, loading states, CSS regression
- ✅ Reading detail notes tests: debounce, save, destroy cleanup, error handling
- ✅ Today page tests: reading loading, completion, notes, AI summarize
- ✅ Login page tests: auth flows
- ✅ Admin log viewer tests
- ✅ Avatar button component test

**Remaining:**
- ❌ Full E2E suite (Appium/Detox)
- ❌ Accessibility tests (axe-core)

---

### Phase 8: Offline & Notifications  ✅ COMPLETED
**Duration:** 1 week | **Commit:** `842ff5e`

**Deliverables:**
- ✅ **OfflineStorageService** — full key-value storage wrapper around `localStorage` with ready/initialization pattern
- ✅ **SyncService** — complete implementation: queue management (`markComplete`, `unmarkComplete`, `addBookmark`, `removeBookmark`), online/offline detection (`window.online`/`offline` events), debounced auto-sync (2.5s), concurrent sync guard
- ✅ Bidirectional sync — queue processed sequentially when connectivity restored; partial failure handling (stops on network loss, leaves remaining in queue)
- ❌ Conflict resolution — last-write-wins expected but not explicitly implemented; no version tracking
- ✅ **NotificationService** — push permission request via `@capacitor/push-notifications`, daily local reminder scheduling via `@capacitor/local-notifications`, cancel reminders, permission state tracking
- ✅ Notification permission flow — Settings UI with toggle and time picker integrated
- ⚠️ Notification payload handling — local notifications scheduled; no server-side push infrastructure; no deep linking on notification tap

**Tests:**
- ✅ Unit tests for sync service (enqueue, queue count, empty queue, processing, removal)
- ❌ Offline E2E: OFF-01 to OFF-04 (not implemented)
- ❌ Notification E2E: NOTIF-01 to NOTIF-03 (not implemented)

---

### Phase 9: Polish & AI Summaries  ✅ COMPLETED (localization only remaining)
**Duration:** 1 week | **Commits:** `b4b59fe`, `32de374`, `08f8de1`, `2116f8c`, `49878d1`

**Deliverables:**
- ✅ AI summary generation — **FULLY IMPLEMENTED**: `SummarizeCommand` with OpenRouter API (DeepSeek model), structured prompts, JSON validation, retry with exponential backoff, `--dry-run`, `--series`, `--model`, `--delay` options; backend API endpoint `POST /progress/{readingId}/summarize`
- ✅ AI Summarize on frontend — **FULLY IMPLEMENTED** on three screens:
  - Journal page: `onSummarize()` per-entry button → API call → AlertController popup with "Dismiss"/"Replace Notes"
  - Today page: same AI Summarize workflow on notes
  - Reading Detail page: same AI Summarize workflow on inline notes editor
- ✅ 3-6 bullet points per day, 10-25 words each — enforced by prompt and response validation in `SummarizeCommand`
- ❌ Manual review of first 30 days per series — not done (process documented but no review tooling)
- ✅ Dark mode / night mode — **IMPLEMENTED**: CSS variables in `variables.scss`, `body.dark`/`body.light` classes, Ionic dark system palette, `PreferencesService.applyTheme()` with light/dark/system options, Settings UI select, persisted to localStorage
- ✅ Font scaling (accessibility-aware) — **IMPLEMENTED**: `PreferencesService.applyFontSize()` sets `--app-font-size` (small/medium/large), applied in reading-detail template; Settings UI select with persistence
- ✅ Bible translations — **IMPLEMENTED**: ASV and WEB translations alongside KJV; translation toggle persisted as user preference; backend verse lookup supports all three
- ❌ Localization scaffold — **BUILD TOOLCHAIN ONLY**: `@angular/localize` package installed, `extract-i18n` builder configured, polyfills set — but **no `.xlf` files, no translations, no `$localize` tags, no language selector**

**Tests to run after:**
- ❌ Full regression suite (stubs prevent this)
- ❌ Performance tests (k6 load testing)
- ❌ Security scan (OWASP ZAP)

---

### Phase 10: Hardening  ⚠️ PARTIALLY COMPLETED
**Duration:** Ongoing | **Commits:** `b4b59fe`, `41a15b0`, `d47d955`, `093afa1`, `2c97298`, `96638d1`

**Deliverables:**
- ✅ All tests green — **287 tests, 25 suites, all passing** (frontend + backend)
- ✅ CI/CD pipeline — full build + test workflow (`.github/workflows/ci.yml`), deploy workflow (`.github/workflows/deploy.yml`), Android APK build job (`d47d955`)
- ✅ Android APK build — Containerfile for Android builder, entrypoint script, node/npm binary injection, podman multi-stage build, CI job triggered after production deploy
- ✅ Greploop auto-review — PR workflow that runs GPT-based diff review on every PR to develop/main
- ❌ Backend coverage ≥ 80% — coverlet configured (`coverlet.runsettings`) but actual coverage not verified
- ❌ Frontend coverage ≥ 80% — jest configured (current thresholds: branches 20%, functions 30%, lines 35%, statements 35%) but stricter targets not achieved
- ❌ Performance baselines met (p95 < 500ms first request, < 200ms cached) — k6 load test script at `backend/tests/performance/load-test.js` but not run
- ✅ Production configuration — `appsettings.Production.json` created
- ✅ Documentation — testing guide (`docs/testing-guide.md`), setup guide (`docs/setup-guide.md`), deployment guide (`MarkdownSpecification/deployment_guide.md`) present
- ❌ Full E2E (iOS + Android) — not run
- ❌ Accessibility (axe-core) — not run
- ❌ Security (OWASP ZAP) — not run

---

## Key Rules

1. **After every phase** — run the entire test suite (backend unit + integration + frontend unit + E2E smoke). No merging if anything breaks.
2. **Each feature branch** → PR to `develop` → CI must pass → squash merge.
3. **Test counts enforced:** ReadingService 12+, ProgressService 10+, SearchService 8+, SeriesManagerService 6+, SummaryGeneratorService 6+.
4. **Coverage gates:** Backend 80%+, Frontend 80%+, Services 85%, Pipes 100%, Guards 90%.
5. **Commit convention:** `<type>(<scope>): <subject>` (e.g., `feat(api): add GET endpoint for today's reading`)

---

## Remaining Work Summary

### High Priority
1. **Phase 10 — Verify coverage**: Run `dotnet test /p:CollectCoverage=true` and `jest --coverage` to confirm ≥80% backend, ≥80% frontend
2. **Phase 10 — Performance baselines**: Run k6 load tests and verify p95 < 500ms first request, < 200ms cached

### Medium Priority
3. **Phase 9 — Localization**: Extract i18n strings, generate `.xlf` files, add language selector
4. **Phase 9 — Manual review**: Review first 30 AI-generated summaries per series
5. **Phase 8 — E2E offline/notification tests**: Write and run OFF-01 to OFF-04, NOTIF-01 to NOTIF-03
6. **Phase 10 — Full E2E**: Run Appium/Detox tests on iOS + Android simulators

### Lower Priority
7. **Phase 10 — Accessibility**: Run axe-core scans
8. **Phase 10 — Security scan**: Run OWASP ZAP
9. **Phase 8 — Server-side push**: Implement FCM push from backend for daily reading notifications
10. **Phase 8 — Conflict resolution**: Add version tracking for last-write-wins conflict resolution
11. **Phase 11 — Performance monitoring**: Set up Azure Application Insights with custom event tracking
