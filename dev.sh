#!/usr/bin/env bash
#
# Local development launcher for macOS — a port of dev.ps1.
#
# Starts:
#   - Backend API on http://localhost:5000   (dotnet run)
#   - Frontend   on https://localhost:4200   (npx ionic serve --ssl, proxies /api -> :5000)
#
# Usage:
#   ./dev.sh                   # start backend + frontend
#   ./dev.sh --backend-only    # start only the backend API
#   ./dev.sh --frontend-only   # start only the frontend (backend assumed running)
#
# macOS prerequisites:
#   1. .NET 10 SDK — usually installed to ~/.dotnet; this script adds it to PATH.
#   2. SQL Server reachable from localhost (via Podman):
#        brew install podman podman-compose
#        podman machine init && podman machine start
#        podman-compose -f podman-compose.yml up -d sqlserver
#      Then add backend/EncounterDaily.API/appsettings.Development.json
#      (gitignored) with:
#        { "ConnectionStrings": { "DefaultConnection":
#            "Server=localhost,1433;Database=EncounterDaily;User Id=sa;Password=YourStrong@Passw0rd;TrustServerCertificate=True;" },
#          "DevMode": { "BypassAuth": true } }

set -uo pipefail

usage() {
  sed -n '3,15p' "$0" | sed 's/^# \{0,1\}//'
  exit "${1:-0}"
}

BACKEND_ONLY=false
FRONTEND_ONLY=false

for arg in "$@"; do
  case "$arg" in
    --backend-only | -b)  BACKEND_ONLY=true ;;
    --frontend-only | -f) FRONTEND_ONLY=true ;;
    -h | --help)          usage 0 ;;
    *)                     echo "Unknown option: $arg" >&2; usage 1 ;;
  esac
done

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT/backend/EncounterDaily.API"
FRONTEND_DIR="$ROOT/frontend"

# Make a user-local .NET SDK install discoverable (common on macOS).
if ! command -v dotnet >/dev/null 2>&1; then
  for candidate in "$HOME/.dotnet" "$HOME/.dotnet/dotnet" /usr/local/share/dotnet /opt/homebrew/share/dotnet; do
    if [ -x "$candidate/dotnet" ]; then
      export PATH="$candidate:$PATH"
      break
    fi
  done
fi

PIDS=()

cleanup() {
  echo
  echo ">>> Stopping dev servers..."
  if [ ${#PIDS[@]} -gt 0 ]; then
    kill "${PIDS[@]}" 2>/dev/null
    sleep 1
    kill -9 "${PIDS[@]}" 2>/dev/null
  fi
}

trap cleanup EXIT INT TERM

if [ "$FRONTEND_ONLY" != true ]; then
  if ! command -v dotnet >/dev/null 2>&1; then
    echo "ERROR: 'dotnet' not found on PATH. Install the .NET 10 SDK and reload your shell." >&2
    exit 1
  fi
  echo ">>> Starting backend API on http://localhost:5000 ..."
  (cd "$BACKEND_DIR" && dotnet run --project "$BACKEND_DIR" --urls "http://0.0.0.0:5000") &
  PIDS+=($!)
  echo ">>> Waiting 5s for the backend to warm up..."
  sleep 5
fi

if [ "$BACKEND_ONLY" != true ]; then
  echo ">>> Starting frontend on https://localhost:4200 ..."
  (cd "$FRONTEND_DIR" && npx --yes ionic serve --ssl --host 0.0.0.0 --port 4200) &
  PIDS+=($!)
fi

if [ "$BACKEND_ONLY" = true ]; then
  echo ">>> Backend running. Press Ctrl+C to stop."
else
  echo ">>> Both servers running. Press Ctrl+C to stop."
fi

wait