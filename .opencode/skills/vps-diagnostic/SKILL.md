---
name: vps-diagnostic
description: SSH into vhostsvr VPS, query the SQL database AppLogs table to diagnose auth/login errors. Use when the user mentions "vps", "vhostsvr", "app logs", "sql logs", "diagnose auth", "Google sign-in not working", "login failed", or asks to check the database on the VPS.
---

# VPS Diagnostic Skill

## Workflow: Check App Logs on vhostsvr

1. **SSH into the VPS** — the host `vhostsvr` is configured in `~/.ssh/config` with user `jkanimea`.

2. **Query the AppLogs table** in SQL Server via the running `encounter-daily-sql` podman container:

   ```bash
   ssh vhostsvr 'podman exec encounter-daily-sql /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "EncounterDaily2024!" -d EncounterDaily -C -Q "SELECT Id, Level, Message, Source, CreatedAt FROM AppLogs ORDER BY CreatedAt DESC"'
   ```

3. **Filter for auth-related errors** — Google sign-in failures log as:
   - `LoginPage.loginWithGoogle` (frontend error)
   - `AuthController.LoginWithGoogle: "Google login failed with invalid token"` (backend)

4. **Common Google Sign-In failures on Android:**
   - **Audience mismatch**: The native Android Google Sign-In returns an ID token whose `aud` claim is the Android OAuth client ID (from `google-services.json`), but the backend only validates against the Web client ID. Fix: add more audiences to `GoogleJsonWebSignature.ValidationSettings.Audience` in `AuthService.cs`, or unset `Audience` to skip the audience check.
   - **Missing `google-services.json`**: If `GOOGLE_SERVICES_JSON` secret isn't set in GitHub Actions, the native Google Sign-In plugin won't work.
   - **SHA-1 fingerprint mismatch**: The keystore used to sign the APK must have its SHA-1 registered in Google Cloud Console.

## VPS info
- SA_PASSWORD: `EncounterDaily2024!`
- Database: `EncounterDaily`
- SQL container: `encounter-daily-sql`
- All 4 containers: `infra`, `encounter-daily-sql`, `encounter-daily-api`, `encounter-daily-nginx`
