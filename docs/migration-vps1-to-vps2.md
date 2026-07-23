# Migration: VPS1 (82.180.136.105) → VPS2 (208.87.135.175)

**Date:** July 23, 2026
**Application:** Encounter Daily (https://mg-encounter.com)
**Source:** vps1 (82.180.136.105) — old server
**Target:** vps2 (208.87.135.175) — new server

---

## Overview

Migrated the full Encounter Daily stack from VPS1 to VPS2: Podman containers (SQL Server, .NET API, nginx), SSL certificates, SQL database (with user data), and pointing DNS to the new server.

---

## New Server Details

| Item | Value |
|---|---|
| IP | 208.87.135.175 |
| OS | Ubuntu 26.04 LTS (Resolute Raccoon) |
| SSH User | `jkanimea` |
| SSH Key | `~/.ssh/vps2_migration_key` (also stored as GitHub secret `SSH_KEY`) |
| Hostname | Not set (uses IP) |

---

## Software Installed on VPS2

All installed via `apt-get`:

- **podman** 5.7.0 — container runtime
- **podman-compose** 1.5.0 — compose orchestrator
- **nginx** 1.28.3 — HTTP server (host-level; disabled at boot, only used for certbot)
- **certbot** 4.0.0 — SSL certificate management
- **rsync** 3.4.1 — file sync
- **ufw** — firewall (ports 22, 80, 443 allowed)

**Non-root port binding configured:**
```bash
sudo sysctl -w net.ipv4.ip_unprivileged_port_start=80
```
This allows the `jkanimea` user to bind ports 80 and 443 (required for rootless Podman).

---

## Directory Structure on VPS2

```
/opt/encounter-daily/
├── .env                          # Environment secrets (JWT keys, OAuth IDs, API keys)
├── deploy/                       # Deploy scripts and compose files (synced from repo)
├── frontend/www/                 # Angular production build
├── nginx/
│   └── nginx.conf                # nginx config (mounted into container)
└── ssl/
    ├── fullchain.pem             # SSL certificate (Let's Encrypt, mg-encounter.com + www.mg-encounter.com)
    └── privkey.pem               # SSL private key
```

---

## Container Stack

All containers run in a **Podman pod** named `encounter-pod` (sharing network namespace).

| Container | Image | Port | Purpose |
|---|---|---|---|
| `encounter-daily-sql` | `mcr.microsoft.com/mssql/server:2022-latest` | 1433 (internal) | SQL Server Express |
| `encounter-daily-api` | `ghcr.io/jkanimea/encounter-daily-api:production-latest` | 5000 | .NET REST API |
| `encounter-daily-nginx` | `docker.io/nginx:alpine` | 80, 443 | Reverse proxy + static files |

The pod maps ports `80:80`, `443:443`, `5000:5000` to the host.

**Key difference from VPS1:** The pod is created with `--shm-size=1g` for SQL Server and `--restart=always` to ensure stability.

---

## CI/CD Integration

The GitHub Actions workflow (`web-release.yml`) deploys to VPS2 automatically on push to `main`:

1. **Connection:** SSH to `mg-encounter.com` as `jkanimea` using the `SSH_KEY` GitHub secret
2. **Image:** API is pulled from `ghcr.io/jkanimea/encounter-daily-api:production-latest`
3. **Deploy:** Workflow creates the pod, starts SQL/API/nginx containers, runs smoke tests
4. **Secrets:** `.env` file with JWT keys, OAuth IDs, etc. is created at deploy time from GitHub secrets

**GitHub variables used:**
- `PRODUCTION_HOST` = `mg-encounter.com` (DNS resolves to VPS2)
- `SSH_USER` = `jkanimea`

**GitHub secrets updated:**
- `SSH_KEY` = private key for `vps2_migration_key` (authenticates as `jkanimea`)

---

## SSL Certificates

**Source:** Copied from VPS1's Let's Encrypt directory on Jul 23, 2026.

**Production cert location on VPS2:**
```
/opt/encounter-daily/ssl/
├── fullchain.pem
└── privkey.pem
```

**Original location on VPS1 (Let's Encrypt):**
```
/etc/letsencrypt/live/mg-encounter.com/
├── cert.pem
├── chain.pem
├── fullchain.pem
└── privkey.pem
```

**Certificate details:**
- Subject: `CN=mg-encounter.com`
- SANs: `mg-encounter.com`, `www.mg-encounter.com`
- Issued: Jul 7, 2026
- Expires: Oct 5, 2026
- Issuer: Let's Encrypt (R11)

**To renew (before Oct 5, 2026):**
```bash
ssh jkanimea@208.87.135.175
sudo certbot certonly --nginx -d mg-encounter.com -d www.mg-encounter.com
sudo cp /etc/letsencrypt/live/mg-encounter.com/fullchain.pem /opt/encounter-daily/ssl/
sudo cp /etc/letsencrypt/live/mg-encounter.com/privkey.pem /opt/encounter-daily/ssl/
sudo chown jkanimea:jkanimea /opt/encounter-daily/ssl/*
podman restart encounter-daily-nginx
```

---

## Database Migration

**Method:** SQL Server native backup/restore (SQL Express supports file backup).

**Steps taken:**
1. On VPS1: `BACKUP DATABASE EncounterDaily TO DISK = '/var/opt/mssql/backup/encounterdaily.bak' WITH INIT`
2. Copied backup file from container to VPS1 host → local machine → VPS2 host → new SQL container
3. On VPS2: `RESTORE DATABASE EncounterDaily FROM DISK = '/var/opt/mssql/backup/encounterdaily.bak' WITH REPLACE`

**Database:**
- Name: `EncounterDaily`
- Tables: Includes `AspNetUsers` (user accounts), reading content tables, etc.
- SQL Server Edition: Express (free, limited to 10GB)

---

## nginx Configuration

**Config file:** `deploy/nginx/nginx.conf` (mounted read-only into nginx container)

**Key settings:**
- HTTP (80) → redirects to HTTPS (301)
- HTTPS (443) → serves Angular frontend from `/opt/encounter-daily/frontend/www/`
- API proxy: `/api/` → `http://localhost:5000` (API runs in same pod, same network namespace)
- Server names: `mg-encounter.com`, `www.mg-encounter.com`, `stage.mg-encounter.com`

**Note:** Because containers share the pod's network namespace, the API upstream uses `localhost:5000` (not the container name).

---

## VPS2 Setup Commands (Reference)

If setting up a new VPS from scratch:

```bash
# 1. Create user
sudo useradd -m -s /bin/bash jkanimea
sudo usermod -aG sudo jkanimea
echo 'jkanimea ALL=(ALL) NOPASSWD: ALL' | sudo tee /etc/sudoers.d/jkanimea

# 2. Add SSH key
sudo mkdir -p ~jkanimea/.ssh
echo '<public-key>' | sudo tee -a ~jkanimea/.ssh/authorized_keys
sudo chmod 700 ~jkanimea/.ssh
sudo chmod 600 ~jkanimea/.ssh/authorized_keys
sudo chown -R jkanimea:jkanimea ~jkanimea/.ssh

# 3. Install software
sudo apt-get update && sudo apt-get install -y podman podman-compose nginx certbot python3-certbot-nginx rsync ufw

# 4. Allow non-root port binding
sudo sysctl -w net.ipv4.ip_unprivileged_port_start=80
echo 'net.ipv4.ip_unprivileged_port_start=80' | sudo tee -a /etc/sysctl.conf

# 5. Configure firewall
sudo ufw allow 22/tcp && sudo ufw allow 80/tcp && sudo ufw allow 443/tcp && sudo ufw --force enable

# 6. Stop host nginx (container nginx handles traffic)
sudo systemctl stop nginx && sudo systemctl disable nginx

# 7. Create directories
sudo mkdir -p /opt/encounter-daily/{deploy,frontend/www,nginx,ssl}
sudo chown -R jkanimea:jkanimea /opt/encounter-daily

# 8. Enable podman socket
sudo systemctl enable --now podman.socket
```

---

## Rollback Plan

To revert to VPS1:

1. Point DNS A records back to `82.180.136.105`
2. VPS1 still has the old stack running (was not shut down)
3. No data loss — VPS1 database is a snapshot from Jul 23, 2026 (any new data since then would be lost)

---

## Files Changed in Repository

| File | Change |
|---|---|
| `deploy/nginx/nginx.conf` | Added `www.mg-encounter.com` to `server_name` directive |

These changes should be committed and pushed to keep the repo in sync.
