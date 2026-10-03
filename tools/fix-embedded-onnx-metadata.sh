#!/usr/bin/env bash
set -euo pipefail
# Pinned onnxruntime-libs 1.28.2: the iOS binary has minos 15.0, but its
# supplied framework plist incorrectly says 13.0 (Apple ITMS-90208).
# Run AFTER framework embedding and BEFORE Xcode signs the enclosing app.
clearpair_runtime="${TARGET_BUILD_DIR:?}/${FRAMEWORKS_FOLDER_PATH:?}/onnxruntime.framework"
test -f "$clearpair_runtime/Info.plist"
clearpair_declared=$(/usr/libexec/PlistBuddy -c 'Print MinimumOSVersion' "$clearpair_runtime/Info.plist")
clearpair_compiled=$(xcrun vtool -show-build "$clearpair_runtime/onnxruntime" | awk '/minos/{print $2}')
test "$clearpair_compiled" = '15.0'
case "$clearpair_declared" in
13.0) /usr/libexec/PlistBuddy -c 'Set MinimumOSVersion 15.0' "$clearpair_runtime/Info.plist" ;;
15.0) ;;
*) echo 'Unexpected pinned ONNX framework metadata; stop before distribution.' >&2; exit 1 ;;
esac
if test "${CODE_SIGNING_ALLOWED:-YES}" != NO; then
  test -n "${EXPANDED_CODE_SIGN_IDENTITY:-}"
  codesign --force --sign "$EXPANDED_CODE_SIGN_IDENTITY" --preserve-metadata=identifier,entitlements \
    --timestamp=none --keychain "${CLEARPAIR_SIGNING_KEYCHAIN:?}" "$clearpair_runtime"
fi
