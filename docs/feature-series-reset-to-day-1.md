# Feature: Series reading mode — Start from Day 1 vs. Calendar, with reset & progress

> **Scope:** This document is a **plan only**. No code is implemented here. It is meant to be
> handed to an implementing agent (e.g. Copilot). All file paths and function names below are
> real and were verified against the current codebase (Sep 2026).

---

## 1. Goal (plain English)

When a user picks one of the 4 reading series, they get to choose how the readings are
delivered to them:

- **Start from Day 1** — reading always begins at Day 1 of the series and advances one day per
  calendar day (Day 2 the next day, etc.), regardless of today's calendar date.
- **Use existing Calendar day** — keep the current behavior: the reading is assigned from the
  calendar date (today's month/day maps directly to a reading).

They also get:

- A **Reset** button per series that returns the series to the beginning (with a confirmation
  dialog, because reset clears their reading progress — journal notes are kept unless the user
  opts to delete them).
- A **progress indicator** per series showing how far they've read (e.g. "12 / 365" and a
  percentage bar out of 100%).

**Critical rule:** once a user chooses "Day 1" or "Calendar" for a series, that choice is
**locked** for that series until it is reset, because it changes how readings are assigned.
(Finishing a series shows "Completed" but does **not** unlock the mode — see §11.6.) This also
means **existing users' reading progress must not be erased** by this feature.

---

## 2. Requirements (from product owner)

1. On login, the 4 series books are shown (already true today).
2. Each series card must show:
   - a **Reset** button,
   - a way to choose **"Start from Day 1"** or **"Use existing Calendar day"**,
   - a **progress indicator** ("N / total" completion and a % out of 100).
3. Choosing a series to read is still required (tap the card to enter it).
4. The **Reset** button must show a **confirmation dialog** warning the user that resetting
   clears their reading progress (journal notes are kept by default, with an optional "delete
   notes too" checkbox).
5. The "Day 1 vs Calendar" choice is **per series** and **locked** after first choice until the
   series is reset. (Finishing a series does not unlock the mode — §11.6.)
6. Existing users who already have reading progress must keep it (default them to the current
   "Calendar" behavior; do not silently reset).
7. UI must be professional and mobile-friendly (it is an Ionic/Capacitor mobile app).

---

## 3. Current state (verified files)

### Series list page
`frontend/src/app/features/series/series.module.ts`

- Renders one `<div class="series-card" (click)="onSelect(s)">` per series.
- `onSelect(s)` currently just does `await this.prefs.setSeriesId(s.id)` then
  `this.router.navigate(['/today'])`.
- No reset button, no mode choice, no progress indicator.

### Reading assignment (the "today" reading)
- `frontend/src/app/features/base/base-reading-page-component.ts` — `loadReading(seriesId)`
  calls `readingService.getToday(seriesId, now.getMonth()+1, now.getDate())`.
- `frontend/src/app/features/today/today.module.ts` — the **primary reading page** has its own
  `loadToday()` that calls `readingService.getToday(this.seriesId, month, day)` directly (it does
  **not** extend `BaseReadingPageComponent`), so it must be updated separately.
- `frontend/src/app/core/services/reading.service.ts` — `getToday(seriesId, month?, day?)`
  → `GET /reading/series/{id}/today?month=&day=`.
- Backend `backend/EncounterDaily.API/Controllers/ReadingController.cs` `GetToday` →
  `EncounterDaily.Services/ReadingService.cs` `GetTodayReadingAsync` → looks up the
  `DailyReading` row whose `Month`/`Day` equals the calendar date.

So today, the reading is **always keyed to the calendar date**, never to "days since the user
started the series".

### Series / reading data
- `backend/EncounterDaily.Core/Entities/DailyReading.cs` — fields `Month`, `Day`, `SortOrder`.
  Importer sets `SortOrder = month * 100 + day`, so ordering by `SortOrder` enumerates the
  reading plan day 1..N.
- `frontend/src/app/core/models/series.model.ts` — `SeriesConfig.totalReadings` (total count).
  Fetched via `SeriesService.getConfig(id)`.
- Exactly 4 series exist (seed data): "Christ The Way", "Christ The Church",
  "Christ Our Redemption", "Christ Our Hope".

### Progress (already exists)
- `frontend/src/app/core/services/progress.service.ts` — `getCompletionPercentage(seriesId)`,
  `getCompletedCount(seriesId)`, `getSeriesProgress(seriesId)`, `markComplete`, etc.
- `frontend/src/app/shared/components/progress-bar/progress-bar.component.ts` — reusable
  `<app-progress-bar [percentage]="x">` bar + "x% complete" label.

### User start-day tracking (exists but unused)
- `backend/EncounterDaily.Core/Entities/UserSeriesPreference.cs` — `UserId`, `SeriesId`,
  `StartDate`, `CurrentDay`, `IsActive`. Not currently read by the reading pipeline.

### Preferences (offline/guest-capable)
- `frontend/src/app/core/services/preferences.service.ts` — uses `OfflineStorageService`, with
  keys like `prefs_series_id`. This is the natural home for per-series mode + start-date on the
  client (works for guests and offline).

---

## 4. Definitions

- **Day N** of a series = the N-th reading ordered by `DailyReading.SortOrder` ascending
  (1-indexed). Day 1 = smallest `SortOrder`. Cap N at `SeriesConfig.totalReadings`.
- **Calendar mode** = today's reading is the row where `Month`/`Day` == today's calendar date
  (the existing behavior).
- **Day-1 mode** = today's reading is Day N where `N = (today − startDate).days + 1`.
- **Finished** = all `totalReadings` readings completed (100%).
- **Reading mode** = a per-series choice: `'day1'` or `'calendar'`.

---

## 5. Data model / state (client-authoritative)

Store per series (in `PreferencesService` / `OfflineStorageService`, so it works for guests and
offline):

| Key | Type | Meaning |
|---|---|---|
| `prefs_series_mode_{id}` | `'day1' \| 'calendar'` | the chosen delivery mode (null = not chosen yet) |
| `prefs_series_start_{id}` | ISO date string | the start date (used in day-1 mode) |

- The mode key being **absent** = "not yet chosen" → the UI shows the Day-1/Calendar choice.
- Once set, it is **locked** until reset (§9).
- **Migration for existing users:** on first run of this feature, if a series has existing
  completed progress (see `ProgressService.getCompletedCount(seriesId) > 0`), default its mode
  to `'calendar'` (preserve current reading) and mark it chosen. If no progress exists, leave
  it "not chosen" so the user can pick.

> **Out of scope for v1:** syncing mode/start-day to the backend `UserSeriesPreference` for
> signed-in users (cross-device continuity). Do not implement in v1 — see §11.9.

---

## 6. UI/UX design (mobile-first, professional)

This is an Ionic/Capacitor **mobile** app; the design is written for a ~360–414px-wide phone
screen and must stay readable on web without pixel-identical layout. Key principle: **compact,
tap-friendly, and never rely on long text labels.**

### 6.1 Series card layout (vertical stack, no horizontal squeeze)

```
┌─────────────────────────────────────────────┐
│ 📖  Christ The Way                          │
│     Based on Desire of Ages                 │
│                                             │
│     12 of 365                   3%          │
│     ▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       │
│                                             │
│     [ ▶ Start from Day 1 ]                  │
│     [ 🗓 Calendar ]                         │
└─────────────────────────────────────────────┘
```

- Use a **full-width button stack** (not side-by-side buttons) so labels never wrap or get
  cut off. On wider screens the same card can center with a `max-width` (e.g. 480px) — buttons
  stay full-width inside the card, so web just looks like a slightly wider version of mobile.
- Keep buttons **short**: "Start from Day 1" (primary, filled) and "Calendar" (secondary,
  outline) instead of "Use existing Calendar day". Full explanation lives in the confirmation
  dialog, not on the button.

### 6.2 Card states

| State | What's shown |
|---|---|
| **Not started** (no mode chosen) | Series name + book, "Not started" hint, then the two choice buttons: `▶ Start from Day 1` (primary) and `Calendar` (outline). |
| **Active / locked** | Series name + book, completion row (`12 of 365 · 3%` + bar), a small mode badge (`Day 1` or `Calendar`), and a single outline **Reset** button. |
| **Finished** (100%) | Completion row shows `{total} of {total} · 100%` + full bar; a "Completed" badge instead of the Reset button (mode stays locked — §11.6). |

### 6.3 Buttons (exact, mobile-safe labels)

- **Start from Day 1** → primary button, label `Start from Day 1`. (If space is tight on very
  narrow screens, this is still ≤ 2 short words and fits at 16px on 360px width.)
- **Calendar** → secondary outline button, label `Calendar`. Sub-text is *not* required on the
  button; the confirmation dialog explains it means "keep today's calendar reading".
- **Reset** → outline/danger button, label `Reset`. Never show Reset and the choice buttons at
  the same time (mutually exclusive states).

### 6.4 Progress indicator

Two distinct metrics, shown in different places so they don't get mixed up (§11.5):

- **Series card** shows **completion**: a `<app-progress-bar [percentage]="pct" [showLabel]="false">`
  plus a caption `{completed}/{total} · {pct}%`, where `pct = round(completed / total × 100)`.
  This is the "how far they've read" number and works identically for both modes.
- **Reading screen** ("Today" header) shows **position**: `Day {N} of {total}`, where
  `N` for day-1 mode = `(today − startDate).days + 1`, and for calendar mode = the calendar day
  ordinal of the current reading (or omit and show only the calendar date).

> Hardcode nothing to "365": always use `SeriesConfig.totalReadings` (§11.8).

### 6.5 Simplification decision (accepted)

Keep the card uncluttered: the card shows **one** metric — completion (`{completed}/{total} ·
{pct}%` + bar). The "Day N of {total}" position belongs on the reading screen, not the card.
This is the single source of truth for progress display; all wireframes follow it.

### 6.6 Reset confirmation dialog (Ionic `AlertController`)

> **Reset "Christ The Way"?**
> This clears your reading progress and returns you to Day 1.
> Your journal notes are kept by default.
> ☐ Also delete my journal notes for this series
>
> [Cancel]  [Reset]

- **Default (checkbox unchecked):** clear completion/streak progress, **keep** journal notes.
- **Checkbox checked:** also delete journal notes.

On confirm → clear that series' progress (+ optionally notes) + mode + start date → card returns to
"Not started".

### 6.7 Mode confirmation dialog

> **Start from Day 1?**
> You'll begin at Day 1 and advance one reading per day. To switch to calendar mode later,
> you'll need to reset this series (which clears your reading progress).
>
> [Cancel]  [Start from Day 1]

(Calendar equivalent: "Keep today's calendar reading? To switch to Day 1 mode later, you'll
need to reset this series (which clears your reading progress).")

### 6.8 Web vs mobile note

- Mobile: single-column cards, full-width stacked buttons, ≥ 44px tap targets, no hover.
- Web: same card markup, centered with `max-width: 480px` and some outer padding. Do **not**
  build separate web-only layouts; just let Ionic's responsive breakpoints widen the card.
- Always test at 360px width; if a button label is too long, shorten the label (not the font)
  and move the full explanation into the confirmation dialog.

### 6.9 Series list screen wireframe (4 cards stacked)

```
┌─ Header: "Select a Series" ──────────────────────┐
│                                                  │
│ ┌────────────────────────────────────────────┐   │
│ │ 📖 Christ The Way                          │   │
│ │    Based on Desire of Ages                 │   │
│ │    12 of 365                   3%          │   │
│ │    ▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      │   │
│ │    ┌──────────────────────────────┐        │   │
│ │    │  ▶  Start from Day 1         │        │   │
│ │    └──────────────────────────────┘        │   │
│ │    ┌──────────────────────────────┐        │   │
│ │    │  🗓  Calendar                │        │   │
│ │    └──────────────────────────────┘        │   │
│ └────────────────────────────────────────────┘   │
│                                                  │
│ ┌────────────────────────────────────────────┐   │
│ │ 📖 Christ The Church    [Badge: Day 1]     │   │
│ │    Based on Acts of the Apostles           │   │
│ │    47 of 365                  13%          │   │
│ │    ▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░      │   │
│ │    ┌──────────────────────────────┐        │   │
│ │    │  Reset (outline, danger)     │        │   │
│ │    └──────────────────────────────┘        │   │
│ └────────────────────────────────────────────┘   │
│                                                  │
│  ... (Christ Our Redemption, Christ Our Hope)    │
└──────────────────────────────────────────────────┘
```

### 6.10 Visual style (matches existing app)

- Reuse existing Ionic theme tokens: `--ion-color-primary` for the filled "Start from Day 1"
  button and the progress fill; `--ion-color-danger`/outline for Reset; `--ion-color-medium`
  for "Not started" hint text.
- Cards: same `.series-card` style already used in `series.module.ts` (14px radius, subtle
  border + shadow). Keep the existing card look — only add the progress row + button stack.
- Buttons: `--border-radius: 12px`, min height 44px, full width, 8px gap between stacked buttons.
- Progress bar: reuse `<app-progress-bar>` (already 8px tall, rounded, primary fill).
- Badge: small pill using `--ion-color-step-150` background + `--ion-text-color` text, 12px font.

---

## 7. Backend changes

1. `backend/EncounterDaily.Core/Interfaces/Repositories/IReadingRepository.cs` — add:
   `Task<DailyReading?> GetByDayNumberAsync(int seriesId, int dayNumber);`
2. `backend/EncounterDaily.Infrastructure/Repositories/ReadingRepository.cs` — implement:
   `Where(SeriesId == seriesId).OrderBy(r => r.SortOrder).Skip(dayNumber - 1).Take(1).Include(r => r.Series)`,
   returning `null` when out of range.
3. `backend/EncounterDaily.Core/Interfaces/Services/IReadingService.cs` +
   `backend/EncounterDaily.Services/ReadingService.cs` — add a thin
   `GetByDayNumberAsync(seriesId, dayNumber)` pass-through (keep `ReadingService` a thin
   orchestrator, per AGENTS.md).
4. `backend/EncounterDaily.API/Controllers/ReadingController.cs` — add
   `GET /reading/series/{seriesId}/day/{dayNumber}` returning `DailyReadingDto` (reuse
   `MapToDto`), `NotFound` when null, `BadRequest` when `dayNumber < 1`.

> Progress percentage/completed-count already exist on the backend; no change needed there.

---

## 8. Frontend changes

1. **`PreferencesService`** (`frontend/src/app/core/services/preferences.service.ts`):
   - add `setSeriesMode(id, mode)` / `getSeriesMode(id)`,
   - add `setSeriesStartDate(id, date)` / `getSeriesStartDate(id)`,
   - add `clearSeriesState(id)` (remove mode + start date).
   - persist via existing `OfflineStorageService` keys (Section 5).

2. **`ReadingService`** (`frontend/src/app/core/services/reading.service.ts`):
   - add `getByDay(seriesId, dayNumber)` → `GET /reading/series/{id}/day/{dayNumber}`.

3. **Series list page** (`frontend/src/app/features/series/series.module.ts`):
   - fetch each series' `totalReadings` + progress (`getCompletionPercentage`, `getCompletedCount`),
   - render the enhanced card (Section 6),
   - wire "Start from Day 1" / "Use calendar day" buttons to set the mode + start date, then
     navigate into the reading,
   - wire Reset button → confirmation dialog → clear progress + mode/start date.

4. **Reading assignment** — apply the mode branch in all three load paths:
   - `frontend/src/app/features/base/base-reading-page-component.ts` `loadReading`,
   - `frontend/src/app/features/today/today.module.ts` `loadToday` (primary page; does not extend
     the base component),
   - `frontend/src/app/features/reading-detail/reading-detail.module.ts` `onSeriesSelected`.
   Read the series mode: if `'day1'`, compute `N = (today − startDate).days + 1`, fetch via
   `getByDay`; if `'calendar'` (or unset, i.e. legacy), keep `getToday(seriesId, month, day)`.
   Factor this into one shared helper (e.g. in `ReadingService` or a small util) so the three call
   sites don't diverge — avoid duplicate code (AGENTS.md).

5. **Progress indicator** — reuse `<app-progress-bar>`. On the series card show **completion**
   (`{completed}/{total} · {pct}%`, from `getCompletionPercentage`/`getCompletedCount`); on the
   reading screen show **position** (`Day {N} of {total}`, from the mode + `totalReadings`). See §6.4.

---

## 9. Locking rules (important)

- A series' mode is **chosen exactly once**. After that:
  - the buttons "Start from Day 1" / "Use calendar day" are hidden (replaced by a mode badge),
  - only **Reset** can clear the mode.
- Reset clears mode + start-date + progress → card returns to "not chosen".
- **Finishing does not unlock the mode** — a finished series shows "Completed" and stays locked;
  only Reset returns it to "not chosen" (see §11.6).

---

## 10. Acceptance criteria

- [ ] Selecting a series with no prior progress shows the Day-1/Calendar choice; picking
      **Day 1** loads its Day 1 reading regardless of today's date.
- [ ] Picking **Calendar** keeps the existing calendar-date reading behavior.
- [ ] Re-opening a series that already has a chosen mode does **not** re-prompt (it's locked).
- [ ] The Reset button shows a confirmation dialog (with an optional "also delete journal notes"
      checkbox). On confirm it clears that series' progress, mode, and start date; journal notes
      are kept unless the checkbox was selected.
- [ ] Each series card shows a completion progress bar + `{completed}/{total} · {pct}%` that
      updates as readings are completed (finish Day 1 → shows `1/{total}` and the matching %).
- [ ] Existing users with prior progress default to **Calendar** mode and are **not** reset.
- [ ] Works for guest and signed-in users.
- [ ] Calendar date browsing (the existing calendar view) is unchanged.

---

## 11. Resolved decisions & edge cases (all closed — no open questions)

Every gap below has a firm decision so the implementation is unambiguous.

### 11.1 "Reset" has no backend endpoint to clear a series' progress
`backend/.../Controllers/ProgressController.cs` has per-reading `MarkComplete`/`UnmarkComplete`
only — there is **no** "delete all progress for a series". Reset cannot work without one.
- **Decision:** add `POST /progress/series/{seriesId}/reset` (and corresponding
  `IProgressService.ResetSeriesAsync(userId, seriesId, deleteNotes)` + repo method).
  Because notes live on the same `UserProgress` rows as completion, the endpoint must:
  - `deleteNotes = false` (default) → **clear `IsCompleted` and `CompletedAt`** (and reset any
    day/streak state) but **keep** the `Notes` column,
  - `deleteNotes = true` → **delete** the `UserProgress` rows (completion + notes).
- The endpoint is **idempotent**: calling it on a series with no progress is a no-op (200).
- **Bookmarks are NOT touched** (bookmarks are chapter references, not reading position).
- **Decision (agreed):** Reset clears progress by default and keeps journal notes; the dialog
  offers an optional "also delete my journal notes" checkbox (see 6.6).

### 11.2 Guests have no authenticated progress
`ProgressController` derives `userId` from the JWT; guests (no token) get 401 on all progress
endpoints, and their progress is only in the offline `SyncService` queue.
- **Decision (firm):** for guests, the series cards show a subtle "Sign in to track progress" hint
  **instead of** a %/bar, and "Reset" clears the offline sync queue + local state only (no backend
  call). No local-only % estimate — it would drift from the backend and confuse users.

### 11.3 Day-1 mode breaks the previous/next navigation
`today.module.ts` and `reading-detail.module.ts` both compute `previousReadingId`/`nextReadingId`
via `shiftReadingDate(detail.month, detail.day, ±1)` (calendar arithmetic). In day-1 mode the
reading is fetched by day number, so prev/next must be **Day N-1 / Day N+1**, not calendar ±1 day.
- **Decision:** branch on mode — for `'day1'` use `getByDay(seriesId, n∓1)`; for `'calendar'`
  keep `shiftReadingDate`. Also fix the "isStart/isEnd" edge (Day 1 has no previous; last day has
  no next) using `totalReadings`.
- This is the biggest hidden change; do not ship day-1 mode without it.

### 11.4 Migration placement & idempotency
- **Decision:** run the "existing users default to calendar" migration **once**, guarded by a
  persisted flag (e.g. `prefs_series_migrated_v1`). For each series: if it already has a stored
  mode, skip; else if the user has existing completion (signed-in: `getCompletedCount(seriesId) > 0`;
  guest: any queued completion), set mode = `'calendar'`; else leave "not chosen". Never overwrite
  a user's explicit choice.

### 11.5 Two different "progress" numbers
"Day N of 365" (position) and "completed/total" (completion) are different metrics; the card and
reading screen must not show a confusing mix.
- **Resolution (recommended):** card shows **completion** (`{completed}/{total} · {pct}%`, from
  `getCompletionPercentage`); the reading screen ("Today" header) shows **position**
  (`Day {N} of {total}`). The user's example "finish day 1 → 1/365" is completion, so the card's
  number is completed count, not current day.

### 11.6 "Finished" semantics & unlocking
"Finished" needs a precise definition and post-finish behavior.
- **Decision:** finished = `completedCount === totalReadings`. Show a "Completed" badge; the
  mode stays **locked** (only Reset releases it). Finished series **never** auto-re-prompts the
  Day-1/Calendar choice — the only way to re-choose is Reset.

### 11.7 Missed days in day-1 mode
`N = (today − startDate).days + 1` jumps forward by every skipped calendar day.
- **Decision:** this is intended — "one reading per calendar day" means the position advances by
  elapsed calendar days even if the user didn't open the app.
- Cap N at `totalReadings`; once the last reading is reached, stay on it ("Completed"). Users can
  use prev/next (see 11.3) to read back through missed days.
- **Streak note:** the existing streak is completion-date based (`GetStreakAsync`), not
  reading-index based, so it is **mode-independent** and needs no change for this feature.

### 11.8 `totalReadings` accuracy vs hardcoded "365"
"Day N" is the Nth reading by `SortOrder` (`Skip(N-1)` is correct even if `SortOrder` has gaps),
but the UI must not assume 365.
- **Decision:** always use `SeriesConfig.totalReadings` (from `GET /series/{id}/config`); add a
  backend assertion/test that `totalReadings` equals the actual `DailyReading` count per series.
- If the config fetch fails on the card, **degrade gracefully**: still show the completion
  `{completed} · {pct}%` but omit the `/total` denominator rather than erroring the whole card.

### 11.9 Cross-device / re-login loses mode (device-local state)
Mode + start-date live in `PreferencesService` (per device). A signed-in user on a new device
falls back to migration → calendar.
- **Decision:** this is **accepted for v1** and documented as a known limitation. Backend
  `UserSeriesPreference` sync is explicitly **out of scope** for v1 (noted in §5).

### 11.10 Entering a series without explicitly choosing a mode
Tapping the card body (existing `onSelect`) can navigate into a series whose mode is "not chosen".
- **Decision:** entering with no chosen mode behaves as **calendar** (legacy). The explicit
  choice is only made via the "Start from Day 1" / "Calendar" buttons. Keep `onSelect` unchanged.

### 11.11 Reset while offline
Reset must work offline and not corrupt the sync queue.
- **Decision:** Reset clears local state (mode/start-date) immediately and empties that series'
  entries from the offline `SyncService` queue; the backend `POST /progress/series/{id}/reset`
  (with the `deleteNotes` flag) runs on next online sync.

### 11.12 Date math must use local calendar days (not UTC)
Day-number math `N = (today − startDate).days + 1` must use **local calendar dates** (truncate each
to local midnight), not UTC timestamps — otherwise a user near a day boundary gets an off-by-one
day. Compute with a small shared helper (e.g. `daysSinceLocal(startDate, today)`) used by all three
load paths and the navigation branch.

### 11.13 Calendar page is a date browser and stays calendar-based
`frontend/src/app/features/calendar/calendar.module.ts` (and any month/date browsing) continues to
map calendar dates to readings **regardless of the chosen mode** — it only changes the selected
series (`setSeriesId`), never the mode. Day-1 mode affects only the "Today"/reading-assignment
paths (§8.4), not the calendar view.

### 11.14 `getByDay` endpoint auth parity
The new `GET /reading/series/{id}/day/{n}` must have the **same auth as `getToday`** (anonymous —
reading content is public), so guests can also fetch a day reading. Do not add `[Authorize]` to it.

---

## 12. Tests required (per AGENTS.md — every change ships with tests)

### 12.1 Frontend unit tests (Jest)
- `PreferencesService` — `setSeriesMode`/`getSeriesMode`/`setSeriesStartDate`/`getSeriesStartDate`/
  `clearSeriesState` persist & round-trip through `OfflineStorageService`; absent key → "not chosen".
- `ReadingService.getByDay` — builds `GET /reading/series/{id}/day/{n}`.
- `BaseReadingPageComponent.loadReading` **and `TodayPage.loadToday`** — day-1 branch computes
  `N = (today − startDate)+1` and calls `getByDay`; calendar/unset branch calls `getToday` (fix
  `Date` with `jest.useFakeTimers`).
- Day-number math — caps at `totalReadings`; start-date today → Day 1.
- `series.module.ts` — renders "not chosen" (two buttons) vs "locked" (badge + Reset) vs
  "completed"; Reset confirmation flow clears mode/start-date + triggers progress clear; migration
  sets calendar only when completion exists and never overwrites an existing mode.
- Navigation branch — day-1 prev/next uses `getByDay(n∓1)` and stops at Day 1 / last day.

### 12.2 Backend unit & integration tests (xUnit)
- `ReadingRepository.GetByDayNumberAsync` — returns the Nth reading by `SortOrder`; returns `null`
  when `dayNumber` exceeds the count.
- `ReadingController GET /reading/series/{id}/day/{n}` — 200 valid day; 404 out-of-range; 400 for
  `dayNumber < 1`.
- New `POST /progress/series/{id}/reset` — with `deleteNotes=false` clears `IsCompleted` for that
  series' rows but keeps `Notes`; with `deleteNotes=true` deletes the rows; bookmarks untouched.
- `SeriesConfig.totalReadings` equals actual reading count (data-integrity test).

### 12.3 End-to-end tests (Playwright)
Existing harness: `frontend/playwright.config.ts` + `frontend/e2e/`; run `npm run e2e`.
- Sign in → see 4 series cards → card shows "Start from Day 1" + "Calendar".
- Choose "Start from Day 1" → confirmation dialog → confirm → lands on Day 1 reading; card now
  shows "Day 1" badge + Reset.
- Complete Day 1 → card progress shows `1/{total}` and the matching %.
- Reopen series list → no re-prompt (mode locked), Reset button present.
- Reset → confirmation dialog → confirm → card returns to "not chosen" with progress cleared.
- Choose "Calendar" → lands on today's calendar reading (unchanged behavior).
- Existing-progress migration: a user with prior completion sees "Calendar" badge (no prompt).
- Navigation: in day-1 mode, prev/next move by day number (Day 1 has no previous).

Run `npm test` (frontend) and `dotnet test backend/` before pushing.
