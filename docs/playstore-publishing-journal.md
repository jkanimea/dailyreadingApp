# Play Store Publishing — Journal & Lessons Learned

**Date:** 2026-09-01
**Package:** `com.dailyreading.app` · **App:** Encounter Daily
**Repo:** `jkanimea/dailyreadingApp`

This document captures where the Play Store launch currently stands and the
mistakes made along the way, so the same problems are not repeated.

---

## 1. Where I am right now

The app is **not** in production, and it has **not even started the closed
testing requirement**. The full status:

| Item | Status |
|---|---|
| Developer account (personal, post-Nov-2023) | ✅ registered |
| Store listing (name, descriptions, category, rating, data-safety, assets) | ✅ done |
| Privacy policy + data-deletion URLs | ✅ live (200) at `mg-encounter.com/privacy` + `/delete-account` |
| Signed AAB/APK build + CI | ✅ working |
| Upload to **alpha (closed testing)** track | ⚠️ uploaded, but always as **`draft`** |
| Alpha release published to testers (`completed`) | ❌ **never happened** |
| 12 testers opted in × 14 consecutive days | ❌ **0 testers** (nothing installable, see below) |
| Apply for production access | ❌ blocked until the above is met |
| Production-track release | ❌ no path existed previously (now added) |

---

## 2. Mistakes made (root causes)

### Mistake 1 — The closed-test release was always a `draft`

`.github/workflows/android-release.yml` hardcodes `tracks: alpha` / `status: draft`
on every upload. A draft release is **not installable by testers**. We shipped
many versions (up to v1.1.16) and none were ever visible on the closed testing
track.

**Evidence:** category of `android-release.yml:150-151`; latest successful tag
build v1.1.16 (2026-08-26) uploaded `draft`.

### Mistake 2 — The workflow meant to publish it never ran successfully

`play-console-setup.yml` is the only thing that flips the alpha release to
`status: completed` + country targeting. Every historical run **failed in 0s**
because it was `on: push` with a YAML parse error, so it failed on every push
and was never meaningfully executed. It is now `workflow_dispatch`, but was
never manually triggered to completion either.

**Evidence:** `gh run list --workflow=play-console-setup.yml` → 12 runs, all
`failure` `0s` ("likely failed because of a workflow file issue").

### Mistake 3 — "Sending to ~100 users" without verifying installability

An opt-in link was sent to ~100 users while the closed-test release was still a
`draft`. There was nothing for them to install, so **nobody actually opted in**,
nobody engaged, and the 14-day clock on the 12-tester requirement never started.
The "100 users" produced zero progress toward the requirement.

**Lesson:** sending testers is a *second* step. Publishing a `completed`
closed-test release is the *first* step. Verify testers can install before
broadcasting a link.

### Mistake 4 — Assuming "it was ready" without a verification step

There was no gate confirming the closed test was live. The CI emulator smoke
test installs an APK directly (not via Play Store), which gives false confidence
because it does **not** verify Play Store visibility or tester opt-in.

### Mistake 5 — Outdated checklist ("≥1 tester")

The launch checklist said closed testing needed "≥1 tester". The real rule for a
personal account created after Nov 13, 2023 is **≥12 testers opted in
continuously for 14 days** (Google cut it from 20 to 12 in Dec 2024). This
checklist error hid Mistake 3. *(Fixed.)*

### Mistake 6 — No production-track upload path

Nothing in the repo could publish to the `production` track. Even after Google
grants production access, there was no automation to promote the AAB. *(Fixed by
adding `production-release.yml`.)*

---

## 3. The correct path forward (in order)

1. **Publish the closed-test release.** Run
   `Actions → Play Console Setup → Run workflow` (manual), or in Play Console set
   the alpha/closed-testing release to `completed` with country targeting.
   - Verify at `play.google.com/apps/testing/com.dailyreading.app` that a test
     build is actually installable.
2. **Recruit 12 real testers** (email list or Google Group on the closed track).
3. **Send the opt-in link** and keep testers opted in **14 consecutive days**.
   - Testers must actually open/use the app — Google checks engagement.
4. **Apply for production access** when the Dashboard shows the criteria are met;
   answer the ~10-question questionnaire.
5. **Wait for review** (up to ~7 days) — Google may demand more testing if
   engagement is judged insufficient.
6. **Publish to production** via `Actions → Release to Production` (or manual
   promotion), then finalize release notes / submit for review.

---

## 4. Action items resulting from this journal

- [ ] Run (and confirm success of) `Play Console Setup` to make the closed test installable.
- [ ] Verify the opt-in link shows an installable build before recruiting testers again.
- [ ] Recruit ≥12 engaged testers and track the 14-day window.
- [ ] Keep the checklist's 12-tester/14-day wording (done) and stop treating "≥1" as valid.

*Changed this session: added `.github/workflows/production-release.yml`;
corrected `MarkdownSpecification/play_store_launch_checklist.md`.*