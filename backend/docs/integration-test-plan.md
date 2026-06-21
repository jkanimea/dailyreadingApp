# Integration Test Plan

## Coverage Boundaries

| Test layer | What it covers | What it doesn't cover (gap) |
|---|---|---|
| **Backend Unit** (37 files) | Individual services, repos, controllers in isolation with mocks | Real DB interaction, multi-step workflows, actual HTTP contract |
| **Frontend Unit** (27 files) | Angular components/services with mocked API | Real API behavior, response shape validation |
| **E2E** (14 files) | Full-stack browser flows | API-level edge cases, error handling, data integrity, seed correctness |

**Integration tests fill the gap:** hit real API endpoints with a real database, testing workflows across service boundaries — without a browser.

---

## What Integration Tests Should Cover

### 1. API Contract & Error Handling (8 tests)

Verify each endpoint returns correct status codes, response shapes, and error bodies — things unit tests mock and E2Es don't exhaustively check.

| Test | What it validates |
|---|---|
| `GET /api/v1/health` returns 200 with expected body | Basic endpoint contract |
| Unauthenticated requests return 401 | Auth middleware |
| Non-admin access to admin endpoints returns 403 | Role authorization |
| `GET /api/v1/reading/{id}/full` with invalid ID returns 404 | Missing resource handling |
| `POST /api/v1/auth/google` with bad token returns 401 | Auth failure handling |
| `POST /api/v1/progress/{id}/complete` for non-existent reading returns 404 | Progress on missing reading |
| `GET /api/v1/search` with empty query returns 400 | Input validation |
| `GET /api/v1/reading/series/{id}/today` with out-of-range month returns 400 | Date validation |

### 2. Auth & Token Lifecycle (5 tests)

End-to-end auth flow without mocking the token validation.

| Test | What it validates |
|---|---|
| Register → receive JWT → use token → access protected endpoint | Full login flow |
| Expired token returns 401 | Token expiry handling |
| Refresh token → receive new tokens → old refresh token invalidated | Refresh rotation |
| Logout → refresh token revoked → cannot refresh | Logout flow |
| User A's token cannot access User B's data | Data isolation |

### 3. Reading Content Pipeline (4 tests)

The core feature — assembly of Bible + EGW text from real database data.

| Test | What it validates |
|---|---|
| Get today's reading for a series returns correct structure | Reading retrieval |
| Full reading includes Bible verses + EGW text | Text assembly |
| Bible verse lookup resolves abbreviations correctly | Bible reference parsing |
| Multiple Bible translations return different text | Translation switching |

### 4. Progress & Streak Workflow (4 tests)

Multi-step progress tracking across service boundaries.

| Test | What it validates |
|---|---|
| Mark 3 consecutive readings complete → streak = 3 | Streak calculation |
| Mark complete → unmark → verify gone | Toggle state |
| Complete 50% of series → percentage = 50 | Completion % math |
| Save notes → retrieve notes → verify content persisted | Notes CRUD |

### 5. Bookmark Lifecycle (3 tests)

| Test | What it validates |
|---|---|
| Add bookmark → list bookmarks → verify present | Create + read |
| Add bookmark → remove → list → verify absent | Delete |
| Add bookmark on same reading twice → only one exists | Idempotency |

### 6. Search Pipeline (3 tests)

| Test | What it validates |
|---|---|
| Search by Bible reference string returns matching readings | Text search |
| Search returns paginated results | Pagination |
| Search history is created per user | History logging |

### 7. Data Isolation — Cross-User Write Protection (2 tests)

| Test | What it validates |
|---|---|
| User A's token cannot mark complete for User B's reading | Progress isolation |
| User A's token cannot delete User B's bookmark | Bookmark isolation |

### 8. Idempotency (3 tests)

| Test | What it validates |
|---|---|
| Mark complete twice → still marked once | Progress idempotency |
| Add bookmark twice → only one bookmark exists | Bookmark idempotency |
| Save same notes twice → content matches last write | Notes idempotency |

### 9. Pagination Edge Cases (4 tests)

| Test | What it validates |
|---|---|
| Negative page number returns page 1 or 400 | Input sanitization |
| Page size exceeds max → capped at max | Size limiting |
| Last page with partial results returns correct count | Boundary |
| Page beyond available data returns empty results | Out-of-range |

### 10. Bible Reference Abbreviation Resolution (2 tests)

| Test | What it validates |
|---|---|
| All abbreviation variants resolve to canonical book names | Abbreviation coverage |
| Ambiguous prefix (e.g. "1 Jn" vs "Jn") resolves correctly | Disambiguation |

### 11. Background Service Correctness (2 tests)

| Test | What it validates |
|---|---|
| `SeedDataService` seeds all 4 series × 365 readings on fresh DB | Startup seeding |
| `LogCleanupService` deletes old logs but preserves recent ones | Log cleanup |

### 12. Seed Data Correctness (3 tests)

Verify the 1460 daily readings across 4 series.

| Test | What it validates |
|---|---|
| Each series has exactly 365 readings | Completeness |
| No duplicate (series, month, day) combinations | Uniqueness |
| All seed readings have non-empty BibleReference | Data quality |

---

## What NOT to test (already covered)

| Not tested here | Why |
|---|---|
| Frontend rendering, routing, UI state | E2E tests |
| Individual service logic in isolation | Backend unit tests |
| Repository query logic | Backend unit tests |
| Angular component behavior | Frontend unit tests |
| API service HTTP call construction | Frontend unit tests |

---

## Implementation Notes

- Use existing `DatabaseFixture` (creates real SQL Server test database)
- Mark tests with `[Trait("Category", "Integration")]` to match CI filter
- Use `WebApplicationFactory` for in-memory HTTP test server
- Seed minimal test data per test class (not full 1460 readings)
- Run after unit tests, before E2E in CI

**Total: ~30 integration tests** — fast (~2-3 min), no browser, pure API validation.
