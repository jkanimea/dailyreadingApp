# Google Play Store Launch Checklist — Encounter Daily

**Package:** `com.dailyreading.app`
**Current release automation:** `.github/workflows/android-release.yml` builds signed APK + AAB and uploads to the **alpha (closed testing)** track as **draft** on every `v*` tag.
**Distribution workflow:** `.github/workflows/play-console-setup.yml` (restored, manual `workflow_dispatch`) can promote the alpha release to a `completed` country-targeted rollout.

Use this checklist to take the app from closed testing to a public Play Store release. Items are marked `[x]` if already confirmed in the repo, `[ ]` if still to do.

---

## 0. Release automation (already in place)
- [x] Signed APK + AAB build in CI
- [x] Google Play service account secret (`GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`) configured
- [x] Deterministic versionCode (`300000 + commit count`) to avoid collisions
- [x] Auto-upload to **closed testing (alpha)** as **draft** on tag builds
- [x] `play-console-setup.yml` for country targeting + `completed` rollout
- [ ] Verify a draft release actually exists in Play Console for the latest tag (run the pipeline and check)

---

## 1. App information & developer setup (Play Console — manual) — DONE
- [x] Developer account verified, Developer Program Policy accepted
- [x] **App name / title** (e.g. "Encounter Daily")
- [x] **Short description** (80–90 chars)
- [x] **Full description**
- [x] **App category** (e.g., Lifestyle / Education / Books & Reference)
- [x] **Content rating questionnaire** completed
- [x] **Target audience & content** form completed
- [x] **Ads** declaration (does the app show ads? currently no — declare "no ads")
- [x] Contact email + website (`jkanimea@gmail.com` / `https://mg-encounter.com`)

## 2 — Privacy & data (required for review)
- [ ] **Privacy policy hosted at a public URL** — now `https://mg-encounter.com/privacy` (pushed; confirm after deploy)
- [ ] **Data deletion process documented at a public URL** — now `https://mg-encounter.com/delete-account` (pushed; confirm after deploy)
- [x] **Data safety form** completed in Play Console (declare account/email, reading progress, journal notes, preferences; how data is shared/secured)
- [x] Google OAuth + Facebook OAuth data handling disclosed per policy

## 3 — Store listing assets [DONE]
- [x] **App icon** (512x512 PNG)
- [x] **Feature graphic** (1024x500 JPG/PNG)
- [x] **Phone screenshots** (min 2, up to 8)
- [x] Tablet screenshots (7- and 10-pot)
- [x] **Promo video / thumbnails** — optional
- [x] **App icon for closed testing** is visible to testers

## 4 — Closed testing → production path
- [ ] Create/confirm the **closed testing** (alpha) release is a complete, draft<release@0> with an AppAB
- [ ] Add at least **1 tester** (self) to the closed testing group and accept the opt-in link (Play requires closed testing to review files before promotion)
- [ ] Enroll device / sign in to verify the build installs and runs against production API
- [ ] (Optional but recommended) Use **Play App Signing** — Google manages the upload key / keystore (externally enabled)
- [ ] Review the "**Test with Google materials: closed testing requirements**" each release

## 4 — Final production release
- [ ] Promote the approved release from alpha → **production**
- [ ] Ensure release is set to **`completed`** status (not just `draft`)
- [ ] Set **country availability** (US/CA/GB/AU/IN/DE/FR/JP/BR/MX + rest of world), then a staged **user fraction (0→1)**
- [ ] **Release notes / what's new** for the production version
- [ ] Resolve any **errors, warnings, or policy issues** shown in the Console's Release overview
- [ ] Resolve the **advertising ID / account deletion** policy requirements before submission
- [ ] **Submit for review** — Google typically reviews within a few days; user can click "Go live after review"

## 5. Post-launch
- [ ] Verify production build serves from the live API URL (`https://mg-encounter.com/api/v1`)
- [ ] Confirm `bypassAuth` is `false` for production
- [ ] Enable automated backups (see §13 in `deployment_guide.md`)
- [ ] Monitor Play Console for crashes, ratings, and policy violations

---

## Key automation notes
- New builds ship by tagging `v1.0.x` — the workflow builds/uploads to **alpha-as-draft**.
- Use the **Play Console Setup** workflow (`Actions → Play Console Setup → Run workflow`) after uploading to apply `completed` country targeting + rollout. If unexpected, apply it manually in the Console.
- VersionCode increments automatically, so no manual bumping is needed.

## Known gaps to close first
1. **Public privacy policy URL** (PRIVACY.md not hosted)
2. **Public data-deletion URL** (DELETE_ACCOUNT.md not hosted)
3. **Store listing assets** — icon, feature graphic, screenshots
4. **Product listing/data safety/rating forms** in Play Console
5. **Closed testing** needs ≥1 tester + opt-in acceptance before production promotion