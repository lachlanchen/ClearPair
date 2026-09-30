#!/usr/bin/env bash
set -euo pipefail
clearpair_app=${1:?Pass one ClearPair app ID}
case "$clearpair_app" in handf|landr|english|chinese|korean|arabic) ;; *) exit 2 ;; esac
test "$(uname -s)" = Darwin
if pgrep -x xcodebuild >/dev/null; then echo 'Another Xcode job is active; coordinate first.' >&2; exit 1; fi
: "${CLEARPAIR_TEAM_ID:?}" "${CLEARPAIR_PROFILE:?}" "${CLEARPAIR_SIGNING_KEYCHAIN:?}"
clearpair_output="$PWD/.runtime/ios/release/$clearpair_app"
mkdir -p "$clearpair_output"
case "${2:-archive}" in
archive)
  test ! -e "$clearpair_output/App.xcarchive"
  xcodebuild -project "native/apps/$clearpair_app/ios/App/App.xcodeproj" \
    -scheme App -configuration Release -destination 'generic/platform=iOS' \
    -archivePath "$clearpair_output/App.xcarchive" -derivedDataPath .runtime/ios/release/DerivedData \
    -clonedSourcePackagesDirPath .runtime/ios/handf/SourcePackages -jobs 2 \
    DEVELOPMENT_TEAM="$CLEARPAIR_TEAM_ID" CODE_SIGN_STYLE=Manual \
    CODE_SIGN_IDENTITY='Apple Distribution' PROVISIONING_PROFILE_SPECIFIER="$CLEARPAIR_PROFILE" \
    "OTHER_CODE_SIGN_FLAGS=--keychain $CLEARPAIR_SIGNING_KEYCHAIN" \
    COMPILER_INDEX_STORE_ENABLE=NO archive
  ;;
export)
  test -f "$clearpair_output/ExportOptions.plist"
  xcodebuild -exportArchive -archivePath "$clearpair_output/App.xcarchive" \
    -exportOptionsPlist "$clearpair_output/ExportOptions.plist" -exportPath "$clearpair_output/export"
  codesign --verify --deep --strict "$clearpair_output/App.xcarchive/Products/Applications/App.app"
  shasum -a 256 "$clearpair_output/export/App.ipa"
  ;;
*) exit 2 ;;
esac
