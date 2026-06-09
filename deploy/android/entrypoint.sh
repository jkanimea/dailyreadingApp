#!/bin/bash
set -euo pipefail

FRONTEND_DIR="/app/frontend"
OUTPUT_DIR="${OUTPUT_DIR:-/output}"
API_URL="${API_URL:-https://mg-encounter.com/api/v1}"

if [ ! -d "$FRONTEND_DIR" ]; then
    echo "ERROR: Mount frontend directory to /app/frontend"
    echo "Usage: podman run --rm -v ./frontend:/app/frontend:ro -v ./output:/output \"
    echo "    localhost/encounter-daily-android-builder"
    exit 1
fi

mkdir -p "$OUTPUT_DIR"

# Copy in pre-installed node_modules
cp -r /node_modules "$FRONTEND_DIR/node_modules"

# Patch API URL in environment
sed -i "s|apiUrl:.*|apiUrl: '$API_URL',|" "$FRONTEND_DIR/src/environments/environment.prod.ts"

# Build Angular
cd "$FRONTEND_DIR"
echo "Building Angular app..."
npx ng build --configuration production

# If Android project doesn't exist, create it
if [ ! -d "$FRONTEND_DIR/android" ]; then
    echo "Adding Android platform..."
    npx cap add android
fi

# Sync web build to native project
echo "Syncing Capacitor..."
npx cap copy android
npx cap sync android

# Configure signing if keystore is provided
if [ -n "${KEYSTORE_PATH:-}" ] && [ -f "$KEYSTORE_PATH" ]; then
    echo "Configuring APK signing..."
    cat > android/signing.gradle <<GRADLE
android {
    signingConfigs {
        release {
            storeFile file("$KEYSTORE_PATH")
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
GRADLE
    echo "apply from: '../signing.gradle'" >> android/app/build.gradle
fi

# Build APK
echo "Building Android APK..."
cd android
./gradlew assembleRelease

# Copy APK to output
cp app/build/outputs/apk/release/app-release.apk "$OUTPUT_DIR/app-release.apk"
cp app/build/outputs/apk/release/app-release.aab "$OUTPUT_DIR/app-release.aab" 2>/dev/null || true

echo "Done! APK at: $OUTPUT_DIR/app-release.apk"
