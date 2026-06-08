# Deployment Guide — Encounter Daily

## Architecture Overview

```
                          ┌──────────────────────┐
                          │   Android App (APK)   │
                          │  (Capacitor + Ionic)  │
                          └─────────┬────────────┘
                                    │ HTTPS
                                    ▼
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  nginx   │────▶│   API    │────▶│   SQL    │     │ Let's    │
│ (TLS +   │     │  (.NET   │     │  Server  │     │ Encrypt  │
│  Proxy)  │◀────│   10.0)  │     │  (2022)  │     │ (certs)  │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
       │
       ▼
  Podman containers (or Docker)
```

All components run as **Podman containers** on a single VPS (or Docker — same compose files). The Android app communicates with the API over HTTPS.

---

## 1. Prerequisites

### 1.1 What You Need

| Resource | Example |
|---|---|
| **VPS** (Linux, 2GB+ RAM, 20GB+ disk) | Ubuntu 22.04/24.04 on any provider (Linode, Hetzner, DigitalOcean, etc.) |
| **DNS name** | `your-dns-name.com` pointing to your VPS IP |
| **Domain email** | For Let's Encrypt SSL certificate notifications |
| **SSH key** | For secure access to the VPS |

### 1.2 What Gets Installed on the VPS

- Podman + podman-compose (container runtime)
- nginx (reverse proxy, TLS termination)
- certbot (Let's Encrypt SSL certificates)
- UFW (firewall)

### 1.3 Local Dev Machine Requirements

| Tool | Version | Purpose |
|---|---|---|
| Podman or Docker | latest | Build containers |
| .NET SDK | 10.0 | Build backend locally |
| Node.js | 22.x | Build Angular frontend |
| PowerShell 7+ | latest | Run CSV conversion scripts |

---

## 2. Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/your-org/encounter-daily.git
cd encounter-daily

# 2. Configure environment
cp deploy/.env.example deploy/.env
# Edit deploy/.env with your values (DNS, passwords, keys)

# 3. Initialize the VPS (first time only)
make init

# 4. Get SSL certificates
make ssl

# 5. Convert seed data from raw CSVs
make seed

# 6. Deploy!
make staging    # or: make production
```

---

## 3. File Layout

```
deploy/
├── .env.example              # All configurable environment variables
├── Makefile                  # Convenience targets (make staging, etc.)
├── deploy.sh                 # Master automation script (all logic)
├── podman-compose.yml        # Stack definition: SQL + API + nginx
├── podman-compose.prod.yml   # Production overrides (stricter settings)
│
├── nginx/
│   ├── nginx.conf            # Dev/staging nginx config
│   └── nginx.prod.conf       # Production nginx (HSTS, hardened ciphers)
│
├── android/
│   ├── Containerfile         # Container to build Android APK
│   └── entrypoint.sh         # Build script inside the container
│
└── scripts/
    ├── convert-series2.ps1   # Raw CSV → seed CSV for series 2
    └── convert-series3.ps1   # Raw CSV → seed CSV for series 3

database/encounter/
├── convert-series1.ps1       # Raw CSV → seed CSV for series 1
├── convert-series4.ps1       # Raw CSV → seed CSV for series 4
└── series{1,2,3,4}.csv       # Raw reading schedule source files

backend/
└── Containerfile             # Multi-stage .NET 10.0 build → runtime image

.github/workflows/
├── ci.yml                    # PR checks: run frontend (Jest) + backend (xUnit) tests only
└── deploy.yml                # CD: test → build → deploy to staging or production VPS

MarkdownSpecification/
└── deployment_guide.md       # This file — deployment and operations reference
```

---

## 4. Makefile Targets

| Command | What It Does |
|---|---|
| `make init` | SSH into VPS, install Podman, nginx, certbot, UFW |
| `make ssl` | Obtain Let's Encrypt certificate for your domain |
| `make staging` | Build + deploy full stack to staging VPS |
| `make production` | Build + deploy full stack to production VPS |
| `make seed` | Convert all 4 raw CSVs → seed CSVs, then import to DB |
| `make android` | Build a signed Android APK |
| `make build-backend` | Build backend container image locally |
| `make clean` | Tear down all containers and volumes |

---

## 5. Manual Deployment Steps (if not using CI/CD)

### 5.1 Convert Raw CSVs to Seed Data

The raw reading schedules are in `database/encounter/series{1,2,3,4}.csv`. They must be converted to the seed CSV format before importing.

```bash
# All four converters (PowerShell 7+ required)
pwsh database/encounter/convert-series1.ps1
pwsh deploy/scripts/convert-series2.ps1
pwsh deploy/scripts/convert-series3.ps1
pwsh database/encounter/convert-series4.ps1
```

Output goes to `database/seed-data/series-{1,2,3,4}-readings.csv`.

### 5.2 Build and Deploy

```bash
# Build the backend container image
podman build -t encounter-daily-api -f backend/Containerfile backend/

# Save and transfer to VPS
podman save encounter-daily-api:latest | gzip > /tmp/api.tar.gz
scp /tmp/api.tar.gz deploy@your-vps:/opt/encounter-daily/

# On the VPS:
cd /opt/encounter-daily
podman load -i api.tar.gz

# Start the stack
podman-compose up -d

# Seed the database (after SQL Server is healthy)
podman-compose exec api dotnet EncounterDaily.ImportTool.dll --force seeddata
```

### 5.3 Build Android APK

```bash
# Option A: Containerized build (recommended)
podman build -t encounter-daily-android-builder -f deploy/android/Containerfile .
podman run --rm \
  -v ./frontend:/app/frontend:ro \
  -v ./deploy/android/output:/output \
  -e "API_URL=https://your-dns-name.com/api/v1" \
  encounter-daily-android-builder
# APK at: deploy/android/output/app-release.apk

# Option B: Local build (requires Android SDK + Gradle)
cd frontend
npm ci && npx ng build --configuration production
npx cap copy android
cd android && ./gradlew assembleRelease
# APK at: frontend/android/app/build/outputs/apk/release/app-release.apk
```

---

## 6. Container Stack Details

### 6.1 Services

| Service | Image | Purpose | Ports |
|---|---|---|---|
| `sqlserver` | `mcr.microsoft.com/mssql/server:2022-latest` | Database | 1433 |
| `api` | Built from `backend/Containerfile` | .NET REST API | 5000 |
| `nginx` | `docker.io/nginx:alpine` | Reverse proxy + TLS | 80, 443 |

### 6.2 Environment Variables

Set these in `deploy/.env` or pass as environment variables:

| Variable | Required | Description |
|---|---|---|
| `SA_PASSWORD` | Yes | SQL Server SA password (min 8 chars, complex) |
| `JWT_RSA_PRIVATE_KEY` | Yes | Base64-encoded RSA private key for JWT signing |
| `DEEPSEEK_API_KEY` | Yes | DeepSeek API key for AI Summarize feature (journal notes) |
| `STAGING_HOST` | For staging | DNS name of staging server |
| `PRODUCTION_HOST` | For production | DNS name of production server |
| `STAGING_SSH_USER` | For staging | SSH username for staging VPS |
| `PRODUCTION_SSH_USER` | For production | SSH username for production VPS |
| `SSH_KEY` | Yes | Path to local SSH private key used to connect to VPS (default: `~/.ssh/id_ed25519`) |
| `CERTBOT_EMAIL` | For SSL | Email for Let's Encrypt notifications |
| `MSSQL_PID` | No | SQL Server edition — defaults to `Express` (10 GB database size cap). Set to `Developer` or `Standard` for larger datasets. |
| `GOOGLE_CLIENT_ID` | For OAuth | Google OAuth client ID |
| `FACEBOOK_APP_ID` | For OAuth | Facebook app ID |
| `FACEBOOK_APP_SECRET` | For OAuth | Facebook app secret |

Generate the JWT key:
```bash
openssl genrsa 2048 | base64 -w0
```

### 6.3 Health Checks

The stack starts in order: SQL Server (health check passes) → API → nginx. The SQL Server health check uses `sqlcmd` to verify the database is accepting connections before starting the API.

---

## 7. CI/CD Pipeline (GitHub Actions)

File: `.github/workflows/deploy.yml`

### 7.1 Workflow Files

| File | Purpose |
|---|---|
| `ci.yml` | Runs on every PR — executes frontend (Jest) and backend (xUnit) tests, no deploy |
| `deploy.yml` | Runs on push to `develop` or `main` — tests → build → deploy |

### 7.2 Triggers

| Branch | Action |
|---|---|
| `develop` | Deploy to staging VPS |
| `main` | Deploy to production VPS |
| Any PR | Run tests only (`ci.yml`) |

### 7.3 Jobs

```
test  ──▶  build  ──▶  deploy-staging (develop)
                         deploy-production (main)
```

### 7.4 GitHub Secrets Required

| Secret | Purpose |
|---|---|
| `STAGING_SSH_KEY` | Private SSH key for staging VPS |
| `PRODUCTION_SSH_KEY` | Private SSH key for production VPS |
| `SA_PASSWORD` | SQL Server password |
| `JWT_RSA_PRIVATE_KEY` | JWT signing key |
| `DEEPSEEK_API_KEY` | DeepSeek API key for AI Summarize feature |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `FACEBOOK_APP_ID` | Facebook app ID |
| `FACEBOOK_APP_SECRET` | Facebook app secret |

### 7.5 GitHub Variables Required

| Variable | Purpose |
|---|---|
| `STAGING_HOST` | DNS name of staging server |
| `PRODUCTION_HOST` | DNS name of production server |
| `STAGING_SSH_USER` | SSH username for staging |
| `PRODUCTION_SSH_USER` | SSH username for production |

---

## 8. Android APK Distribution

The Android app loads web content from `capacitor://localhost` (filesystem) and makes API calls to the VPS over HTTPS.

### 8.1 Build Types

| Type | Command | File |
|---|---|---|
| Debug (unsigned) | `./gradlew assembleDebug` | `app-debug.apk` |
| Release (unsigned) | `./gradlew assembleRelease` | `app-release-unsigned.apk` |
| Release (signed) | `./gradlew assembleRelease` (with keystore) | `app-release.apk` |
| App Bundle | `./gradlew bundleRelease` | `app-release.aab` |

### 8.2 Signing the APK

Generate a keystore once (keep it safe — do not commit it to git):

**Linux / macOS (bash):**
```bash
keytool -genkey -v -keystore encounter-daily-keystore.jks \
  -keyalg RSA -keysize 2048 -validity 10000 -alias release
```

**Windows (PowerShell) — run as a single line to avoid creating stray folders:**
```powershell
keytool -genkey -v -keystore encounter-daily-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias release
```

> **Warning (Windows):** Do not split the `keytool` command across multiple lines with backtick continuation in a plain `cmd` window — each flag like `-alias` may be interpreted as a folder name. Use PowerShell or run it as one line.

Configure signing in `frontend/android/app/build.gradle`:
```gradle
android {
    signingConfigs {
        release {
            storeFile file('encounter-daily-keystore.jks')
            storePassword System.getenv("KEYSTORE_PASSWORD")
            keyAlias "release"
            keyPassword System.getenv("KEY_PASSWORD")
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}
```

### 8.3 Android Permissions

The app requires these permissions (auto-added by Capacitor plugins):

- `INTERNET` — API calls to VPS
- `ACCESS_NETWORK_STATE` — Check connectivity
- `POST_NOTIFICATIONS` — Push notifications (optional)

All API traffic goes over HTTPS. No cleartext HTTP is needed.

---

## 9. Production Checklist

- [ ] DNS A record pointing to VPS IP
- [ ] SSL certificate valid and auto-renewing (certbot timer)
- [ ] `JWT_RSA_PRIVATE_KEY` set (not the default)
- [ ] `SA_PASSWORD` changed from default
- [ ] `DEEPSEEK_API_KEY` set (required for AI Summarize feature in journal)
- [ ] OAuth credentials configured (Google, Facebook)
- [ ] CORS origins updated in `appsettings.Production.json`
- [ ] Android keystore generated and backed up securely (not in git)
- [ ] `bypassAuth` set to `false` in production environment (see note below)
- [ ] First admin account created after initial deploy (see Section 12)
- [ ] `MSSQL_PID` reviewed — Express edition has a 10 GB size cap
- [ ] Firewall enabled (ports 22, 80, 443 only)
- [ ] Regular database backups configured (see Section 13)

> **`bypassAuth` note:** This flag lives in `appsettings.json` under `AppSettings.BypassAuth`. When `true`, all authentication checks are skipped (development shortcut only). It must be `false` in any deployed environment. It is `false` by default in `appsettings.Production.json`.

---

## 10. Rolling Back

Before deploying a new version, tag the current image as `previous` so you can roll back:

```bash
# On the VPS — before deploying a new build, preserve the running image
podman tag encounter-daily-api:latest encounter-daily-api:previous

# Deploy the new build (CI/CD or manually)
# ...

# If the new build is bad, revert:
podman tag encounter-daily-api:previous encounter-daily-api:latest
podman-compose up -d
```

If you push versioned tags via CI (e.g. `v1.2.3`), you can also restore a specific release:

```bash
podman pull ghcr.io/your-org/encounter-daily-api:v1.2.3
podman tag ghcr.io/your-org/encounter-daily-api:v1.2.3 encounter-daily-api:latest
podman-compose up -d
```

---

## 11. Troubleshooting

| Problem | Likely Cause | Fix |
|---|---|---|
| API returns 500 | Missing DB connection string | Check `SA_PASSWORD` env var |
| AI Summarize returns error | Missing or invalid DeepSeek key | Set `DEEPSEEK_API_KEY` in env / GitHub Secrets |
| nginx SSL error | Certificate expired | `sudo certbot renew` |
| Android app shows blank screen | CORS misconfigured | Check `AllowedOrigins` in appsettings |
| `dotnet publish` fails for net10.0 | Wrong SDK version | Install .NET 10 SDK from dotnet.microsoft.com |
| `podman-compose` command not found | Not installed | `sudo apt install podman-compose` |
| DB connection refused | SQL Server not healthy | Check `podman-compose logs sqlserver` |
| "Cannot insert duplicate key" on seed | Seed already imported | Use `--force` flag to overwrite |

---

## 12. First Admin User Setup

After a fresh deployment the database has no users. The first person to log in via Google or Facebook OAuth is automatically assigned the **User** role. To promote them to **Admin**:

```bash
# Connect to the running SQL Server container
podman-compose exec sqlserver /opt/mssql-tools/bin/sqlcmd \
  -S localhost -U sa -P "$SA_PASSWORD" -d EncounterDaily

# Promote a user by email
UPDATE AspNetUsers
SET RoleId = (SELECT Id FROM AspNetRoles WHERE Name = 'Admin')
WHERE Email = 'your-email@example.com';
GO
```

Once an admin account exists, further role changes can be made through the admin panel at `/admin`.

---

## 13. Database Backups

SQL Server Express does not include SQL Server Agent, so automated backups must be scripted manually. A simple approach using a cron job on the VPS:

```bash
# Add to crontab (crontab -e) — runs daily at 2am
0 2 * * * podman exec encounter-daily-sqlserver /opt/mssql-tools/bin/sqlcmd \
  -S localhost -U sa -P "$SA_PASSWORD" \
  -Q "BACKUP DATABASE [EncounterDaily] TO DISK='/var/opt/mssql/backup/encounter-daily-$(date +\%Y\%m\%d).bak' WITH COMPRESSION" \
  >> /var/log/encounter-daily-backup.log 2>&1
```

Copy backups off the VPS regularly (e.g. `scp` to a separate machine or cloud storage). Retain at least 7 days of backups.

To restore:

```bash
podman exec encounter-daily-sqlserver /opt/mssql-tools/bin/sqlcmd \
  -S localhost -U sa -P "$SA_PASSWORD" \
  -Q "RESTORE DATABASE [EncounterDaily] FROM DISK='/var/opt/mssql/backup/encounter-daily-20260101.bak' WITH REPLACE"
```

