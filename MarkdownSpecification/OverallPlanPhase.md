# Overall Implementation Plan — Encounter Daily

**Last updated:** 2026-05-18

## Project Scope

| Layer | What | Scale |
|---|---|---|
| **Backend** | .NET 8 Web API with Repository/Unit of Work pattern | 7 tables, 18+ endpoints |
| **Frontend** | Angular + Ionic + Capacitor mobile app | 8 screens, 7 shared components |
| **Database** | SQL Server with Full-Text Search | ~1,460 daily readings across 4 series |
| **Auth** | Google + Facebook OAuth with JWT + refresh tokens | |
| **Offline** | SQLite cache with bidirectional sync | 3-tier caching |
| **Notifications** | FCM push notifications | |
| **Testing** | xUnit, Jest, E2E (Appium/Detox), k6, OWASP ZAP | 80%+ coverage required |

---

## Phased Plan (10-11 weeks)

### Phase 1: Foundation
**Duration:** 1.5 weeks

**Deliverables:**
- Create `EncounterDaily.sln` with all 4 projects (API, Core, Infrastructure, Tests)
- Create all entity classes matching spec tables (`Series`, `Book`, `DailyReading`, `User`, `UserProgress`, `UserBookmark`, `UserSeriesPreference`, `SearchHistory`)
- Create `AppDbContext` with `DbSet` for each table
- Implement `IRepository<T>` (generic CRUD interface)
- Implement `GenericRepository<T>`
- Implement `IUnitOfWork` and `UnitOfWork`
- Enums (`SeriesType`, `BookType`)
- Base entity class (`BaseEntity`)
- Abstract Service layer: `IService<T>` (generic interface), `BaseService<T>` (generic implementation), specific service interfaces and implementations for Series, Reading, Progress, Bookmark
- Abstract Controller layer: `BaseController<T>` (generic controller), specific controllers for Series, Reading, Progress, Bookmark
- DI registration for DbContext, UnitOfWork, and all services

**Tests to run after:**
- Backend unit tests on entities
- Backend unit tests on `GenericRepository<T>`
- Backend unit tests on `BaseService<T>` and specific services
- Backend unit tests on `BaseController<T>` and specific controllers
- `dotnet test backend/ --filter "Category=Unit"`

---

### Phase 2: Authentication
**Duration:** 1 week

**Deliverables:**
- Google OAuth endpoint (`POST /api/v1/auth/google`)
- Facebook OAuth endpoint (`POST /api/v1/auth/facebook`)
- JWT issuance with RS256 signing (15-min access, 30-day refresh)
- Refresh token rotation (`POST /api/v1/auth/refresh`)
- `GET /api/v1/auth/me` — current user
- `AuthService` backend
- `@capacitor-secure-storage-plugin` integration for token storage
- Angular `AuthInterceptor` (401 auto-refresh)
- Auth guard (`auth.guard.ts`)

**Tests to run after:**
- Auth service unit tests (GetCurrentUser, RefreshToken rotation, reuse detection)
- Auth controller unit tests (login, refresh, error handling)
- E2E: AUTH-01 to AUTH-05
- **Full test suite re-run**

**Implemented backend:**
- `RefreshToken` entity with reuse tracking (revoke after 3 reuses)
- `IUserRepository` + `UserRepository` (find by OAuth provider)
- Auth DTOs: `LoginRequest`, `TokenResponse`, `RefreshRequest`, `UserDto`
- `IAuthService` + `AuthService`: Google/Facebook login, RS256 JWT (15min), refresh token rotation (30 days), `/auth/me`
- `AuthController` with `POST /api/v1/auth/google`, `POST /api/v1/auth/facebook`, `POST /api/v1/auth/refresh`, `GET /api/v1/auth/me`
- JWT validation middleware, CORS, RSA key singleton
- 11 new auth tests (service + controller)

**Frontend** (Angular/Ionic): Not yet scaffolded — directory stubs exist

---

### Phase 3: Series & Readings Backend
**Duration:** 1.5 weeks

**Deliverables:**
- CSV import tool (`EncounterDaily.ImportTool` console app) — generate or import CSV seed data for all 4 series (~1,464 rows)
- Seed CSV files in `database/seed-data/` (4 files, 366 readings each for 2024 leap year)
- `IReadingRepository` with series-specific queries (GetBySeriesDate, GetBySeriesMonth, GetBySeriesYear, SearchByText)
- `ReadingService` with new methods: `GetTodayReadingAsync`, `GetFullReadingAsync`, `GetSummaryAsync`
- `ISeriesRepository` and `SeriesRepository` with book includes
- All reading endpoints: `GET /api/v1/reading/series/{id}/today`, `/series/{id}/date/{m}/{d}`, `/series/{id}/month/{m}`, `/{id}/full`, `/{id}/summary`, `search/{id}`
- All series endpoints: `GET /api/v1/series`, `GET /api/v1/series/{id}`, `GET /api/v1/series/{id}/config`
- `SeriesFactory` pattern (`ISeriesFactory`, `SeriesFactory`, `SeriesConfig` DTO)
- DTOs: `DailyReadingDto`, `ReadingDetailDto`, `SummaryDto`, `SeriesConfig`
- Broader search: `SearchByTextAsync` now searches `FullTextSecondary` and `SummaryPoints` too
- Aligned routes to `/api/v1/` prefix

**Tests to run after:**
- `ReadingServiceTests` (13 tests) — includes today, full, summary coverage
- `ReadingRepositoryTests` (5 tests)
- `ReadingControllerTests` (11 tests) — DTO-based returns
- `SeriesServiceTests`
- `SeriesControllerTests` (4 tests) — includes config endpoint
- Full test suite: **150 tests, all passing**

---

### Phase 4: Progress & Bookmarks Backend
**Duration:** 1 week

**Deliverables:**
- DTOs: `ProgressDto`, `BookmarkDto`
- `IProgressRepository` and `ProgressRepository` (GetUserReadingProgress, GetStreak, GetUserProgressForSeries, GetCompletionPercentage)
- `ProgressService` — mark complete (`MarkCompleteAsync`), unmark (`UnmarkCompleteAsync`), streak calculation
- `IBookmarkRepository` and `BookmarkRepository` (GetUserBookmarks, GetUserBookmark, GetUserBookmarksBySeries)
- `BookmarkService` — add bookmark (`AddBookmarkAsync`), remove bookmark (`RemoveBookmarkAsync`)
- Progress endpoints: `GET /api/v1/progress/series/{seriesId}`, `GET /api/v1/progress/series/{seriesId}/streak`, `POST /api/v1/progress/{readingId}/complete`, `DELETE /api/v1/progress/{readingId}/complete`
- Bookmark endpoints: `GET /api/v1/bookmarks`, `POST /api/v1/bookmarks/{readingId}`, `DELETE /api/v1/bookmarks/{readingId}`
- Auth context: userId extracted from JWT claims (not URL params)
- Controllers inherit `ControllerBase` directly (no inherited CRUD routes)

**Tests to run after:**
- `ProgressServiceTests` (12 tests) — including mark/unmark complete
- `BookmarkServiceTests` (10 tests) — including add/remove bookmark
- `ProgressControllerTests` (5 tests) — including POST/DELETE
- `BookmarkControllerTests` (5 tests) — including POST/DELETE
- Full test suite: **162 tests, all passing**

---

### Phase 5: Search Backend
**Duration:** 0.5 weeks

**Deliverables:**
- SQL Server Full-Text Search configuration on `DailyReadings`
- `ISearchRepository` and `SearchRepository`
- `SearchService`
- Search endpoints (`/api/v1/search?q=`, `/api/v1/search/all?q=`)
- Pagination support (`OFFSET/FETCH`)

**Tests to run after:**
- `SearchServiceTests` (8+ tests)
- Search API integration tests
- E2E: SRCH-01 to SRCH-06
- **Full test suite re-run**

---

### Phase 6: Frontend Core
**Duration:** 1.5 weeks

**Deliverables:**
- Angular + Ionic project initialization
- All core services (`auth`, `api`, `series`, `reading`, `progress`, `bookmark`, `search`, `notification`, `offline-storage`)
- Shared components: `ReadingCard`, `ReadingSummary`, `CalendarDay`, `ProgressBar`, `SearchBar`, `SeriesSelector`, `MarkdownViewer`
- Base classes: `BaseReadingPageComponent`, `BaseCalendarPageComponent`
- App routing module
- Environment configs

**Tests to run after:**
- Component tests (ReadingCard, CalendarDay, SeriesSelector)
- Service unit tests with mocks
- Smoke E2E tests
- **Full test suite re-run**

---

### Phase 7: Frontend Screens
**Duration:** 1.5 weeks

**Deliverables:**
- Login screen (Google + Facebook buttons)
- Series Selection screen (4 cards)
- Today's Reading screen
- Full Reading screen (tabbed for Series 2)
- Calendar View screen
- Search screen
- Progress Dashboard screen
- Bookmarks screen
- Settings screen (notification time, dark mode, font size, logout)

**Tests to run after:**
- All frontend component tests
- Full E2E suite (all scenarios)
- Accessibility tests (axe-core, zero critical/serious violations)
- **Full test suite re-run**

---

### Phase 8: Offline & Notifications
**Duration:** 1 week

**Deliverables:**
- SQLite integration via `@capacitor-community/sqlite`
- `OfflineStorageService` — cache tiers, offline queue, sync
- Bidirectional sync (app foreground + connectivity restore)
- Conflict resolution (last-write-wins)
- FCM push notifications via `@capacitor/push-notifications`
- Notification permission flow (post-series-selection)
- Notification payload handling (daily_reading, streak_milestone, series_complete)

**Tests to run after:**
- Offline E2E: OFF-01 to OFF-04
- Notification E2E: NOTIF-01 to NOTIF-03
- **Full test suite re-run**

---

### Phase 9: Polish & AI Summaries
**Duration:** 1 week

**Deliverables:**
- AI summary generation (batch via Azure OpenAI / Claude API)
- 3-6 bullet points per day, 10-25 words each
- Manual review of first 30 days per series
- Dark mode / night mode
- Font scaling (accessibility-aware)
- Localization scaffold (`@angular/localize`, `.xlf` files)

**Tests to run after:**
- Full regression suite
- Performance tests (k6 load testing)
- Security scan (OWASP ZAP)
- **Full test suite re-run**

---

### Phase 10: Hardening
**Duration:** 3 days

**Deliverables:**
- All tests green
- Backend coverage ≥ 80%, Frontend coverage ≥ 80%
- Performance baselines met (p95 < 500ms first request, < 200ms cached)
- Deploy pipeline verified (staging + production)
- Documentation finalized

**Tests to run after:**
- **Complete test suite:**
  - Backend unit + integration
  - Frontend unit + component
  - Full E2E (iOS + Android)
  - Regression smoke + critical + full
  - Performance (k6)
  - Accessibility (axe-core)
  - Security (OWASP ZAP)

---

## Key Rules

1. **After every phase** — run the entire test suite (backend unit + integration + frontend unit + E2E smoke). No merging if anything breaks.
2. **Each feature branch** → PR to `develop` → CI must pass → squash merge.
3. **Test counts enforced:** ReadingService 12+, ProgressService 10+, SearchService 8+, SeriesManagerService 6+, SummaryGeneratorService 6+.
4. **Coverage gates:** Backend 80%+, Frontend 80%+, Services 85%, Pipes 100%, Guards 90%.
5. **Commit convention:** `<type>(<scope>): <subject>` (e.g., `feat(api): add GET endpoint for today's reading`)
