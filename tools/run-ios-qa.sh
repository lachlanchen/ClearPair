#!/usr/bin/env bash
set -euo pipefail
clearpair_sim=${CLEARPAIR_SIMULATOR_ID:?Set the UUID of the dedicated ClearPairBetaQA simulator}
test "$(uname -s)" = Darwin
if pgrep -x xcodebuild >/dev/null; then echo 'Another Xcode job is active; coordinate first.' >&2; exit 1; fi
xcrun simctl list devices --json | python3 -c 'import json,sys; d=[d for ds in json.load(sys.stdin)["devices"].values() for d in ds if d["udid"]==sys.argv[1]]; assert len(d)==1 and d[0]["name"]=="ClearPairBetaQA"' "$clearpair_sim"
if [ "${CLEARPAIR_QA_PREGENERATED:-0}" = 1 ]; then
  # A portable generated project can be copied from the existing signing host;
  # the audio-test host need not install another Ruby dependency stack.
  test -f .runtime/ios/qa/ClearPairQA.xcodeproj/project.pbxproj
else
  ruby tools/ios-qa/project.rb
fi
xcrun simctl boot "$clearpair_sim"
trap 'xcrun simctl shutdown "$clearpair_sim"' EXIT
xcrun simctl bootstatus "$clearpair_sim" -b
for clearpair_app in handf landr english chinese korean arabic; do
  xcrun simctl install "$clearpair_sim" ".runtime/ios/artifacts/$clearpair_app.app"
done
xcodebuild -project .runtime/ios/qa/ClearPairQA.xcodeproj -scheme ClearPairQA \
  -configuration Debug -destination "id=$clearpair_sim" -derivedDataPath .runtime/ios/qa/DerivedData \
  -resultBundlePath .runtime/ios/qa/Family.xcresult -parallel-testing-enabled NO \
  -jobs 2 CODE_SIGNING_ALLOWED=NO test
