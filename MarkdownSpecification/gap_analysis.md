# Specification Gap Analysis — Encounter Daily

Analysis date: 2026-05-10
Documents reviewed: Mobile_app_development_specification.md, Testing_Suite_specification.md, Git_repository_specification.md

---

## 1. MOBILE APP DEVELOPMENT SPECIFICATION — GAPS

### 1.1 Offline Architecture (Underspecified)

| Gap | Detail |
|-----|--------|
| Storage mechanism | Mentions `offline-storage.service.ts` but never specifies the underlying storage engine (SQLite via Capacitor? IndexedDB? LocalStorage?) |
| Sync strategy | No specification of when/how syncing occurs (on app open? on connectivity change? periodic background sync?) |
| Conflict resolution | No mention of how to handle conflicts when offline changes conflict with server state |
| Cache scope | Unclear how much content is cached — full text of all 4 series (~1,460 readings) or only the active series |

### 1.2 Push Notifications (Incomplete)

| Gap | Detail |
|-----|--------|
| Push service | No mention of Firebase Cloud Messaging (Android) or APNs (iOS) integration |
| Capacitor plugin | No specification of which Capacitor push notification plugin to use |
| Permission handling | No detail on handling permission denial or re-prompt timing |
| Notification payload | No structure defined for notification data payloads |

### 1.3 Security (Missing)

| Gap | Detail |
|-----|--------|
| API auth mechanism | Mentions OAuth for login but not how API requests are authenticated (JWT? session cookies?). No token refresh strategy. |
| Token storage | No specification of where tokens are stored on-device (SecureStore? Keychain?) |
| API security | No mention of HTTPS enforcement, SSL pinning, or rate limiting |
| Data at rest | No mention of encrypting locally cached content |
| Input validation | No server-side input sanitization specification |

### 1.4 Data Population (Under-constrained)

| Gap | Detail |
|-----|--------|
| Source text format | Says "extract corresponding pages from digital text" but doesn't specify the source format (plain text? EPUB? PDF? HTML from EGW Estate?) |
| Page boundary detection | No method defined for aligning page ranges (e.g., "DA 831-835") to actual source text |
| Summary generation | "AI-assisted" is vague — no quality criteria, length constraints, or process for who generates/who reviews |
| CSV schema | The 365 CSV reading plans per series are mentioned but no column schema is defined |

### 1.5 Error & Edge Case Handling (Absent)

| Gap | Detail |
|-----|--------|
| Network errors | No specification of error states, retry logic, or user-facing error messaging |
| Empty states | What does each screen look like with no data (e.g., no bookmarks, no search results)? |
| Date edge cases | Feb 29 on leap years? Reading for Dec 31 / Jan 1 transitions? |
| Missing readings | What happens if a specific date has no reading assigned? |
| Auth failures | Token expiry, OAuth provider downtime, revoked permissions |

### 1.6 Performance (Not Specified)

- No page load time targets
- No database query performance expectations
- No guidance on pagination for search results or large reading lists
- No image/font loading optimization requirements

### 1.7 Accessibility (Not Addressed)

- No screen reader (VoiceOver/TalkBack) support requirements
- No color contrast minimums
- No dynamic font sizing beyond a basic "font size control"
- No touch target size minimums

### 1.8 Analytics & Monitoring (Not Mentioned)

- No crash reporting (Sentry? App Center? Firebase Crashlytics?)
- No usage analytics
- No API monitoring or alerting
- No app performance monitoring

### 1.9 Deployment & Distribution (Not Addressed)

- No iOS App Store submission requirements or checklist
- No Google Play Store requirements
- No beta testing / TestFlight strategy
- No code signing or provisioning profile management

### 1.10 Search Implementation (Underspecified)

- Search algorithm not defined (SQL LIKE? Full-text index? Azure Cognitive Search? Elasticsearch?)
- No pagination or result limits for search queries
- No relevance ranking specification
- No mention of search indexing strategy

### 1.11 API Versioning

- All endpoints are at `/api/` with no version prefix (e.g., `/api/v1/`)
- No deprecation strategy for when endpoints evolve

### 1.12 Localization / i18n

- App appears English-only with no mention of whether future translation support is needed

---

## 2. TESTING SUITE SPECIFICATION — GAPS

### 2.1 Test Environment (Not Specified)

| Gap | Detail |
|-----|--------|
| Device/OS matrix | No list of target devices, OS versions, or screen sizes for mobile testing |
| Browser targets | If web preview is used, no browser matrix specified |

### 2.2 Performance & Load Testing (Under-constrained)

| Gap | Detail |
|-----|--------|
| Load test scenarios | No specific load test scenarios (concurrent users, request rates) |
| Performance baselines | Says "no degradation > 10% from baseline" but doesn't define the baseline values |
| API response time SLAs | No specific time expectations for endpoints |

### 2.3 Security Testing (Missing)

- No penetration testing requirements
- No OAuth security testing
- No API injection or authentication bypass testing
- No local data storage security testing

### 2.4 Accessibility Testing (Not Mentioned)

- No accessibility test requirements (AXE for web, XCUITest for iOS, Espresso for Android accessibility checks)

### 2.5 Testing Framework Ambiguity

| Issue | Detail |
|-------|--------|
| Jasmine vs. Jest | Section 3.1 lists Jasmine + Karma AND Jest + Angular Test Bed — these are competing frameworks. Which one is canonical? |
| Dual coverage targets | Backend says 80% overall, frontend says 75% overall but also says Services 85% — these should be reconciled across documents |

---

## 3. GIT REPOSITORY SPECIFICATION — GAPS

### 3.1 Outdated CI/CD Versions

| Item | Specified | Current (May 2026) |
|------|-----------|-------------------|
| `actions/checkout` | `@v3` | `@v4` |
| `actions/setup-dotnet` | `@v3` | `@v4` |
| `actions/setup-node` | `@v3` | `@v4` |
| .NET version | `7.0.x` (EOL May 2024) | .NET 8 or 9 |
| Node.js version | `18.x` (EOL Oct 2025) | 20.x or 22.x LTS |

### 3.2 Missing Deploy Pipeline

- `.github/workflows/deploy.yml` is listed in the project structure but never defined
- No deployment targets specified (Azure App Service? AWS? self-hosted?)
- No staging/production environment strategy

### 3.3 Docker Configuration (Underspecified)

- `docker-compose.yml` is listed but no container definitions, networks, or volumes are specified
- No Dockerfile for the .NET API
- No database container specification

### 3.4 Missing Governance

| Item | Detail |
|------|--------|
| CODEOWNERS | No file for auto-assigning reviewers by code area |
| Semantic versioning | No versioning strategy for releases |
| Release branch naming | `release/*` listed in branch strategy but omitted from naming convention table |
| Changelog | No requirement for CHANGELOG.md |

### 3.5 Cross-Reference Issues

- README.md references `docs/setup-guide.md` and `docs/testing-guide.md` but these files are not specified or created
- The "Testing" section references the testing spec but no explicit cross-link

---

## 4. CROSS-DOCUMENT INCONSISTENCIES

| Issue | Doc A Says | Doc B Says | Impact |
|-------|-----------|-----------|--------|
| .NET version | Not specified (mobile spec) | `7.0.x` (Git spec CI) | Mismatch — .NET 7 is EOL |
| Frontend test framework | Jasmine + Karma (testing spec §3.1) | Jest (testing spec §3.1) | Contradictory within same document |
| Node.js version | Not specified | `18.x` (Git spec) | 18.x is EOL |
| Deploy pipeline | Not mentioned | `deploy.yml` in structure (Git spec) | Defined in structure, no content |
| Setup/testing guides | Not mentioned | Referenced in README.md (Git spec) | Referenced but don't exist |

---

## 5. RECOMMENDATIONS (HIGH PRIORITY)

1. **Resolve .NET version** — Update to .NET 8 LTS or .NET 9; align across all docs
2. **Resolve test framework** — Pick Jasmine or Jest as the canonical Angular test framework
3. **Define offline architecture** — Specify storage engine, sync strategy, and conflict resolution
4. **Specify push notification stack** — Add Firebase Cloud Messaging / APNs setup to the spec
5. **Add API auth flow** — Define JWT token lifecycle, refresh strategy, and secure storage
6. **Define source text format** — Clarify how the 5 Ellen White books will be obtained and parsed
7. **Update GitHub Actions versions** — `@v3` → `@v4`, .NET 7 → .NET 8/9, Node 18 → Node 20/22
8. **Define deploy pipeline** — Write the `deploy.yml` workflow with target environment
9. **Add CODEOWNERS** — Establish code ownership for automatic reviewer assignment
10. **Define accessibility requirements** — Include minimum contrast, touch targets, screen reader support
