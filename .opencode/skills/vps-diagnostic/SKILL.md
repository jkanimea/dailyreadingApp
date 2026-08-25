---
name: vps-diagnostic
description: SSH into vhostsvr VPS, query the SQL database AppLogs table to diagnose auth/login errors. Use when the user mentions "vps", "vhostsvr", "app logs", "sql logs", "diagnose auth", "Google sign-in not working", "login failed", or asks to check the database on the VPS.
---

# VPS Diagnostic Skill

## Workflow: Check App Logs on vhostsvr

1. **SSH into the VPS** — the host `vhostsvr2` (`208.87.135.175`, user `jkanimea`) is configured in `~/.ssh/config`. (The legacy `vhostsvr` entry is stale; use `vhostsvr2`.)

2. **Query the AppLogs table** in SQL Server via the running `encounter-daily-sql` podman container:

   ```bash
   ssh vhostsvr2 'podman exec encounter-daily-sql /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "EncounterDaily2024!" -d EncounterDaily -C -Q "SELECT Id, Level, Message, Source, CreatedAt FROM AppLogs ORDER BY CreatedAt DESC"'
   ```

3. **Filter for auth-related errors** — Google sign-in failures log as:
   - `LoginPage.loginWithGoogle` (frontend error)
   - `AuthController.LoginWithGoogle: "Google login failed with invalid token"` (backend)

4. **Common Google Sign-In failures on Android:**
   - **Audience mismatch**: The native Android Google Sign-In returns an ID token whose `aud` claim is the Android OAuth client ID (from `google-services.json`), but the backend only validates against the Web client ID. Fix: add more audiences to `GoogleJsonWebSignature.ValidationSettings.Audience` in `AuthService.cs`, or unset `Audience` to skip the audience check.
   - **Missing `google-services.json`**: If `GOOGLE_SERVICES_JSON` secret isn't set in GitHub Actions, the native Google Sign-In plugin won't work.
   - **SHA-1 fingerprint mismatch**: The keystore used to sign the APK must have its SHA-1 registered in Google Cloud Console.
   - **Stale `webClientId` / Firebase project migration** (resolved 2026-08-25): The frontend hardcoded a `webClientId` from the pre-migration Firebase project (`126956037492…`) while the app is now in project `868571551367`. On Android the native flow throws `GetCredentialCancellationException` → `LoginPage.loginWithGoogle` logs `"Google Sign-In cancelled by user"` **the moment the user taps their account**, and there is **no** `AuthController` entry in AppLogs (the ID token never reaches the backend). Fix: set `GOOGLE_WEB_CLIENT_ID` in `frontend/src/app/core/oauth.config.ts` to the current project's `client_type: 3` (web) entry from `google-services.json`. A CI cross-check (`frontend/scripts/check-oauth-config.mjs`) and `oauth.config.spec.ts` now guard against this drift. Diagnose device-side via `adb logcat` — a correct client ID shows `GoogleProvider` `TYPE_GOOGLE_ID_TOKEN_CREDENTIAL meets all filtering conditions`; a stale one fails earlier.

## VPS info
- SA_PASSWORD: `EncounterDaily2024!`
- Database: `EncounterDaily`
- SQL container: `encounter-daily-sql`
- All 4 containers: `infra`, `encounter-daily-sql`, `encounter-daily-api`, `encounter-daily-nginx`
