#!/bin/bash
set -euo pipefail

FRONTEND_DIR="/app/frontend"
OUTPUT_DIR="${OUTPUT_DIR:-/output}"
API_URL="${API_URL:-https://mg-encounter.com/api/v1}"

if [ ! -d "$FRONTEND_DIR" ]; then
    echo "ERROR: Mount frontend directory to /app/frontend"
    echo "Usage: podman run --rm -v ./frontend:/app/frontend -v ./output:/output"
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
npm run build -- --configuration production

# If Android project doesn't exist, create it
if [ ! -d "$FRONTEND_DIR/android" ]; then
    echo "Adding Android platform..."
    npx cap add android
fi

# Copy custom adaptive icon (reading book vector drawable) + generate PNG fallbacks
echo "Copying custom Android icons..."
node "$FRONTEND_DIR/scripts/copy-android-icon.mjs"

# Sync web build to native project (icons are already in place)
echo "Syncing Capacitor..."
npx cap copy android
npx cap sync android

# Patch MainActivity.java for @capgo/capacitor-social-login
MAIN_ACTIVITY="android/app/src/main/java/com/dailyreading/app/MainActivity.java"
if [ -f "$MAIN_ACTIVITY" ]; then
    cat > "$MAIN_ACTIVITY" << 'JAVAEOF'
package com.dailyreading.app;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.PluginHandle;
import com.getcapacitor.Plugin;
import android.content.Intent;
import android.util.Log;

import ee.forgr.capacitor.social.login.GoogleProvider;
import ee.forgr.capacitor.social.login.SocialLoginPlugin;
import ee.forgr.capacitor.social.login.ModifiedMainActivityForSocialLoginPlugin;

public class MainActivity extends BridgeActivity implements ModifiedMainActivityForSocialLoginPlugin {

    @Override
    public void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        if (requestCode >= GoogleProvider.REQUEST_AUTHORIZE_GOOGLE_MIN && requestCode < GoogleProvider.REQUEST_AUTHORIZE_GOOGLE_MAX) {
            PluginHandle pluginHandle = getBridge().getPlugin("SocialLogin");
            if (pluginHandle == null) {
                Log.i("Google Activity Result", "SocialLogin login handle is null");
                return;
            }
            Plugin plugin = pluginHandle.getInstance();
            if (!(plugin instanceof SocialLoginPlugin)) {
                Log.i("Google Activity Result", "SocialLogin plugin instance is not SocialLoginPlugin");
                return;
            }
            ((SocialLoginPlugin) plugin).handleGoogleLoginIntent(requestCode, data);
        }
    }

    public void IHaveModifiedTheMainActivityForTheUseWithSocialLoginPlugin() {}
}
JAVAEOF
    echo "MainActivity.java patched for @capgo/capacitor-social-login"
fi

# Inject google-services.json for native Google Sign-In
if [ -n "${GOOGLE_SERVICES_JSON:-}" ]; then
    echo "Injecting google-services.json..."
    printf '%s\n' "$GOOGLE_SERVICES_JSON" > android/app/google-services.json

    # Add Google services Gradle plugin to project-level build.gradle
    if ! grep -q 'google-services' android/build.gradle 2>/dev/null; then
        sed -i "s|dependencies {|dependencies {\n        classpath 'com.google.gms:google-services:4.4.2'|" android/build.gradle
    fi

    # Apply Google services plugin in app-level build.gradle
    if ! grep -q 'google-services' android/app/build.gradle 2>/dev/null; then
        echo "apply plugin: 'com.google.gms.google-services'" >> android/app/build.gradle
    fi
else
    echo "WARNING: GOOGLE_SERVICES_JSON not set — native Google Sign-In will not work"
fi

# Configure signing if keystore is provided
if [ -n "${KEYSTORE_PATH:-}" ] && [ -f "$KEYSTORE_PATH" ]; then
    if [ ! -s "$KEYSTORE_PATH" ]; then
        echo "ERROR: Keystore file is empty or missing at $KEYSTORE_PATH — check the KEYSTORE secret"
        exit 1
    fi

    # Extract key hashes from release keystore
    echo "Extracting key hashes from release keystore..."
    KEY_HASH=$(keytool -exportcert -alias release -keystore "$KEYSTORE_PATH" -storepass "$KEYSTORE_PASSWORD" 2>/dev/null | openssl sha1 -binary | openssl base64)
    SHA1_FP=$(keytool -list -v -alias release -keystore "$KEYSTORE_PATH" -storepass "$KEYSTORE_PASSWORD" 2>/dev/null | grep 'SHA1:' | awk '{print $2}')
    SHA256_FP=$(keytool -list -v -alias release -keystore "$KEYSTORE_PATH" -storepass "$KEYSTORE_PASSWORD" 2>/dev/null | grep 'SHA256:' | awk '{print $2}')
    echo "=== ANDROID CERTIFICATE FINGERPRINTS ==="
    echo "SHA1: $SHA1_FP"
    echo "SHA256: $SHA256_FP"
    echo "Facebook Key Hash: $KEY_HASH"
    echo "========================================"
    echo "Add SHA1 + SHA256 above to Google Cloud Console -> Credentials -> Android OAuth client"
    echo "Also add Play App Signing SHA1 from Google Play Console -> App integrity -> App signing key certificate"
    echo "Facebook Key Hash -> https://developers.facebook.com -> Settings -> Basic -> Android -> Key Hashes"

    # Fail the build if the release SHA-1 is not registered in google-services.json.
    # Android's Credential Manager reports "Google Sign-In cancelled by user" when a
    # user taps an authenticated account whose signing certificate SHA-1 is missing
    # from the Android OAuth client — so refuse to ship an APK whose Google Sign-In
    # cannot work.
    if [ -f android/app/google-services.json ]; then
        RELEASE_SHA1=$(printf '%s' "$SHA1_FP" | tr -d ':' | tr '[:upper:]' '[:lower:]')
        if [ -n "$RELEASE_SHA1" ] && grep -qF "$RELEASE_SHA1" android/app/google-services.json; then
            echo "OK: release SHA-1 ($RELEASE_SHA1) is registered in google-services.json"
        else
            echo "ERROR: release SHA-1 ($RELEASE_SHA1) is NOT registered in android/app/google-services.json."
            echo "  This causes 'Google Sign-In cancelled by user' when tapping an authenticated account."
            echo "  Fix: Google Cloud Console -> Credentials -> Android OAuth client -> add SHA-1: $SHA1_FP"
            echo "  (plus the Play App Signing SHA-1 from Play Console -> App integrity -> App signing key)."
            echo "  Then re-download google-services.json and update the GOOGLE_SERVICES_JSON secret."
            echo "  https://console.cloud.google.com/apis/credentials"
            exit 1
        fi
    else
        echo "WARNING: android/app/google-services.json not found — skipping SHA-1 verification."
    fi

    echo "Configuring APK/AAB signing..."
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

# Set dynamic versionCode from CI build number
if [ -n "${VERSION:-}" ]; then
    echo "Setting versionCode to $VERSION..."
    sed -i "s/versionCode [0-9]*/versionCode $VERSION/" android/app/build.gradle
    # Also set a human-friendly versionName
    sed -i "s/versionName \"[^\"]*\"/versionName \"1.0.$VERSION\"/" android/app/build.gradle
fi

# Inject Facebook SDK config into strings.xml for native Android
FB_STRINGS="android/app/src/main/res/values/facebook-strings.xml"
FB_CLIENT_TOKEN="${FACEBOOK_CLIENT_TOKEN:-5ebf47a6cc789c1e3e02f964739e1e58}"
if [ ! -f "$FB_STRINGS" ]; then
    cat > "$FB_STRINGS" << XMLEOF
<?xml version='1.0' encoding='utf-8'?>
<resources>
    <string name="facebook_app_id">1510105297476514</string>
    <string name="fb_login_protocol_scheme">fb1510105297476514</string>
    <string name="facebook_client_token">$FB_CLIENT_TOKEN</string>
</resources>
XMLEOF
    echo "Facebook strings.xml injected for native Facebook login"
fi

# Patch Facebook OAuth intent filter into AndroidManifest.xml
MANIFEST="android/app/src/main/AndroidManifest.xml"
if [ -f "$MANIFEST" ] && ! grep -q 'fb1510105297476514' "$MANIFEST" 2>/dev/null; then
    node -e "
const fs = require('fs');
const xml = fs.readFileSync('$MANIFEST', 'utf8');
const updated = xml.replace(
    /(<activity\\b[^>]*?>[\\s\\S]*?<\\/intent-filter>)(\\s*<\\/activity>)/,
    (_, before, after) => before + \`
        <intent-filter>
            <action android:name=\"android.intent.action.VIEW\" />
            <category android:name=\"android.intent.category.DEFAULT\" />
            <category android:name=\"android.intent.category.BROWSABLE\" />
            <data android:scheme=\"fb1510105297476514\" />
        </intent-filter>\` + after
);
fs.writeFileSync('$MANIFEST', updated, 'utf8');
"
    echo "Facebook intent filter patched into AndroidManifest.xml"
fi

# Remove unused Advertising ID permission so the Play declaration ("app does not use advertising ID") matches the manifest
if [ -f "$MANIFEST" ] && ! grep -q 'tools:node="remove"' "$MANIFEST" 2>/dev/null; then
    node -e "
const fs = require('fs');
const xml = fs.readFileSync('$MANIFEST', 'utf8');
let updated = xml;
if (!updated.includes('xmlns:tools=')) {
    updated = updated.replace(
        /<manifest\\b([^>]*?)\\s*>/,
        '<manifest\$1 xmlns:tools=\"http://schemas.android.com/tools\">'
    );
}
const removals = \`
    <uses-permission android:name=\"com.google.android.gms.permission.AD_ID\" tools:node=\"remove\" />
    <uses-permission android:name=\"android.permission.ACCESS_ADSERVICES_AD_ID\" tools:node=\"remove\" />
    <uses-permission android:name=\"android.permission.ACCESS_ADSERVICES_ATTRIBUTION\" tools:node=\"remove\" />
    <uses-permission android:name=\"android.permission.ACCESS_ADSERVICES_CUSTOM_AUDIENCE\" tools:node=\"remove\" />
    <uses-permission android:name=\"android.permission.ACCESS_ADSERVICES_TOPICS\" tools:node=\"remove\" />\`;
updated = updated.replace(/\\s*<\\/manifest>\\s*\$/, removals + '\n</manifest>\n');
fs.writeFileSync('$MANIFEST', updated, 'utf8');
"
    echo "Advertising ID + ad-services permissions removed from AndroidManifest.xml (tools:node=remove)"
fi

# Build APK + AAB
echo "Building Android APK and AAB..."
cd android
./gradlew assembleRelease bundleRelease

# Copy APK and AAB to output
cp app/build/outputs/apk/release/app-release.apk "$OUTPUT_DIR/app-release.apk"
cp app/build/outputs/bundle/release/app-release.aab "$OUTPUT_DIR/app-release.aab" 2>/dev/null || true

echo "Done! APK at: $OUTPUT_DIR/app-release.apk | AAB at: $OUTPUT_DIR/app-release.aab"
