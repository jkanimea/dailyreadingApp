# Mobile Application Development Specification

## Project: Daily Devotional Reading App (4-Series Edition)

### App Name: `Encounter Daily`

---

## 1. PROJECT OVERVIEW

Build a **cross-platform mobile application** (iOS and Android) using:

| Technology                          | Purpose                   |
| ----------------------------------- | ------------------------- |
| **Angular (Ionic/Capacitor)** | Frontend mobile framework |
| **.NET Core Web API**         | Backend RESTful services  |
| **SQL Express**               | Relational database       |
| **Google & Facebook OAuth**   | Authentication            |

The app supports **four distinct reading series**, each following the same pattern but with different source books:

| Series             | Title                 | Focus                       | Primary Book                | Companion Book            |
| ------------------ | --------------------- | --------------------------- | --------------------------- | ------------------------- |
| **Series 1** | Christ The Way        | The four Gospels            | *Desire of Ages*          | —                        |
| **Series 2** | Christ The Church     | Acts to Revelation          | *Acts of the Apostles*    | *The Great Controversy* |
| **Series 3** | Christ Our Redemption | First half of Old Testament | *Patriarchs and Prophets* | —                        |
| **Series 4** | Christ Our Hope       | Last half of Old Testament  | *Prophets and Kings*      | —                        |

---

## 2. CORE FUNCTIONALITY

The app displays **daily reading plans** for all four series. Each series includes:

- Daily Bible passage(s)
- Primary book page range reference (e.g., *Desire of Ages* pages 831-835)
- For Series 2: Secondary book reference (*The Great Controversy*)
- Full text content of the referenced pages
- Point-form summary of each day's reading
- Search functionality across all series
- User authentication to track progress per series

---

## 3. SOLID PRINCIPLES & DESIGN PATTERNS

### 3.1 SOLID Implementation Requirements

| Principle                       | Backend Implementation                                                         | Frontend Implementation                                                   |
| ------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| **S**ingle Responsibility | Each service handles ONE domain (ReadingService, AuthService, ProgressService) | Each component handles ONE view (ReadingListComponent, CalendarComponent) |
| **O**pen/Closed           | Base repository interface; extend for specific series without modifying base   | Base reading component; extend for series-specific variations             |
| **L**iskov Substitution   | All series repositories implement same IReadingRepository                      | All series views extend BaseReadingPageComponent                          |
| **I**nterface Segregation | Split large interfaces into smaller ones (IReadable, ISearchable, ITrackable)  | Small, focused component inputs/outputs                                   |
| **D**ependency Inversion  | High-level modules depend on abstractions (interfaces), not concretions        | Services injected via Angular DI; components depend on abstract services  |

### 3.2 Design Patterns to Use

| Pattern                      | Where to Apply                                                                     |
| ---------------------------- | ---------------------------------------------------------------------------------- |
| **Repository Pattern** | Database access abstraction for each series                                        |
| **Unit of Work**       | Transactions across multiple tables                                                |
| **Factory Pattern**    | Creating series-specific reading instances                                         |
| **Strategy Pattern**   | Different summary generation strategies per book                                   |
| **Observer Pattern**   | Progress updates and notifications                                                 |
| **Facade Pattern**     | Simplify complex operations (e.g., complete reading + update streak + award badge) |
| **Singleton**          | Shared service instances (Angular DI provides this)                                |
| **Component Pattern**  | Reusable UI elements (Angular components)                                          |

---

## 4. DATABASE DESIGN

### 4.1 Core Tables

#### Table: `Series`

| Column          | Type                 | Description                                 |
| --------------- | -------------------- | ------------------------------------------- |
| Id              | INT (PK)             | 1, 2, 3, or 4                               |
| Name            | NVARCHAR(50)         | "Christ The Way", "Christ The Church", etc. |
| ShortName       | NVARCHAR(20)         | "Series1", "Series2", etc.                  |
| Description     | NVARCHAR(500)        | Series description                          |
| PrimaryBookId   | INT (FK → Books.Id) | Main book (e.g., Desire of Ages)            |
| SecondaryBookId | INT (FK → Books.Id) | For Series 2 only (The Great Controversy)   |
| SortOrder       | INT                  | Display order                               |

#### Table: `Books`

| Column         | Type          | Description                                    |
| -------------- | ------------- | ---------------------------------------------- |
| Id             | INT (PK)      | Primary key                                    |
| Title          | NVARCHAR(100) | "Desire of Ages", "Acts of the Apostles", etc. |
| Author         | NVARCHAR(100) | "Ellen G. White"                               |
| FullTextSource | NVARCHAR(500) | URL or file path to digital text               |
| PageCount      | INT           | Total pages                                    |

#### Table: `DailyReadings`

| Column                 | Type                  | Description                                         |
| ---------------------- | --------------------- | --------------------------------------------------- |
| Id                     | INT (PK, Identity)    | Primary key                                         |
| SeriesId               | INT (FK → Series.Id) | Which series this reading belongs to                |
| Month                  | INT                   | 1 to 12                                             |
| Day                    | INT                   | 1 to 31                                             |
| BibleReading           | NVARCHAR(500)         | Scripture references                                |
| PrimaryBookPageRange   | NVARCHAR(50)          | e.g., "DA 831-835"                                  |
| PrimaryBookPageStart   | INT                   | Starting page number                                |
| PrimaryBookPageEnd     | INT                   | Ending page number                                  |
| SecondaryBookPageRange | NVARCHAR(50)          | For Series 2 only (nullable)                        |
| SecondaryBookPageStart | INT                   | Nullable                                            |
| SecondaryBookPageEnd   | INT                   | Nullable                                            |
| FullTextPrimary        | NVARCHAR(MAX)         | Text from primary book pages                        |
| FullTextSecondary      | NVARCHAR(MAX)         | Text from secondary book (nullable)                 |
| SummaryPoints          | NVARCHAR(MAX)         | Bullet-point summary (JSON or text with delimiters) |
| SortOrder              | INT                   | For ordering within series                          |

#### Table: `Users`

| Column           | Type                   | Description                         |
| ---------------- | ---------------------- | ----------------------------------- |
| Id               | INT (PK, Identity)     | Primary key                         |
| Email            | NVARCHAR(255) (UNIQUE) | User's email                        |
| Provider         | NVARCHAR(50)           | "Google" or "Facebook"              |
| ProviderId       | NVARCHAR(255)          | OAuth provider ID                   |
| DisplayName      | NVARCHAR(100)          | User's name                         |
| SelectedSeriesId | INT                    | Currently active series (default 1) |
| CreatedAt        | DATETIME               | Registration timestamp              |
| LastLoginAt      | DATETIME               | Last login timestamp                |

#### Table: `UserProgress`

| Column         | Type                         | Description                  |
| -------------- | ---------------------------- | ---------------------------- |
| Id             | INT (PK, Identity)           | Primary key                  |
| UserId         | INT (FK → Users.Id)         | References user              |
| SeriesId       | INT (FK → Series.Id)        | Which series                 |
| DailyReadingId | INT (FK → DailyReadings.Id) | References the day's reading |
| IsCompleted    | BIT                          | Whether user has read it     |
| CompletedAt    | DATETIME                     | When marked complete         |
| Notes          | NVARCHAR(MAX)                | Optional user notes          |

#### Table: `UserBookmarks`

| Column         | Type                         | Description        |
| -------------- | ---------------------------- | ------------------ |
| Id             | INT (PK, Identity)           | Primary key        |
| UserId         | INT (FK → Users.Id)         | References user    |
| SeriesId       | INT (FK → Series.Id)        | Which series       |
| DailyReadingId | INT (FK → DailyReadings.Id) | Bookmarked reading |
| BookmarkedAt   | DATETIME                     | Timestamp          |

#### Table: `UserSeriesPreference`

| Column     | Type                  | Description                            |
| ---------- | --------------------- | -------------------------------------- |
| Id         | INT (PK, Identity)    | Primary key                            |
| UserId     | INT (FK → Users.Id)  | References user                        |
| SeriesId   | INT (FK → Series.Id) | Series ID                              |
| StartDate  | DATE                  | When user started this series          |
| CurrentDay | INT                   | Last read day number                   |
| IsActive   | BIT                   | Whether currently tracking this series |

#### Table: `SearchHistory`

| Column     | Type                  | Description                |
| ---------- | --------------------- | -------------------------- |
| Id         | INT (PK, Identity)    | Primary key                |
| UserId     | INT (FK → Users.Id)  | References user            |
| SeriesId   | INT (FK → Series.Id) | Which series they searched |
| SearchTerm | NVARCHAR(255)         | Search query               |
| SearchedAt | DATETIME              | Timestamp                  |

---

## 5. BACKEND ARCHITECTURE (.NET Core)

### 5.1 Project Structure                                                                                                                        

Backend/

├── EncounterDaily.API/ # API controllers, Startup
├── EncounterDaily.Core/ # Domain models, Interfaces
│ ├── Entities/
│ │ ├── BaseEntity.cs
│ │ ├── Series.cs
│ │ ├── Book.cs
│ │ ├── DailyReading.cs
│ │ ├── User.cs
│ │ ├── UserProgress.cs
│ │ └── UserBookmark.cs
│ ├── Interfaces/
│ │ ├── Repositories/
│ │ │ ├── IRepository.cs # Generic CRUD interface
│ │ │ ├── IReadingRepository.cs
│ │ │ ├── IProgressRepository.cs
│ │ │ ├── IBookmarkRepository.cs
│ │ │ └── ISeriesRepository.cs
│ │ ├── Services/
│ │ │ ├── IReadingService.cs
│ │ │ ├── IProgressService.cs
│ │ │ ├── ISearchService.cs
│ │ │ ├── INotificationService.cs
│ │ │ └── ISummaryGeneratorService.cs
│ │ └── IUnitOfWork.cs
│ └── Enums/
│ ├── SeriesType.cs
│ └── BookType.cs
├── EncounterDaily.Infrastructure/ # Data access, Repositories
│ ├── Data/
│ │ └── AppDbContext.cs
│ ├── Repositories/
│ │ ├── GenericRepository.cs # Implements IRepository**`<T>`**
│ │ ├── ReadingRepository.cs
│ │ ├── ProgressRepository.cs
│ │ ├── BookmarkRepository.cs
│ │ └── SeriesRepository.cs
│ └── UnitOfWork.cs # Implements IUnitOfWork
├── EncounterDaily.Services/ # Business logic
│ ├── ReadingService.cs
│ ├── ProgressService.cs
│ ├── SearchService.cs
│ ├── NotificationService.cs
│ ├── SummaryGeneratorService.cs
│ └── SeriesManagerService.cs
└── EncounterDaily.Tests/ # Unit and integration tests

**text**

```

### 5.2 Core Interfaces (Pseudo-code)

```csharp
// Generic Repository Interface
public interface IRepository<T> where T : BaseEntity
{
    Task<T> GetByIdAsync(int id);
    Task<IEnumerable<T>> GetAllAsync();
    Task<T> AddAsync(T entity);
    Task UpdateAsync(T entity);
    Task DeleteAsync(int id);
    Task<bool> ExistsAsync(Expression<Func<T, bool>> predicate);
}

// Reading Repository Interface
public interface IReadingRepository : IRepository<DailyReading>
{
    Task<DailyReading> GetBySeriesDateAsync(int seriesId, int month, int day);
    Task<IEnumerable<DailyReading>> GetBySeriesMonthAsync(int seriesId, int month);
    Task<IEnumerable<DailyReading>> GetBySeriesYearAsync(int seriesId);
    Task<IEnumerable<DailyReading>> SearchByTextAsync(int seriesId, string searchTerm);
}

// Reading Service Interface
public interface IReadingService
{
    Task<DailyReadingDto> GetTodayReadingAsync(int seriesId);
    Task<DailyReadingDto> GetReadingByDateAsync(int seriesId, int month, int day);
    Task<IEnumerable<DailyReadingDto>> GetMonthReadingsAsync(int seriesId, int month);
    Task<ReadingDetailDto> GetFullReadingAsync(int readingId);
    Task<SummaryDto> GetSummaryAsync(int readingId);
}

// Unit of Work Interface
public interface IUnitOfWork : IDisposable
{
    IReadingRepository Readings { get; }
    IProgressRepository Progress { get; }
    IBookmarkRepository Bookmarks { get; }
    ISeriesRepository Series { get; }
    Task<int> CompleteAsync();
}

// Series Factory Pattern
public interface ISeriesFactory
{
    SeriesConfig CreateConfig(int seriesId);
}

public class SeriesConfig
{
    public int SeriesId { get; set; }
    public string PrimaryBookTitle { get; set; }
    public string SecondaryBookTitle { get; set; }
    public bool HasSecondaryReading { get; set; }
    public string DateRangeStart { get; set; }
}
```

### 5.3 API Endpoints

| Method                     | Endpoint                                               | Description                            |
| -------------------------- | ------------------------------------------------------ | -------------------------------------- |
| **Authentication**   |                                                        |                                        |
| POST                       | `/api/auth/google`                                   | Google OAuth login                     |
| POST                       | `/api/auth/facebook`                                 | Facebook OAuth login                   |
| GET                        | `/api/auth/me`                                       | Get current user                       |
| **Series**           |                                                        |                                        |
| GET                        | `/api/series`                                        | Get all available series               |
| GET                        | `/api/series/{id}`                                   | Get series details                     |
| **Readings**         |                                                        |                                        |
| GET                        | `/api/readings/today`                                | Today's reading (user's active series) |
| GET                        | `/api/readings/series/{seriesId}/today`              | Today's reading for specific series    |
| GET                        | `/api/readings/series/{seriesId}/date/{month}/{day}` | Specific date reading                  |
| GET                        | `/api/readings/series/{seriesId}/month/{month}`      | Full month of readings                 |
| GET                        | `/api/readings/{id}/full`                            | Full text of reading                   |
| GET                        | `/api/readings/{id}/summary`                         | Summary points only                    |
| **Progress**         |                                                        |                                        |
| GET                        | `/api/progress/series/{seriesId}`                    | User progress for series               |
| POST                       | `/api/progress/{readingId}/complete`                 | Mark complete                          |
| DELETE                     | `/api/progress/{readingId}/complete`                 | Unmark complete                        |
| GET                        | `/api/progress/series/{seriesId}/streak`             | Current streak                         |
| **Bookmarks**        |                                                        |                                        |
| GET                        | `/api/bookmarks`                                     | All user bookmarks                     |
| POST                       | `/api/bookmarks/{readingId}`                         | Add bookmark                           |
| DELETE                     | `/api/bookmarks/{readingId}`                         | Remove bookmark                        |
| **Search**           |                                                        |                                        |
| GET                        | `/api/search?q={term}&seriesId={id}`                 | Search within series                   |
| GET                        | `/api/search/all?q={term}`                           | Search across all series               |
| **User Preferences** |                                                        |                                        |
| GET                        | `/api/user/series`                                   | Get user's series preferences          |
| PUT                        | `/api/user/series/{seriesId}/activate`               | Set active series                      |
| PUT                        | `/api/user/notification-time`                        | Set daily notification time            |

### 5.4 API Authentication & Security

#### Token-Based Auth (JWT)

| Item | Specification |
|------|---------------|
| Token type | JWT (JSON Web Token) with RS256 signing |
| Access token lifetime | 15 minutes |
| Refresh token lifetime | 30 days (stored hashed in DB) |
| Token transport | `Authorization: Bearer <token>` header on all requests |
| Token refresh | `/api/v1/auth/refresh` endpoint; Angular `AuthInterceptor` handles 401s automatically |

#### Security Hardening

| Area | Requirement |
|------|-------------|
| Token storage (device) | `@capgo/capacitor-secure-storage-plugin` (iOS Keychain / Android EncryptedSharedPreferences) |
| HTTPS | Enforce TLS 1.2+ on all API traffic; reject HTTP connections |
| SSL pinning | Implement via `TrustKit` (iOS) and Android `Network Security Config` |
| JWT validation | Server validates `exp`, `iss`, `aud` claims; reject tampered tokens (invalid signature = 401) |
| Refresh token rotation | Issue new refresh token on each use; invalidate old one |
| Rate limiting | Apply per-IP and per-user rate limits (100 req/min per user, 1000 req/min per IP) |
| Input validation | Validate and sanitize all inputs server-side; use parameterized queries to prevent SQL injection |
| CORS | Restrict to known origins only in production |
| Secrets | Store OAuth client secrets, DB connection strings, JWT signing keys in GitHub Secrets / Azure Key Vault, never in code |

### 5.5 API Versioning

| Rule | Detail |
|------|--------|
| Versioning scheme | URL path prefix: `/api/v1/` |
| Current version | `v1` |
| Backward compatibility | Maintain at least one prior version after introducing a new one |
| Deprecation | Announce deprecation via `Sunset` response header with a date; remove after 6-month notice period |
| Client guidance | Frontend pins to `/api/v1/` in environment config; version bump requires coordinated release |

---

## 6. FRONTEND ARCHITECTURE (Angular + Ionic)

### 6.1 Project Structure (Reusable Components)

**text**

```
src/
├── app/
│   ├── core/
│   │   ├── services/
│   │   │   ├── auth.service.ts
│   │   │   ├── api.service.ts
│   │   │   ├── series.service.ts
│   │   │   ├── reading.service.ts
│   │   │   ├── progress.service.ts
│   │   │   ├── bookmark.service.ts
│   │   │   ├── search.service.ts
│   │   │   ├── notification.service.ts
│   │   │   └── offline-storage.service.ts
│   │   ├── guards/
│   │   │   └── auth.guard.ts
│   │   ├── interceptors/
│   │   │   └── auth.interceptor.ts
│   │   └── models/
│   │       ├── series.model.ts
│   │       ├── reading.model.ts
│   │       ├── progress.model.ts
│   │       └── user.model.ts
│   ├── shared/
│   │   ├── components/
│   │   │   ├── reading-card/
│   │   │   ├── reading-summary/
│   │   │   ├── calendar-day/
│   │   │   ├── progress-bar/
│   │   │   ├── search-bar/
│   │   │   ├── series-selector/
│   │   │   └── markdown-viewer/
│   │   ├── pipes/
│   │   └── directives/
│   ├── features/
│   │   ├── base/
│   │   │   ├── base-reading-page.component.ts   # Abstract base class
│   │   │   └── base-calendar-page.component.ts  # Abstract base class
│   │   ├── login/
│   │   ├── today/
│   │   ├── calendar/
│   │   ├── reading-detail/
│   │   ├── search/
│   │   ├── progress/
│   │   ├── bookmarks/
│   │   ├── settings/
│   │   └── series/
│   └── app-routing.module.ts
├── assets/
│   ├── data/
│   │   ├── series-1-readings.json
│   │   ├── series-2-readings.json
│   │   ├── series-3-readings.json
│   │   └── series-4-readings.json
│   ├── fonts/
│   └── icons/
└── environments/
    ├── environment.ts
    └── environment.prod.ts
```

### 6.2 Reusable Component Specifications

#### BaseReadingPageComponent (Abstract)

| Property/Method                       | Type                    | Description           |
| ------------------------------------- | ----------------------- | --------------------- |
| `currentReading`                    | `Observable<Reading>` | Current reading data  |
| `isLoading`                         | `boolean`             | Loading state         |
| `error`                             | `string`              | Error message         |
| `loadReading(seriesId, month, day)` | `abstract method`     | Must implement        |
| `markComplete()`                    | `method`              | Mark reading complete |
| `bookmark()`                        | `method`              | Toggle bookmark       |

#### ReadingCardComponent

| Input            | Type        | Description            |
| ---------------- | ----------- | ---------------------- |
| `reading`      | `Reading` | Reading data object    |
| `showSummary`  | `boolean` | Show summary points    |
| `isCompleted`  | `boolean` | Show completion status |
| `isBookmarked` | `boolean` | Show bookmark status   |

| Output         | Type                     | Description                  |
| -------------- | ------------------------ | ---------------------------- |
| `onTap`      | `EventEmitter<number>` | Emits reading ID when tapped |
| `onComplete` | `EventEmitter<number>` | Emits when marked complete   |
| `onBookmark` | `EventEmitter<number>` | Emits when bookmarked        |

#### SeriesSelectorComponent

| Input                | Type         | Description               |
| -------------------- | ------------ | ------------------------- |
| `selectedSeriesId` | `number`   | Currently selected series |
| `seriesList`       | `Series[]` | Array of available series |

| Output            | Type                     | Description               |
| ----------------- | ------------------------ | ------------------------- |
| `seriesChanged` | `EventEmitter<number>` | Emits when series changes |

#### CalendarDayComponent

| Input            | Type        | Description                     |
| ---------------- | ----------- | ------------------------------- |
| `day`          | `number`  | Day of month                    |
| `month`        | `number`  | Month (1-12)                    |
| `reading`      | `Reading` | Reading for this day (nullable) |
| `isCompleted`  | `boolean` | Whether completed               |
| `isBookmarked` | `boolean` | Whether bookmarked              |
| `isToday`      | `boolean` | Whether this is current date    |

| Output          | Type                           | Description              |
| --------------- | ------------------------------ | ------------------------ |
| `daySelected` | `EventEmitter<{month, day}>` | Emits when day is tapped |

### 6.3 Screen Specifications

| Screen                       | Description                                                                                        |
| ---------------------------- | -------------------------------------------------------------------------------------------------- |
| **Login**              | Two buttons: Sign in with Google, Sign in with Facebook                                            |
| **Series Selection**   | 4 cards showing each series with title, description, progress                                      |
| **Today's Reading**    | Shows active series, Bible passage, summary points; buttons for full text, mark complete, bookmark |
| **Full Reading**       | Tabbed view for Series 2 (primary + secondary text); font size controls; night mode                |
| **Calendar View**      | Month grid with completion/bookmark indicators; series selector dropdown                           |
| **Search**             | Search across Bible references, book text, summaries; filter by series                             |
| **Progress Dashboard** | Charts, streak counter, completion by series                                                       |
| **Bookmarks**          | List grouped by series; swipe to delete                                                            |
| **Settings**           | Notification time, dark mode, font size, logout                                                    |

### 6.4 Offline Architecture Specification

#### Storage Engine

| Item | Decision |
|------|----------|
| Engine | **SQLite** via `@capacitor-community/sqlite` |
| Why SQLite | Structured relational data (readings, progress, bookmarks); same query model online and offline; handles 10,000+ records with no performance degradation |
| Encryption | Apply SQLCipher layer for user progress and bookmark data |

#### Cache Tiers

| Tier | Content | Policy |
|------|---------|--------|
| **Tier 1 (Always)** | Current month's readings for active series + user's full progress/bookmarks | Retrieved on app launch; updated on every sync |
| **Tier 2 (On-demand)** | Full text and summary for any reading user opens | Persisted locally after first fetch; evicted only if storage exceeds threshold |
| **Tier 3 (Prefetch)** | All 4 series full text (~5-10 MB) | Optional download via Settings; one-time cost |

#### Sync Strategy

| Aspect | Behavior |
|--------|----------|
| Trigger | App foreground + connectivity restore event |
| Direction | Bidirectional — pull server changes down, push local changes up |
| Conflict resolution | Last-write-wins (sufficient for single-user; no concurrent edit risk) |
| Offline queue | Queue user actions (mark complete, add/remove bookmark) in FIFO order; flush sequentially when online |
| De-duplication | Each queued action carries a client-generated UUID; server rejects duplicate UUIDs |

#### Angular Service Pattern

```
offline-storage.service.ts
├── getCachedReading(seriesId, month, day) → Reading
├── saveReadingToCache(reading) → void
├── getCachedProgress(userId) → UserProgress[]
├── queueOfflineAction(action) → void
├── flushOfflineQueue() → Promise<SyncResult>
└── getLastSyncTimestamp() → Date
```

### 6.5 Push Notification Specification

#### Service Selection

| Item | Decision |
|------|----------|
| Delivery service | **Firebase Cloud Messaging (FCM)** — routes to both Android (natively) and iOS (via APNs relay) through a single API |
| Capacitor plugin | `@capacitor/push-notifications` |

#### Permission Flow

| Step | Behavior |
|------|----------|
| Prompt timing | After user selects initial series (post-login), not on splash screen |
| If granted | Register device token via `POST /api/v1/notifications/register` |
| If denied | Show opt-in prompt in Settings ("Enable daily reminders") that opens OS permission settings |
| Re-prompt | Never re-prompt natively after denial; respect OS permission state |

#### Notification Payload

```json
{
  "title": "Today's Reading",
  "body": "Series 1 — Mark 1:1; Luke 1 (DA 19-21)",
  "data": {
    "type": "daily_reading",
    "seriesId": 1,
    "month": 5,
    "day": 10
  }
}
```

#### Extensible Types

| `type` value | When sent | Routing |
|-------------|-----------|---------|
| `daily_reading` | Daily reminder at user's scheduled time | Opens today's reading |
| `streak_milestone` | 7-day / 30-day streak achieved | Opens progress dashboard |
| `series_complete` | User finishes all readings in a series | Opens celebration screen |

---

## 7. DATA POPULATION REQUIREMENT (All 4 Series)

### 7.1 Series 1: Christ The Way

* 365 daily readings (provided in CSV format)
* Primary book: *Desire of Ages*
* No secondary book

### 7.2 Series 2: Christ The Church

* Reading plan from *Acts of the Apostles* and *The Great Controversy*
* Some days may have two book references
* Daily Bible passages from Acts through Revelation

### 7.3 Series 3: Christ Our Redemption

* Reading plan from *Patriarchs and Prophets*
* Covers Genesis through 1 Samuel (first half of Old Testament)

### 7.4 Series 4: Christ Our Hope

* Reading plan from *Prophets and Kings*
* Covers 2 Samuel through Malachi (last half of Old Testament)

### 7.5 Data Import Strategy

For each series:

1. Import daily reading plan (CSV format for each series)
2. For each `PrimaryBookPageRange`, extract corresponding pages from digital text
3. For Series 2 `SecondaryBookPageRange`, extract from *The Great Controversy*
4. Generate point-form summaries for each day's combined reading
5. Store all content in database

### 7.6 CSV Import Schema

Each series reading plan is provided as a CSV file with the following columns:

| Column | Type | Required | Example | Notes |
|--------|------|----------|---------|-------|
| `month` | Integer (1-12) | Yes | `1` | |
| `day` | Integer (1-31) | Yes | `1` | Must be a valid date for the month |
| `bibleReading` | Text | Yes | `"Mark 1:1; Luke 1"` | Scripture reference string |
| `primaryBookPrefix` | Text | Yes | `DA` | Book code matching `Books.FullTextSource` markers |
| `primaryPageStart` | Integer | Yes | `19` | Starting page number |
| `primaryPageEnd` | Integer | Yes | `21` | Ending page number |
| `secondaryBookPrefix` | Text | No | `GC` | For Series 2 only; null for other series |
| `secondaryPageStart` | Integer | No | `45` | Nullable |
| `secondaryPageEnd` | Integer | No | `47` | Nullable |

**File naming:** `series-{N}-readings.csv` where N is 1-4.
**Leap year handling:** Include Feb 29 row if the series covers 366 days. If the series has exactly 365 readings, the import tool should detect the current year and flag whether Feb 29 coverage exists for manual resolution.

### 7.7 Summary Generation Process

| Item | Specification |
|------|---------------|
| Timing | Batch generation during Phase 3 (not on-the-fly) |
| Storage | Pre-generated `SummaryPoints` column as JSON array of strings |
| Method | Send each day's `FullTextPrimary` to an LLM (Azure OpenAI or Claude API) |
| Prompt instruction | *"Summarize this devotional passage in 3-6 bullet points. Each bullet: 10-25 words. Focus on the key spiritual takeaway."* |
| Quality validation | Manual review of first 30 days per series; auto-generate remainder after approval |
| Length constraint | 3-6 bullet points per day; 10-25 words per bullet |
| Fallback | If LLM generation fails for a specific day, leave summary empty and flag for manual entry |

---

## 8. EXTENSIBILITY DESIGN

* **Adding a new series** : Insert row in `Series` table + 365 rows in `DailyReadings`; zero code changes
* **Adding a new book** : Insert into `Books` table; associate with series; no code changes required

---

## 9. BUSINESS RULES

| Rule                  | Description                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------- |
| Multi-series progress | Users can track progress in multiple series independently                                   |
| Series switching      | Changing active series does NOT reset progress in other series                              |
| Daily reset           | "Today's reading" changes at midnight based on local timezone for each series independently |
| Streak calculation    | Calculated per series, not globally                                                         |
| First launch          | User chooses initial series; default is Series 1                                            |

---

## 10. SOURCE BOOKS FOR TEXT EXTRACTION

All books are publicly available from the Ellen G. White Estate:

| Book                         | Edition              | Page Numbering |
| ---------------------------- | -------------------- | -------------- |
| *The Desire of Ages*       | Pacific Press (1940) | Standard       |
| *The Acts of the Apostles* | Pacific Press (1911) | Standard       |
| *The Great Controversy*    | Pacific Press (1911) | Standard       |
| *Patriarchs and Prophets*  | Pacific Press (1913) | Standard       |
| *Prophets and Kings*       | Pacific Press (1917) | Standard       |

---

## 11. SEARCH IMPLEMENTATION

### 11.1 Search Engine

| Aspect | Specification |
|--------|---------------|
| Engine | SQL Server Full-Text Search (built-in, no additional services) |
| Indexed columns | `DailyReadings.BibleReading`, `FullTextPrimary`, `FullTextSecondary`, `SummaryPoints` |
| Query type | `CONTAINS` for phrase matching; `FREETEXT` for fuzzy matching |
| Case sensitivity | Case-insensitive by default |
| Stop words | Use SQL Server system stoplist; customize if needed for book-specific terms |

### 11.2 API Behavior

| Parameter | Behavior |
|-----------|----------|
| `q` | Minimum 2 characters; trim whitespace |
| `seriesId` | Optional filter; omit to search all series |
| Pagination | Return top 20 results by default; support `?page=N&pageSize=N` via `OFFSET/FETCH` |
| Ranking | Order by `RANK` from SQL Server Full-Text ranker |
| Empty results | Return `200` with empty `items` array (not `404`) |

### 11.3 Frontend Behavior

| Aspect | Specification |
|--------|---------------|
| Debounce | 300ms debounce on keystroke before firing API call |
| Min query length | 2 characters |
| Loading state | Show spinner after 500ms of no response |
| Empty state | "No results found for '[query]'. Try a different search term or check your spelling." |
| Error state | "Search is unavailable right now. Please try again later." |

---

## 12. PERFORMANCE REQUIREMENTS

| Metric | Target (p95) |
|--------|-------------|
| API response (first request of session) | < 500ms |
| API response (subsequent / cached) | < 200ms |
| App cold start (mid-range device) | < 3 seconds |
| Single-series search | < 1 second |
| Cross-series search | < 2 seconds |
| Calendar month load (28-31 readings) | < 500ms |
| App package size (APK / IPA) | < 30 MB |

---

## 13. ERROR & EDGE CASE HANDLING

| Scenario | Behavior |
|----------|----------|
| Network offline | Show cached content with subtle "Offline" banner at top. Queue write actions locally. |
| API timeout (> 10s) | Show "Still loading..." with visible retry button after 15s. Never show indefinite spinner. |
| No reading for selected date | "No reading assigned for this date. Try another day." |
| Leap year / Feb 29 | Import tool checks whether Feb 29 exists in CSV; flags for manual resolution if missing |
| Auth token expired | Interceptor silently refreshes via refresh token. User never sees login screen mid-session. |
| OAuth provider down | "Unable to sign in with Google/Facebook right now. Try again later." Do not crash. |
| Empty bookmarks | Illustration + "No bookmarks yet. Tap the bookmark icon on any reading to save it here." |
| Empty progress | Illustration + "Start your first reading today to begin tracking your progress." |
| Empty search results | "No results found for '[query]'. Try a different search term or check your spelling." |
| Server error (5xx) | "Something went wrong on our end. Please try again in a few minutes." Log the error server-side. |
| Client error (4xx) | Show the specific error message from the API response body if available; otherwise show generic guidance. |

---

## 14. ACCESSIBILITY REQUIREMENTS

| Standard | Target |
|----------|--------|
| Guideline | WCAG 2.1 Level AA minimum |
| Color contrast | ≥ 4.5:1 for normal text, ≥ 3:1 for large text |
| Touch targets | Minimum 44x44 CSS points for all interactive elements (Ionic defaults meet this) |
| Screen readers | All dynamic state changes (mark complete, navigation) announced via `LiveAnnouncer` (`@angular/cdk/a11y`) |
| Dark mode | Respect system-level dark mode via Ionic theming; manual toggle in Settings |
| Font scaling | Respect device accessibility font size; Ionic `--ion-font-size` adjusts accordingly |
| Focus indicators | Visible focus ring on all interactive elements for keyboard navigation |

---

## 15. ANALYTICS & MONITORING

| Domain | Tool | Purpose |
|--------|------|---------|
| Crash reporting | **Sentry** (frontend + backend) | Unified crash tracking across Angular and .NET |
| API monitoring | **Azure Application Insights** | Request tracing, failure tracking, performance monitoring |
| Usage events | Application Insights custom events | Track: login, reading opened, bookmark added, series switched, mark complete |
| Alerts | Azure Monitor | Alert on p95 response time > 1s, error rate > 5%, app down |
| Logging | `ILogger` (.NET) + `console.log` (Angular, stripped in production) | Structured logging; no PII in logs |

---

## 16. LOCALIZATION STRATEGY

| Aspect | Decision |
|--------|----------|
| Framework | `@angular/localize` (`@angular/common/i18n`) — Angular's built-in i18n |
| v1 language | English only |
| Architecture | Extract all user-facing strings into `.xlf` translation files from day 1 |
| Pipeline | Angular CLI `extract-i18n` generates translation template; rebuild with `--localize` for each locale |
| Adding a language | Create new `.xlf` file with translations; zero code changes |
| Future-proofing | Never hardcode user-facing strings in components or templates; always use `i18n` attribute or `$localize` tag |

---

## 17. DEVELOPMENT PHASES

| Phase           | Duration              | Tasks                                                                     |
| --------------- | --------------------- | ------------------------------------------------------------------------- |
| Phase 1         | 1.5 weeks             | Database design, generic repository/service/controller patterns, Unit of Work, authentication |
| Phase 2         | 1.5 weeks             | Import all 4 series readings (approx. 1,460 daily records), extract text  |
| Phase 3         | 2 weeks               | Generate summaries for all 4 series (AI-assisted)                         |
| Phase 4         | 2 weeks               | Build reusable Angular components + base classes                          |
| Phase 5         | 1 week                | Implement all screens with series-switching capability                    |
| Phase 6         | 1 week                | Search, progress tracking, bookmarks, offline support                     |
| Phase 7         | 1 week                | Push notifications, settings, polish                                      |
| Phase 8         | 3 days                | Testing, bug fixes, deployment                                            |
| **Total** | **10-11 weeks** |                                                                           |
