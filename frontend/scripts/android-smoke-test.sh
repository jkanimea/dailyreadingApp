#!/bin/bash
# Android device smoke test.
#
# Installs the APK, launches the app, and verifies:
#   1. Install succeeds
#   2. Launch does not crash (no FATAL exception)
#   3. The login screen renders ("SIGN IN WITH GOOGLE" is present)
#   4. Tapping "Sign in with Google" produces a valid Credential Manager request
#      (the Google ID-token option passes GMS filtering). A stale/wrong
#      GOOGLE_WEB_CLIENT_ID fails this check — the option is rejected before the
#      account picker, which is the exact regression behind
#      "Google Sign-In cancelled by user".
#
# This does NOT require a Google account on the device, so it runs cleanly in CI.
#
# Usage: android-smoke-test.sh <apk> [device-serial]

set -euo pipefail

APK="${1:?usage: android-smoke-test.sh <apk> [serial]}"
SERIAL="${2:-emulator-5580}"

adb() { command adb -s "$SERIAL" "$@"; }

fail() { echo "FAIL: $*" >&2; exit 1; }

echo "==> Installing $APK"
adb install -r "$APK" >/dev/null || fail "install failed"

echo "==> Clearing logcat"
adb logcat -c >/dev/null 2>&1 || true

echo "==> Clearing app data (force fresh login screen)"
adb shell pm clear com.dailyreading.app >/dev/null || true

echo "==> Launching app"
adb shell am start -n com.dailyreading.app/.MainActivity >/dev/null

echo "==> Check 1: no crash on launch"
sleep 5
if adb logcat -d 2>/dev/null | grep -q 'FATAL EXCEPTION'; then
  adb logcat -d 2>/dev/null | grep -A20 'FATAL EXCEPTION'
  fail "app crashed on launch"
fi
echo "    ok"

echo "==> Check 2: login screen renders (polling up to 30s)"
UI=""
for i in $(seq 1 15); do
  adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1 || true
  UI=$(adb shell cat /sdcard/ui.xml 2>/dev/null || true)
  if printf '%s' "$UI" | grep -q 'SIGN IN WITH GOOGLE'; then
    break
  fi
  sleep 2
done
if ! printf '%s' "$UI" | grep -q 'SIGN IN WITH GOOGLE'; then
  fail "'SIGN IN WITH GOOGLE' button not found on login screen"
fi
echo "    ok"

echo "==> Check 3: tapping Sign in with Google yields a valid credential request"
NODE=$(printf '%s' "$UI" | grep -oE '<node [^>]*text="SIGN IN WITH GOOGLE"[^>]*>' | head -1)
BOUNDS=$(printf '%s' "$NODE" | grep -oE 'bounds="\[[0-9]+,[0-9]+\]\[[0-9]+,[0-9]+\]"' | head -1)
CENTER=$(printf '%s' "$BOUNDS" | python3 -c "import sys,re; m=re.findall(r'\[(\d+),(\d+)\]\[(\d+),(\d+)\]', sys.stdin.read()); x1,y1,x2,y2=map(int,m[0]); print((x1+x2)//2,(y1+y2)//2)")
echo "    tapping at $CENTER"
adb shell input tap $CENTER >/dev/null
sleep 6

LOGCAT=$(adb logcat -d 2>/dev/null || true)
if printf '%s' "$LOGCAT" | grep -qE 'TYPE_GOOGLE_ID_TOKEN_CREDENTIAL meets all filtering'; then
  echo "    ok — credential option accepted by GMS (client ID is valid)"
else
  echo "    logcat (relevant lines):"
  printf '%s' "$LOGCAT" | grep -iE 'GoogleProvider|CredMan|GetCredential|filtering|credentials' | tail -20
  fail "Google credential request was not accepted (possible stale GOOGLE_WEB_CLIENT_ID)"
fi

echo "SMOKE TEST PASSED"
