#!/usr/bin/env bash
set -euo pipefail
#
# deploy.sh — Automated deployment for Encounter Daily
#
# Usage:
#   ./deploy.sh staging                # Deploy to staging VPS
#   ./deploy.sh production             # Deploy to production VPS
#   ./deploy.sh build-backend          # Build backend container only
#   ./deploy.sh seed-data              # Convert CSVs + seed database
#   ./deploy.sh build-android          # Build signed Android APK
#   ./deploy.sh init-vps               # First-time VPS setup (Docker/Podman + certs)
#

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENVIRONMENT="${1:-staging}"

# ─── Configuration ───────────────────────────────────────────────────────────
# Set these via environment variables or copy .env.example to .env
DOTENV="$SCRIPT_DIR/.env"
if [ -f "$DOTENV" ]; then
    source "$DOTENV"
fi

: "${STAGING_HOST:=stage.mg-encounter.com}"
: "${PRODUCTION_HOST:=mg-encounter.com}"
: "${SSH_USER:=deploy}"
: "${SSH_KEY:=~/.ssh/id_ed25519}"
: "${SA_PASSWORD:=YourStrong@Passw0rd}"
: "${JWT_RSA_PRIVATE_KEY:=}"
: "${CERTBOT_EMAIL:=admin@mg-encounter.com}"
: "${GHCR_REGISTRY:=ghcr.io}"
: "${GHCR_USER:=}"
: "${GHCR_TOKEN:=}"
: "${COMPOSE:=podman-compose}"
: "${DOCKER_HOST:=unix:///run/podman/podman.sock}"

case "$ENVIRONMENT" in
    staging)
        REMOTE_HOST="$STAGING_HOST"
        REMOTE_USER="$SSH_USER"
        COMPOSE_FILE="$SCRIPT_DIR/podman-compose.yml"
        REMOTE_DIR="/opt/encounter-daily"
        ;;
    production|prod)
        REMOTE_HOST="$PRODUCTION_HOST"
        REMOTE_USER="$SSH_USER"
        COMPOSE_FILE="$SCRIPT_DIR/podman-compose.yml:$SCRIPT_DIR/podman-compose.prod.yml"
        REMOTE_DIR="/opt/encounter-daily"
        ;;
    *)
        echo "Usage: $0 {staging|production|build-backend|seed-data|build-android|init-vps}"
        exit 1
        ;;
esac

# ─── Functions ───────────────────────────────────────────────────────────────

log()  { echo -e "\033[1;32m[✓]\033[0m $*"; }
warn() { echo -e "\033[1;33m[!]\033[0m $*"; }
err()  { echo -e "\033[1;31m[✗]\033[0m $*" >&2; exit 1; }

build_backend() {
    log "Building backend container image..."
    cd "$REPO_ROOT"
    $COMPOSE -f "$SCRIPT_DIR/podman-compose.yml" build api
    log "Backend image built successfully"
}

build_frontend_web() {
    log "Building Angular web app (production)..."
    cd "$REPO_ROOT/frontend"
    npm ci
    npx ng build --configuration production
    log "Angular web build complete → www/"
}

seed_database() {
    log "Converting raw CSVs to seed data..."
    cd "$REPO_ROOT"

    # Convert all series using PowerShell scripts
    if command -v pwsh &> /dev/null; then
        pwsh "$REPO_ROOT/database/encounter/convert-series1.ps1" || warn "Series 1 conversion failed"
        pwsh "$REPO_ROOT/database/encounter/convert-series4.ps1" || warn "Series 4 conversion failed"
        pwsh "$SCRIPT_DIR/scripts/convert-series2.ps1" || warn "Series 2 conversion failed"
        pwsh "$SCRIPT_DIR/scripts/convert-series3.ps1" || warn "Series 3 conversion failed"
    elif command -v powershell &> /dev/null; then
        powershell "$REPO_ROOT/database/encounter/convert-series1.ps1" || warn "Series 1 conversion failed"
        powershell "$REPO_ROOT/database/encounter/convert-series4.ps1" || warn "Series 4 conversion failed"
    else
        warn "PowerShell not found — skipping CSV conversion (use manual seed CSVs)"
    fi

    log "Importing seed data into database..."
    cd "$REPO_ROOT/backend/tools/EncounterDaily.ImportTool"
    local conn="Server=localhost,1433;Database=EncounterDaily;User Id=sa;Password=$SA_PASSWORD;TrustServerCertificate=True;"
    for csv in "$REPO_ROOT/database/seed-data/series-"*.csv; do
        [ -f "$csv" ] || continue
        ConnectionStrings__DefaultConnection="$conn" \
            dotnet run -- --force import "$csv" || warn "Import failed for $(basename "$csv")"
    done
    log "Database seeding complete"
}

build_android_apk() {
    log "Building Android APK..."
    cd "$REPO_ROOT/deploy"

    # Option 1: Using containerized build
    if command -v podman &> /dev/null; then
        podman run --rm \
            -v "$REPO_ROOT/frontend:/app/frontend:ro" \
            -v "$REPO_ROOT/deploy/android/output:/output" \
            -e "API_URL=https://$REMOTE_HOST/api/v1" \
            localhost/encounter-daily-android-builder
        log "APK built: deploy/android/output/app-release.apk"
    # Option 2: Using local Android SDK
    elif command -v gradle &> /dev/null && [ -d "$REPO_ROOT/frontend/android" ]; then
        cd "$REPO_ROOT/frontend"
        npm ci
        npx ng build --configuration production
        npx cap copy android
        cd android
        ./gradlew assembleRelease
        log "APK built: frontend/android/app/build/outputs/apk/release/app-release.apk"
    else
        err "No Android build capability found. Install Podman or Android SDK."
    fi
}

init_vps() {
    local host="$REMOTE_HOST"
    log "Initializing VPS: $host..."

    ssh -i "$SSH_KEY" "$REMOTE_USER@$host" <<'VPS_SETUP'
        set -e
        echo "[VPS] Updating system..."
        sudo apt-get update -qq && sudo apt-get upgrade -y -qq

        echo "[VPS] Installing Podman..."
        source /etc/os-release
        if ! command -v podman &> /dev/null; then
            sudo apt-get install -y podman podman-compose
        fi

        echo "[VPS] Installing nginx + certbot..."
        sudo apt-get install -y nginx certbot python3-certbot-nginx

        echo "[VPS] Enabling Podman socket for remote management..."
        sudo systemctl enable --now podman.socket

        echo "[VPS] Creating deploy directory..."
        sudo mkdir -p /opt/encounter-daily
        sudo chown "$USER:$USER" /opt/encounter-daily

        echo "[VPS] Setting up firewall..."
        sudo ufw allow 22/tcp
        sudo ufw allow 80/tcp
        sudo ufw allow 443/tcp
        sudo ufw --force enable

        echo "[VPS] VPS initialization complete"
VPS_SETUP
    log "VPS initialized. Run 'certbot' after DNS points to this server."
}

setup_ssl() {
    log "Setting up SSL certificate with Let's Encrypt..."
    ssh -i "$SSH_KEY" "$REMOTE_USER@$REMOTE_HOST" \
        "sudo certbot --nginx -d $REMOTE_HOST --non-interactive --agree-tos -m $CERTBOT_EMAIL"
    log "SSL certificate obtained for $REMOTE_HOST"
}

deploy_stack() {
    log "Deploying $ENVIRONMENT stack to $REMOTE_HOST..."

    # 1. Determine image tag and build
    local git_sha
    git_sha="$(git -C "$REPO_ROOT" rev-parse --short HEAD 2>/dev/null || echo "latest")"
    local image_tag="${ENVIRONMENT}-${git_sha}"
    local image_ref="$GHCR_REGISTRY/jkanimea/encounter-daily-api"

    export API_IMAGE_TAG="$image_tag"
    build_backend
    podman tag "$image_ref:$image_tag" "$image_ref:${ENVIRONMENT}-latest"

    # 2. Push to GHCR
    if [ -n "$GHCR_TOKEN" ]; then
        log "Pushing image to GHCR..."
        echo "$GHCR_TOKEN" | podman login "$GHCR_REGISTRY" -u "$GHCR_USER" --password-stdin
        podman push "$image_ref:$image_tag"
        podman push "$image_ref:${ENVIRONMENT}-latest"
    else
        warn "GHCR_TOKEN not set — skipping push. VPS must have local image."
    fi

    # 3. Copy deploy directory to VPS
    log "Syncing deploy directory to VPS..."
    rsync -avz --delete -e "ssh -i $SSH_KEY" \
        "$SCRIPT_DIR/" \
        "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/"

    # 4. Copy seed data if available
    if [ -d "$REPO_ROOT/database/seed-data" ]; then
        rsync -avz -e "ssh -i $SSH_KEY" \
            "$REPO_ROOT/database/seed-data/" \
            "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/seed-data/"
    fi

    # 5. Deploy on remote VPS
    ssh -i "$SSH_KEY" "$REMOTE_USER@$REMOTE_HOST" <<REMOTE_DEPLOY
        set -e
        cd "$REMOTE_DIR"

        echo "[Remote] Setting up environment..."
        cat > .env <<EOF
SA_PASSWORD=$SA_PASSWORD
JWT_RSA_PRIVATE_KEY=${JWT_RSA_PRIVATE_KEY}
ASPNETCORE_ENVIRONMENT=$([ "$ENVIRONMENT" = "production" ] && echo Production || echo Production)
BYPASS_AUTH=false
API_IMAGE_TAG=${ENVIRONMENT}-latest
EOF

        echo "[Remote] Pulling latest images..."
        export DOCKER_HOST="unix:///run/podman/podman.sock"
        podman-compose -f podman-compose.yml $([ "$ENVIRONMENT" = "production" ] && echo "-f podman-compose.prod.yml") pull api

        echo "[Remote] Starting stack..."
        podman-compose -f podman-compose.yml $([ "$ENVIRONMENT" = "production" ] && echo "-f podman-compose.prod.yml") up -d --remove-orphans

        echo "[Remote] Checking health..."
        sleep 5
        curl -sf http://localhost:5000/api/v1/reading/series/1/today > /dev/null && \
            echo "[Remote] API is healthy" || \
            echo "[Remote] Warning: API health check failed"
REMOTE_DEPLOY

    log "Deployment to $ENVIRONMENT complete!"
}

# ─── Main ────────────────────────────────────────────────────────────────────

case "$1" in
    staging|production|prod)
        deploy_stack
        ;;
    build-backend)
        build_backend
        ;;
    seed-data)
        seed_database
        ;;
    build-android)
        build_android_apk
        ;;
    init-vps)
        init_vps
        ;;
    ssl)
        setup_ssl
        ;;
    *)
        echo "Usage: $0 {staging|production|build-backend|seed-data|build-android|init-vps|ssl}"
        exit 1
        ;;
esac
