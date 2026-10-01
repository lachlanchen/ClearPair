#!/usr/bin/env bash
set -euo pipefail
# Run from the ClearPair checkout on an existing Xcode Mac. No signing or store actions.
if [[ "$(uname -s)" != Darwin ]]; then
  echo 'This command needs an Xcode Mac.' >&2
  exit 1
fi
if pgrep -x xcodebuild >/dev/null; then
  echo 'Another Xcode build is active. Coordinate before starting ClearPair.' >&2
  exit 1
fi
mkdir -p .runtime/ios/artifacts
for clearpair_app in handf landr english chinese korean arabic cantonese japanese; do
  xcodebuild -project "native/apps/$clearpair_app/ios/App/App.xcodeproj" \
    -scheme App -configuration Debug -destination 'generic/platform=iOS Simulator' \
    -derivedDataPath .runtime/ios/family \
    -clonedSourcePackagesDirPath .runtime/ios/handf/SourcePackages \
    -jobs 2 CODE_SIGNING_ALLOWED=NO build > ".runtime/ios/$clearpair_app-family.log" 2>&1
  mkdir -p ".runtime/ios/artifacts/$clearpair_app.app"
  rsync -a --delete .runtime/ios/family/Build/Products/Debug-iphonesimulator/App.app/ \
    ".runtime/ios/artifacts/$clearpair_app.app/"
  # These unsigned simulator artifacts must not retain obsolete web resources.
  rsync -a --delete "native/apps/$clearpair_app/ios/App/App/public/" \
    ".runtime/ios/artifacts/$clearpair_app.app/public/"
  /usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' ".runtime/ios/artifacts/$clearpair_app.app/Info.plist"
  echo "$clearpair_app: unsigned simulator build passed"
done
