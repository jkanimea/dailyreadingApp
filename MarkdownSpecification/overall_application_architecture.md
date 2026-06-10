# Overall Application Architecture

## Project: Encounter Daily Mobile Application (4-Series Devotional Reading App)

---

## 1. High-Level Architecture

The application follows a **Client-Server** architecture with a **RESTful API** backend and a **hybrid mobile** frontend.

```
┌──────────────────────────────────────────────────────────────────┐
│                      Mobile App (iOS / Android)                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Angular 20 + Ionic 8 + Capacitor                         │  │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌──────────┐  │  │
│  │  │ 9 Feature │ │ 7 Shared  │ │ 9 Core    │ │ Auth     │  │  │
│  │  │ Screens   │ │Components │ │ Services  │ │ Intercept │  │  │
│  │  └───────────┘ └───────────┘ └───────────┘ └──────────┘  │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────┬───────────────────────────────────────┘
                           │ HTTPS / JWT
┌──────────────────────────▼───────────────────────────────────────┐
│                  .NET 10 Web API                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ Controllers  │→ │ Services     │→ │ Infrastructure       │   │
│  │ (API Layer)  │  │ (Business)   │  │ (Repositories / EF)  │   │
│  └──────────────┘  └──────────────┘  └───────────┬──────────┘   │
│                                                   │              │
│  ┌────────────────────────────────────────────────▼──────────┐   │
│  │              SQL Server / SQLite (offline)                │   │
│  │  12 tables: Series, DailyReadings, UserProgress,         │   │
│  │  BibleVerses, EgwPages, Books, Users, Bookmarks, ...     │   │
│  └───────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

### Backend: Clean Architecture

```
EncounterDaily.API/           # Controllers, Middleware, DI Registration
EncounterDaily.Core/          # Entities, Interfaces, DTOs, Enums
EncounterDaily.Infrastructure/# EF Core DbContext, Repositories, UnitOfWork
EncounterDaily.Services/      # Business Logic, Service Implementations
EncounterDaily.Tests/         # xUnit + Moq + FluentAssertions
```

**Layer dependencies flow inward:** `API → Services → Core` (Core has no dependencies)

### Frontend: Angular Feature Module Architecture

```
src/app/
├── core/                     # Singleton services, guards, interceptors, models
│   ├── services/             # API communication via custom ApiService
│   ├── guards/               # AuthGuard, AdminGuard
│   ├── interceptors/         # AuthInterceptor (401 → refresh → retry)
│   └── models/               # TypeScript interfaces matching DTOs
├── shared/                   # Reusable components, pipes, directives
│   └── components/           # ReadingCard, CalendarDay, SeriesSelector, etc.
└── features/                 # Lazy-loaded feature modules
    ├── login/                # OAuth login (Google + Guest)
    ├── today/                # Today's reading with notes
    ├── journal/              # Journal page (notes, print, share, AI Summarize)
    ├── calendar/             # Month grid view
    ├── reading-detail/       # Full reading with Bible/EGW text
    ├── search/               # Full-text search
    ├── progress/             # Completion stats and streaks
    ├── bookmarks/            # Saved readings
    ├── settings/             # Theme, font, notifications, series
    └── series/               # Series selection
```

---

## 2. Design Patterns

| Pattern | Where Applied | Purpose |
|---------|--------------|---------|
| **Repository Pattern** | Backend: `IRepository<T>` / `GenericRepository<T>` | Database access abstraction for all entities |
| **Unit of Work** | Backend: `IUnitOfWork` / `UnitOfWork` | Transaction scoping across multiple repositories; single `CompleteAsync()` commits all changes |
| **Factory Pattern** | Backend: `ISeriesFactory` / `SeriesFactory` | Creates series-specific config (primary/secondary books, date ranges) |
| **Strategy Pattern** | Backend: Summary generation per book series | Different AI prompt strategies per EGW book |
| **Observer Pattern** | Backend: Progress → Streak recalculation | Marking complete triggers streak update |
| **Facade Pattern** | Backend: `ReadingService.GetFullReadingAsync` | Assembles Bible verses + EGW pages + DTO mapping in one call |
| **Singleton** | Frontend: All Angular services | Shared state via Angular DI (single instance per module) |
| **Dependency Injection** | Both: Constructor injection throughout | Loose coupling, testability |
| **Lazy Loading** | Frontend: Feature modules | Each screen loads only when navigated to |
| **Component Pattern** | Frontend: `@Input` / `@Output` | Reusable UI building blocks with typed interfaces |

---

## 3. SOLID Principles

### Backend (.NET)

| Principle | Implementation |
|-----------|---------------|
| **S**ingle Responsibility | `ReadingService` handles only reading queries; `ProgressService` handles only completion/notes; `AuthService` handles only authentication. Each class has one reason to change. |
| **O**pen/Closed | `IReadingRepository` extends `IRepository<T>` — new query methods added without modifying the generic base. Services depend on interfaces, not concrete types — new implementations added without changing consumers. |
| **L**iskov Substitution | All repositories implement `IRepository<T>` — any repository can substitute for any other. All service implementations satisfy their interface contracts. |
| **I**nterface Segregation | `IUnitOfWork` exposes separate properties for each repository (`IUnitOfWork.Readings`, `IUnitOfWork.Progress`, `IUnitOfWork.Bookmarks`). A service only depends on the repositories it needs. |
| **D**ependency Inversion | `ProgressController` depends on `IProgressService` (abstraction), not `ProgressService` (concretion). `ProgressService` depends on `IUnitOfWork` (abstraction). Concrete wiring happens only in `Program.cs` DI registration. |

### Frontend (Angular)

| Principle | Implementation |
|-----------|---------------|
| **S**ingle Responsibility | Each component handles one view: `ReadingCardComponent` displays a reading card, `CalendarDayComponent` renders a single day cell. Each service wraps one API domain. |
| **O**pen/Closed | `BaseReadingPageComponent` provides shared reading logic; Today and Reading-Detail pages extend it without modifying the base. New components can be added without changing existing ones. |
| **L**iskov Substitution | All feature modules follow the same lazy-loaded pattern — any can be added/removed from routing without affecting others. All services injected via DI can be swapped with mocks in tests. |
| **I**nterface Segregation | Component inputs are minimal and focused: `@Input() reading: ReadingDto`, `@Output() onTap = new EventEmitter<number>()`. Components don't receive full service dependencies — only the data they need. |
| **D**ependency Inversion | Components inject abstract service classes via Angular DI tokens. Tests provide mock implementations. The view layer never instantiates services directly. |

---

## 4. Key Data Flows

### Reading Flow
```
User opens Today → ReadingService.getToday()
  → SeriesService.getConfig() for active series
  → ReadingRepository.GetBySeriesDateAsync(seriesId, month, day)
  → BibleVerses table lookup (KJV/ASV/WEB per preference)
  → EgwPages table lookup for primary + secondary page ranges
  → Assembly into ReadingDetailDto → returned to frontend
```

### Notes / Journal Flow
```
User types notes → debounce 1.5s → PUT /progress/{readingId}/notes
  → ProgressService.SaveNotesAsync(userId, readingId, notes)
  → If no UserProgress record: lookup DailyReading → get SeriesId → create
  → If notes empty + not completed: delete record → return null (204)
  → Otherwise: update Notes field → return ProgressDto (200)

User opens Journal → GET /progress/series/{seriesId}/journal
  → ProgressService.GetJournalAsync(userId, seriesId)
  → Join UserProgress + DailyReading + Series
  → Filter: IsCompleted=true OR Notes!=null
  → Order by Month, Day → return JournalEntryDto[]
```

### OAuth + JWT Flow
```
User taps "Sign in with Google"
  → Capacitor Google Auth plugin → OAuth token
  → POST /auth/google { idToken } → backend validates with Google
  → Creates/finds User record → generates RS256 JWT (15min)
  + RefreshToken (30 days, stored hashed)
  → Tokens returned to device → stored in Secure Storage (iOS Keychain/Android EncryptedSharedPreferences)
  → AuthInterceptor attaches Bearer token to all requests
  → On 401: interceptor calls /auth/refresh with refresh token
  → Refresh token rotated (old invalidated, new issued)
  → Replay detection: if same refresh token used 3+ times → revoke ALL tokens for that user
```

### Print Flow (Multi-page)
```
User clicks Print on Journal page
  → printJournal() filters selected entries
  → Opens new window: window.open('', '_blank')
  → Builds standalone HTML via buildPrintHtml():
    - DOCTYPE + meta charset
    - Inline CSS: card layout, notes styling, @media print with break-inside:avoid
    - Print header "My Reading Journal — {seriesName}"
    - Each entry: date, Bible reading, page ranges, notes (HTML-escaped)
  → Writes to new window → closes document → focuses
  → Calls window.print() after 300ms
  → On afterprint: auto-closes print window
```

---

## 5. Authentication & Security

| Aspect | Implementation |
|--------|---------------|
| Token type | JWT with RS256 signing (asymmetric keys) |
| Access token | 15-minute lifetime |
| Refresh token | 30-day lifetime, stored hashed in DB with SHA-256 |
| Token storage | `@capgo/capacitor-secure-storage-plugin` (iOS Keychain / Android EncryptedSharedPreferences) |
| Token refresh | Automatic via `AuthInterceptor` — catches 401, calls `/auth/refresh`, retries original request |
| Replay detection | Revoke all tokens if same refresh token reused 3+ times |
| Rate limiting | Partitioned per-IP (1000/min) and per-user (100/min) buckets |
| Auth bypass | `DevMode:BypassAuth` flag for local development |
| CORS | Restricted to known origins in production |
| OAuth providers | Google OAuth (primary), Guest login (dev), Facebook removed (system Share API covers it) |

---

## 6. Database Schema (12 tables)

| Table | Purpose | Key Relationships |
|-------|---------|-------------------|
| `Series` | 4 reading series | → Books (primary + secondary) |
| `Books` | EGW source books | Referenced by Series |
| `DailyReadings` | ~1,460 daily reading records | → Series; → EgwPages for text |
| `BibleVerses` | ~31K KJV/ASV/WEB verses | Looked up at query time |
| `EgwPages` | ~3,214 EGW book pages | Looked up at query time by book + page range |
| `Users` | User accounts | Linked to OAuth provider IDs |
| `UserProgress` | Completion + notes per reading | → Users, → DailyReadings |
| `UserBookmarks` | Bookmarked readings | → Users, → DailyReadings |
| `UserSeriesPreference` | Per-series user settings | → Users, → Series |
| `SearchHistory` | Logged search queries | → Users, → Series |
| `RefreshTokens` | JWT refresh token store | → Users |
| `AppLogs` | Server-side error logging | Standalone |

---

## 7. Highlight Features

### 7.1 Bible + EGW Text Caching
Bible verses (~31K) and EGW pages (~3,214) are stored in reusable database tables, not duplicated per-reading. When assembling full reading text, the service looks up `BibleVerses` by book/chapter/verse and `EgwPages` by book + page range. Adding a new series that references existing books requires zero HTTP requests or re-scraping — text is assembled from cached data. On re-run or adding a new series, the system checks the cache first and skips web scraping if pages already exist.

### 7.2 Three Bible Translations
Users can toggle between KJV, ASV, and WEB translations. The preference is persisted. All three translations are stored in the `BibleVerses` table and looked up at query time based on user preference.

### 7.3 AI Summarize
Each journal entry has an "AI Summarize" button. It sends the user's notes to a backend endpoint (`POST /progress/{readingId}/summarize`) which calls DeepSeek via OpenRouter API. The result is shown in an AlertController popup with "Dismiss" and "Replace Notes" options. Available on Journal page, Today page, and Reading Detail page.

### 7.4 Multi-Page Printing (4 iterations)
The print feature for journal entries evolved through four iterations:
1. **CSS `@media print`** — failed because Ionic's Shadow DOM scroll container clipped to 1 page
2. **CSS with `contain:none`** — added `contain:none !important` to `ion-content::part(scroll)`; worked on some browsers but not reliably
3. **New window (first attempt)** — opened a new window but lost styling and couldn't filter selected entries; reverted
4. **New window (current)** — opens a new window with standalone HTML built from entry data; includes full inline CSS for card styling, `@media print` with `break-inside:avoid`, XSS escaping, and auto-closes on `afterprint`

A CSS regression test reads `global.scss` at test time and asserts the `contain:none` rule exists as a safety net.

### 7.5 OAuth with Refresh Token Rotation
JWT access tokens last 15 minutes. Refresh tokens last 30 days and are stored hashed in the database. Each refresh operation issues a new refresh token and invalidates the old one. If the same refresh token is presented 3+ times (indicating theft/replay), all tokens for that user are revoked, forcing re-authentication.

### 7.6 Offline Sync Queue
User actions (mark complete, add/remove bookmark) are queued in FIFO order in localStorage when offline. When connectivity is restored, the queue is flushed sequentially. A debounce of 2.5 seconds prevents rapid-fire sync attempts. A concurrent sync guard prevents multiple sync operations from running simultaneously.

### 7.7 Debounced Auto-Save Notes
Notes in the reading detail page are auto-saved 1.5 seconds after the user stops typing. A "Saved"/"Unsaved" status indicator provides feedback. The debounce timer is cleared on `ngOnDestroy` to prevent ghost saves after navigation. If the save fails, it silently retries on the next keystroke.

### 7.8 Bottom Tab Navigation
The primary navigation uses a bottom tab bar with three tabs: **Today** (sunny icon), **Journal** (book icon), **Calendar** (calendar icon). A "More" action sheet provides access to less-frequent screens: Search, Progress, Bookmarks, Settings, and Switch Series. All three tab pages have consistent icon headers.

### 7.9 CI/CD Pipeline
GitHub Actions workflows handle:
- **CI**: Backend unit tests (.NET 10), frontend unit tests (Jest, Node 22), run on every PR
- **CD**: Automated deploy to production via SSH + Docker
- **Android APK**: Multi-stage Podman build, triggered after successful production deploy
- **Greploop**: GPT-based auto-review on every PR diff

### 7.10 Test Coverage
**287 tests across 25 suites, all passing.**
- Backend: xUnit + Moq + FluentAssertions for service/controller/repository unit tests
- Frontend: Jest with mock objects for fast execution
- Journal page tests use a **plain mock object pattern** (not TestBed) to avoid Ionic/Angular TestBed setup overhead, running 36 tests in ~4 seconds
- CSS regression test reads `global.scss` from disk and asserts critical `@media print` rules

---

## 8. Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Backend Runtime | .NET | 10.0 |
| Frontend Framework | Angular | 20 |
| Mobile Framework | Ionic | 8 |
| Mobile Runtime | Capacitor | 8 |
| Database | SQL Server / SQLite (offline) | — |
| Auth | Google OAuth 2.0 | — |
| AI Provider | DeepSeek via OpenRouter API | — |
| Backend Tests | xUnit + Moq + FluentAssertions | — |
| Frontend Tests | Jest + Angular Test Bed | 29.x |
| CI/CD | GitHub Actions | — |
| Containerization | Podman / Docker | — |
| Package Manager | npm | 10+ |
