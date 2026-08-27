# Project Guidelines

## Testing Requirements
- Every fix or new feature MUST include tests that verify the code works.
- Run `npm test` (all suites) before pushing to ensure nothing is broken.
- After pushing, check GitHub Actions CI build logs. If they fail, fix the issues immediately.

## CI Maintenance
- After each successful CI run, review the full log for deprecation warnings (Node.js, actions, etc.) and fix them immediately by updating to the latest major version of the affected action.

## Last CI trigger
- 2026-07-24 11:59 - Test SSH_KEY fix via REST API
- 2026-07-24 12:12 - Add CI public key to VPS2 authorized_keys

## Code Smells to Avoid
When implementing new features, keep the code free of the following smells (see https://refactoring.guru/refactoring/smells). We refactored these out of the codebase in 2026-08 and must not reintroduce them.

**BLOATERS**
- **Large Class / Long Method**: one class must have one responsibility. Do NOT add more parsing/text-assembly logic to `ReadingService` — bible-reference parsing lives in `BibleReferenceParser` + `BibleBookAbbreviations`, and text/verse assembly in `BibleTextAssembler`. Keep `ReadingService` a thin orchestrator.
- **Primitive Obsession / Data Clumps**: use typed DTOs (`Core/DTOs/*`), not raw entities or `object`/anonymous types on the API boundary.

**OO ABUSERS**
- **Refused Bequest**: a subclass must not inherit endpoints/behavior it rejects. Controllers that are not full CRUD expose only their own GET actions off `BaseApiController`, NOT generic `BaseController<T>` (that base was deleted). Never re-add write endpoints to read-only resources.
- **Switch Statements**: dispatch on type codes via lookup maps, not `switch` on strings. See the level map in `LogsController`, action map in `sync.service.ts`, and color map in `log-viewer.component.ts`. Add a map entry instead of a new `case`.

**DISPENSABLES**
- **Duplicate Code**: single source of truth. The `bibleRefRe` regex is shared via `core/bible-refs.ts` (`createBibleRefRegex()`). Bible-book lookups reuse `BibleTextAssembler.GetBookByNameAsync` — don't re-inline book/verse queries.
- **Lazy Class**: don't create trivial factory/passthrough classes. `SeriesFactory`/`ISeriesFactory` were folded into `SeriesService`.
- **Dead Code / Speculative Generality**: remove unused fields/endpoints rather than leaving them "for later" (e.g. `destroy$`, `debug/bible-status`, `BaseController` were removed).

**ERROR HANDLING**
- Never leave empty `catch { }` blocks — log a warning with context (`ILogger`) instead. Silent catches swallowed DB failures before this cleanup.

Guideline: for every new feature, prefer composition/single-responsibility, avoid copy-paste, avoid `switch` on type codes, avoid inheriting behavior you don't need, and always accompany the change with tests.
