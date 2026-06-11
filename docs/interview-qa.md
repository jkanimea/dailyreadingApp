# Encounter Daily — Interview Preparation Q&A

> This document adapts senior-level interview questions to this specific application:
> **Encounter Daily** — a .NET 10 + Angular 20 + Ionic 8 cross-platform devotional reading app.

---

## 1. What Is This Application in a Nutshell?

**Encounter Daily** is a hybrid mobile app delivering daily devotional readings from four Ellen G. White book series (Christ The Way, Christ The Church, Christ Our Redemption, Christ Our Hope). It has a **.NET 10 Clean Architecture REST API** backend with SQL Server, and an **Angular 20 + Ionic 8 + Capacitor** frontend that compiles to iOS/Android. It supports OAuth (Google/Facebook), offline sync queue, 3 Bible translations (KJV/ASV/WEB), AI-powered note summarization via DeepSeek API, dark/light theme, multi-page printing, and a CI/CD pipeline deploying via Podman containers to a Linux VPS.

---

## 2. Architecture Overview

### Backend: .NET 10 Clean Architecture (6 projects)

| Project | Purpose |
|---------|---------|
| `EncounterDaily.API` | ASP.NET controllers, middleware (Exception, JWT, Rate Limiting), DI registration, Swagger |
| `EncounterDaily.Core` | Entities, interfaces, DTOs, enums — zero external dependencies |
| `EncounterDaily.Infrastructure` | EF Core DbContext, UnitOfWork, Repository implementations, migrations |
| `EncounterDaily.Services` | Business logic: Auth, Reading, Progress, Bookmark, Search, AI Summary |
| `EncounterDaily.Tests` | xUnit + Moq + FluentAssertions — 287 tests across 25 suites |
| `EncounterDaily.ImportTool` | CLI tool for data seeding, text ingestion, batch AI summarization |

### Frontend: Angular 20 + Ionic 8 + Capacitor

| Layer | Components |
|-------|-----------|
| **Core** (9 services) | AuthService, ApiService, ReadingService, ProgressService, BookmarkService, SearchService, PreferencesService, SecureStorageService, SyncService |
| **Guards** | AuthGuard, AdminGuard |
| **Interceptors** | AuthInterceptor (JWT refresh), ErrorInterceptor |
| **Features** (12 modules) | Today, Calendar, Journal, ReadingDetail, Search, Progress, Bookmarks, Settings, Login, Account, Series, Admin/LogViewer |
| **Shared** (8 standalone) | ReadingCard, ReadingSummary, CalendarDay, ProgressBar, SearchBar, SeriesSelector, MarkdownViewer, AvatarButton |

---

## 3. AI Concept Used

Unlike the trading app (which had on-device Whisper, RAG, ChromaDB, VLM models), this app uses **external AI via API**:

- **Provider**: DeepSeek via OpenRouter API (`deepseek-chat` model)
- **Usage**: Summarize user's journal/notes into 2-3 clear sentences
- **Parameters**: `temperature=0.5`, `max_tokens=300`
- **Retry**: Exponential backoff on failure
- **No local AI models** — zero GPU dependency on the server
- **No RAG pipeline** — Bible/EGW text is pre-seeded in SQL Server (not vector-embedded)

---

## 4. Software Design Principles

### SOLID Principles Applied

| Principle | Implementation |
|-----------|---------------|
| **S**ingle Responsibility | Each service owns one domain: `AuthService` handles auth only, `ProgressService` handles completion/notes only, `ReadingService` handles reading queries only |
| **O**pen/Closed | `IReadingRepository` extends `IRepository<T>` — new query methods added without modifying the generic base. Services depend on interfaces, not concrete types |
| **L**iskov Substitution | All repositories implement `IRepository<T>` — any repository can replace another without breaking consumers |
| **I**nterface Segregation | `IUnitOfWork` exposes separate repository properties — a service only depends on the repositories it needs |
| **D**ependency Inversion | Controllers depend on `IProgressService` (abstraction), not `ProgressService` (concretion). DI wiring happens only in `Program.cs` |

### Gang of Four Design Patterns Used

| Pattern | Where | Why |
|---------|-------|-----|
| **Repository** | `GenericRepository<T>` + typed repos | Abstracts EF Core — makes data access testable and swappable |
| **Unit of Work** | `UnitOfWork` wrapping all repos | Single `CompleteAsync()` commits all changes transactionally |
| **Factory** | `SeriesFactory` / `ISeriesFactory` | Creates series-specific configuration objects (books, date ranges) |
| **Strategy** | `IAiSummaryService` | Different AI prompt strategies could be swapped per book series |
| **Facade** | `ReadingService.GetFullReadingAsync()` | Assembles Bible verses + EGW pages + DTO mapping in one call |
| **Singleton** | Angular `providedIn: 'root'` services | Shared state across the app via Angular DI |
| **Observer** | RxJS subscriptions for sync/refresh | SyncService watches `window.online` events; AuthInterceptor queues requests during refresh |
| **Chain of Responsibility** | Middleware pipeline in `Program.cs` | ExceptionMiddleware → JwtMiddleware → Rate Limiting → Controller |
| **Template Method** | `BaseController<T>` abstract class | Provides shared CRUD endpoints; subclasses only implement what's different |
| **Abstract Base Class** | `BaseEntity` (abstract), `BaseApiController` (abstract), `BaseReadingPageComponent` (abstract) | Shares common Id/timestamps, shared routing, shared reading logic |

### Why Abstract Class Over Interface?

In this codebase:

| Aspect | Abstract Class (`BaseEntity`, `BaseController`) | Interface (`IRepository<T>`, `IService<T>`) |
|--------|----------------------------------------------|--------------------------------------------|
| Can provide **shared implementation** | Yes — `BaseEntity` provides `Id`, `CreatedAt`, `UpdatedAt` | No |
| Can define **contract** | Yes — abstract methods must be implemented | Yes — all members are contract |
| Multiple inheritance | No — C# single inheritance only | Yes — a class can implement many interfaces |
| Used when | Entities share identity pattern; controllers share routing + error handling | Cross-cutting capabilities (logging, repository CRUD) |

**Open/Closed Principle applied**: `BaseController<T>` is *closed for modification* but *open for extension*. New controllers inherit all shared logic and only override what differs.

---

## 5. Queue System — Design Pattern

The **SyncService** (frontend) implements a **Command Pattern** inside a **Message Queue**:

```
User Action → Enqueue Command (e.g., MarkComplete) → localStorage Queue
                                                          ↓ (on reconnect)
Debounce 2.5s → Flush Queue → concatMap(sequential) → Process Each Command
```

**Design patterns involved:**

| Pattern | Role |
|---------|------|
| **Command** | Each offline action (markComplete, addBookmark, removeBookmark) is encapsulated as a command object with `type + payload` |
| **Message Queue** | FIFO queue storing pending commands in localStorage |
| **Producer-Consumer** | User actions produce commands; SyncService consumes them sequentially |
| **Observer** | SyncService observes `window.online`/`window.offline` events to trigger flush |

---

## 6. Message Queue / Event-Driven Architecture

While this app doesn't use a full event bus (like RabbitMQ or Azure Service Bus), the offline sync implements an **event-driven** pattern:

```
┌─────────────┐    enqueue     ┌──────────────┐   flush    ┌─────────────┐
│ User Action │ ──────────────→│ localStorage │ ──────────→│ API Backend │
│ (Producer)  │                │ Queue (FIFO) │            │ (Consumer)  │
└─────────────┘                └──────────────┘            └─────────────┘
```

**Key properties:**
- **At-least-once delivery**: SyncService retries on failure
- **Ordered processing**: `concatMap` ensures commands execute in order
- **Back-pressure**: Concurrent sync guard prevents parallel flushes
- **Persistence**: Queue survives app restart via localStorage

---

## 7. Why Two Types of Storage (SQL Server + Not Vector DB)?

| Question | Answer |
|----------|--------|
| **Why SQL Server instead of ChromaDB/vector DB?** | The app doesn't do semantic search or RAG. All data is structured: daily readings, Bible verses by book/chapter/verse, EGW pages by page range. Relational queries (joins, indexes, pagination) are more efficient for structured devotional content than vector similarity |
| **Can you call ChromaDB NoSQL?** | ChromaDB is a vector database, which is a subtype of NoSQL. It stores embeddings (float arrays) with metadata, not relational rows. You can't do JOINs or SQL queries on it |
| **What is a vector DB?** | Stores data as vector embeddings + metadata. Queried by similarity (cosine distance, L2), not exact match. Used for semantic search, RAG, recommendation. Example: "find the 10 most similar Bible verses to this prayer" |

---

## 8. Functional vs Non-Functional Requirements

### Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-01 | User can sign in via Google or Facebook OAuth |
| FR-02 | User can view today's devotional reading (Bible + EGW text) |
| FR-03 | User can navigate readings by calendar date |
| FR-04 | User can mark readings as complete and write journal notes |
| FR-05 | User can bookmark readings for later |
| FR-06 | User can search across all readings by keyword |
| FR-07 | User can view progress (completion %, streaks) per series |
| FR-08 | User can switch between 3 Bible translations (KJV/ASV/WEB) |
| FR-09 | User can AI-summarize their journal notes via DeepSeek |
| FR-10 | User can print journal entries |
| FR-11 | User can change theme (light/dark/system) and font size |
| FR-12 | Admin can view and filter application logs |

### Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR-01 | **Offline**: User can mark complete/add bookmarks offline; sync when reconnected |
| NFR-02 | **Performance**: API responds < 500ms for 95th percentile under 100 concurrent users |
| NFR-03 | **Security**: JWT with RS256 signing, refresh token rotation, replay detection |
| NFR-04 | **Scalability**: Stateless API (JWT) enables horizontal scaling |
| NFR-05 | **Availability**: Podman containers with health-check and restart policy |
| NFR-06 | **Testability**: 80%+ code coverage, dependency-injected for mocking |
| NFR-07 | **Maintainability**: Clean Architecture with inward dependency flow |
| NFR-08 | **Portability**: Cross-platform mobile via Capacitor + single codebase |

---

## 9. Technology Stack — With Library Purposes

### Backend (.NET 10)

| Library | Version | Purpose |
|---------|---------|---------|
| `Microsoft.AspNetCore.Identity` | Built-in | JWT authentication middleware |
| `Microsoft.EntityFrameworkCore` | 10.0.8 | ORM for SQL Server data access |
| `Microsoft.EntityFrameworkCore.SqlServer` | 10.0.8 | SQL Server database provider |
| `Serilog.AspNetCore` | 10.0 | Structured logging to file + console |
| `Swashbuckle.AspNetCore` | 6.5 | Swagger/OpenAPI documentation |
| `Google.Apis.Auth` | 1.69 | Google OAuth ID token validation |
| `System.Threading.RateLimiting` | Built-in | Sliding window rate limiting per IP/user |
| `BCrypt.Net-Next` | Latest | Password hashing (guest accounts) |
| `System.IdentityModel.Tokens.Jwt` | 8.4 | JWT token generation and validation |
| `xUnit` | 2.4 | Unit testing framework |
| `Moq` | 4.20 | Mocking framework for tests |
| `FluentAssertions` | 8.10 | Readable test assertions |

### Frontend (Angular 20 + Ionic 8)

| Library | Version | Purpose |
|---------|---------|---------|
| `@angular/core` | 20.x | Frontend framework — components, DI, routing |
| `@ionic/angular` | 8.x | UI component library — mobile-native controls |
| `@capacitor/core` | 8.3 | Native runtime bridge — access device APIs |
| `@capacitor/secure-storage-plugin` | Latest | Encrypted token storage (iOS Keychain / Android EncryptedSharedPreferences) |
| `@capacitor/push-notifications` | Latest | Push notification registration and handling |
| `@capacitor/local-notifications` | Latest | Schedule daily reading reminder notifications |
| `rxjs` | 7.8 | Reactive programming — async data streams |
| `zone.js` | 0.15 | Angular change detection |
| `jest-preset-angular` | Latest | Frontend unit testing |
| `@angular-builders/custom-webpack` | Latest | Custom webpack config for Capacitor compatibility |

---

## 10. How Was It Developed? (Phased Approach)

| Phase | What Was Built | Status |
|-------|---------------|--------|
| 1 | Solution scaffold, entities, Clean Architecture setup | Complete |
| 2 | Auth (Google/Facebook OAuth, JWT RS256, refresh rotation) | Complete |
| 3 | Series, daily readings, Bible verse + EGW text assembly | Complete |
| 4 | Progress tracking, bookmarks, search | Complete |
| 5 | Frontend screens (Today, Calendar, Journal, Reading Detail) | Complete |
| 6 | Settings, profile, offline sync, notifications | Complete |
| 7 | AI Summarize feature via DeepSeek API | Complete |
| 8 | Multi-page printing (4 iterations), test suites | Complete |
| 9 | CI/CD pipeline, Podman containerization, deployment | Complete |
| 10 | Coverage verification, i18n, performance baselines | In progress |

---

## 11. GPU and AI Model Usage

**This app does NOT use GPU or local AI models.** Unlike the trading app (which ran Whisper medium on Kaggle GPUs for YouTube transcription):

- All AI is **external API calls** to DeepSeek via OpenRouter
- No GPU on the server — the backend runs on a $5/month VPS
- No model files (.pt, .onnx, .bin) in the repository
- No vector embeddings — no ChromaDB, no FAISS, no GPU memory management

**Why?** The use case (summarizing 2-3 sentences of journal notes) doesn't warrant the cost and complexity of a local model. API calls cost ~$0.002 per summary and need zero GPU infrastructure.

---

## 12. Chunk/Graph Enrichment — Adapted to This App

The trading app used RAG enrichment (chunking transcripts → embedding → vector DB → knowledge graph). In **this app**, "enrichment" happens differently:

```
Raw CSV Data → Series 1-4 Readings
                     ↓
            BibleVerse Lookup (by book/chapter/verse)
                     ↓
            EgwPage Assembly (by book code + page range)
                     ↓
            DailyReadingDto (fully assembled reading)
```

- **Chunking analogy**: Bible verses are stored as individual rows (~31K verses), EGW pages as individual rows (~3,214 pages) — pre-chunked at the natural boundary (verse/page)
- **Graph analogy**: Entity relationships via foreign keys (Series → DailyReadings → BibleVerses/EgwPages) form a relational graph
- **No embeddings**: Retrieval is by exact key lookup, not vector similarity

---

## 13. How Are Bible and EGW Texts Assembled?

```
DailyReading record has:
  - BibleReading field: "John 3:16-17"
  - PrimaryBookPageRange: "DA 19-25"
  
At query time:

Step 1: Parse Bible reference → extract book, chapter, verse(s)
Step 2: Query BibleVerses WHERE Book = book AND Chapter = chapter
Step 3: Filter verse range 16-17
Step 4: Choose translation (KJV/ASV/WEB) per user preference

Step 5: Parse "DA 19-25" → BookCode="DA", startPage=19, endPage=25
Step 6: Query EgwPages WHERE BookCode = "DA" AND PageNumber BETWEEN 19 AND 25
Step 7: Order by PageNumber → concatenate text

Step 8: Assemble into ReadingDetailDto
```

**No transcription, no chunking model, no embedding model** — it's all SQL lookups with exact indices.

---

## 14. Behavioral Interview Answers

### "Tell me about a time you worked in a team"

> "On Encounter Daily, I collaborated with a distributed team. I structured the work into 10 phases with clear milestones tracked in GitHub Projects. Each API endpoint had a specification, a controller test, a service test, and a repository test written before the implementation — this let team members pick up any issue without context-switching overhead. I used PR templates, automated CI checks, and required at least one review before merge."

### "Tell me about a conflict on your team"

> "During the printing feature, I proposed a CSS-only approach to multi-page journal printing. The team lead insisted on using a third-party PDF library. I built a prototype of the CSS approach in 2 hours — it failed because Ionic's Shadow DOM clipped content to one page. Instead of arguing, I pivoted to a new-window approach (iteration 4). I documented all 4 iterations with the failure reasons in the spec docs so the team wouldn't repeat the same mistakes."

### "Tell me about a frustrating client requirement"

> "The client wanted all 4 Ellen G. White series (1,464 readings) seeded with AI-generated summaries before launch. The DeepSeek API would have cost ~$80 and taken 3 hours of batching. I built an `ImportTool` CLI with a `summarize` command that batch-processed all readings with dry-run mode, error logging, and rate limiting. I also added an 'AI Summarize' button on the frontend so individual summaries could be generated on-demand, giving the client control without blocking the launch."

### "How do you approach solution gathering?"

> "I use a three-step process: (1) **Understand the domain** — read existing data (CSV files, existing app behavior), map entity relationships. (2) **Spec-first** — write a markdown specification covering architecture, data flow, and acceptance criteria before writing code. (3) **Iterative prototype** — build the simplest working version, test it, then layer on features. For example, the print feature went through 4 iterations: CSS → contain:none → new-window (failed) → new-window (working). Each iteration took < 1 day because specs were clear."

---

## 15. Common Senior Developer Questions — Adapted

| Your Trading App Question | Equivalent for Encounter Daily |
|---------------------------|-------------------------------|
| Why Python over .NET? | Why .NET over Node.js/Python? **Answer**: Type safety for 15+ entities with complex relationships; EF Core provides LINQ queries, migrations, and relational integrity at compile time. The devotional domain is highly structured (books, chapters, verses, page ranges) — relational DB + strongly-typed ORM is the natural fit |
| How many AI models used? | **One**: DeepSeek `deepseek-chat` via OpenRouter API. Zero local models |
| What was done to make it faster? | Bible verses (~31K) and EGW pages (~3,214) are cached in SQL Server with indexes. Reading assembly uses exact key lookups (no joins on unindexed columns). Offline sync uses debounced flush (2.5s). Frontend lazy-loads feature modules. Nginx reverse proxy with HSTS, compression, gzip |
| What LLM was used? | DeepSeek (`deepseek-chat`, temperature=0.5, max_tokens=300) |
| What components were used? | 12 feature modules, 8 shared components, 9 core services, 2 guards, 2 interceptors, 5 pipes, 2 base classes |
| RAG ingestion structure? | No RAG — text is pre-seeded in relational tables, not vector-embedded. Retrieval is exact SQL lookups, not similarity search |
| Why 2 storage types (DuckDB + ChromaDB)? | **N/A here** — only one storage: SQL Server. No vector DB needed because data is lookup-based, not similarity-based |
| Vector DB explanation | ChromaDB = vector DB (NoSQL subtype). Stores embeddings, queries by similarity. **We don't use it** — our queries are exact key lookups |
| Chunk extraction by which model? | No chunking model. Natural chunks: Bible verses (verse boundaries) and EGW pages (page boundaries). Stored pre-chunked in DB |
| GPU and AI model details | No GPU. No on-device AI. All AI is external API calls |
| Abstract class vs interface | `BaseEntity` (abstract) provides shared Id/timestamps. `BaseController<T>` (abstract) provides shared CRUD routing. Interfaces (`IRepository<T>`) define contracts. Abstract classes provide *both* contract + shared implementation |
| Queue design pattern | Command Pattern (encapsulate action) + Message Queue (FIFO in localStorage) + Producer-Consumer (UI produces, SyncService consumes) |
| Message Queue / Event-Driven | Offline sync queue: events (online/offline) trigger queue flush. Commands processed via concatMap for ordered execution |
| Gang of Four patterns | Repository, Unit of Work, Factory, Strategy, Facade, Singleton, Observer, Template Method, Abstract Base Class |

---

## 16. Extracted Questions (Original Trading App)

Below are all questions you asked — originally about a **trading/RAG app** but now adapted above for Encounter Daily:

1. Extract all info: frontend, backend, what is this application about, how was it developed, design principles, AI concepts
2. Why Python over .NET
3. Add purpose column to library table in docs
4. Create docs folder
5. Git push with meaningful comments
6. Jeafx transcripts (trading app specific)
7. Add to .gitignore
8. Make git repo private (alternative suggestion)
9. .gitignore for mp4
10. 236 files still visible
11. .gitignore for pdf
12. .gitignore for txt
13. BasePipeline abstract class usage
14. Abstract class — design principle or pattern?
15. Open/Closed Principle for abstract class vs interface
16. Gang of Four patterns
17. Queue system — which design pattern?
18. Abstract class as both contract + shared implementation
19. Message Queue / Event-Driven architecture
20. Behavioral interview answers (teamwork, conflict, frustrating client, solution gathering)
21. Project in a nutshell
22. GPU and AI model usage
23. Whisper medium: 8h CPU → 30min Kaggle GPU
24. What is Kaggle? Which AI model?
25. System design — functional and non-functional requirements
26. Why two storage types (DataStore + VectorStore)?
27. Can ChromaDB be called NoSQL?
28. What is vector DB?
29. Enrichment method — chunk, graph
30. How chunks are extracted and by which models
31. Extract all questions for another project
