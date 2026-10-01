#!/usr/bin/env bash
set -euo pipefail
project_root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)
cd "$project_root"
sdk_root=/home/lachlan/Android/Sdk
build_tools="$sdk_root/build-tools/35.0.0"
android_jar="$sdk_root/platforms/android-35/android.jar"
java_bin=/home/lachlan/.sdkman/candidates/java/current/bin
debug_key=/home/lachlan/.android/debug.keystore
ort_aar="$project_root/.runtime/android-model-qa/deps/onnxruntime-android-1.30.0.aar"
ort_dir="$project_root/.runtime/android-model-qa/deps/ort-1.30.0"
test "$(sha256sum "$ort_aar" | cut -d ' ' -f1)" = e7fb945e402205f6db858d65bb78d2bdb0812317b383976c9e3bceb4862c73f1
test -f "$ort_dir/classes.jar"
test -f "$debug_key"
mkdir -p .runtime/android-model-qa
build_dir=$(mktemp -d "$project_root/.runtime/android-model-qa/build-XXXXXXXX")
node tools/android-model-qa/prepare.mjs "$build_dir"
mkdir -p "$build_dir/classes" "$build_dir/dex"
"$build_tools/aapt2" link -o "$build_dir/resources.ap_" --manifest tools/android-model-qa/AndroidManifest.xml \
  -I "$android_jar" -A "$build_dir/assets" -0 onnx
"$java_bin/javac" -source 8 -target 8 -bootclasspath "$android_jar" -encoding UTF-8 \
  -classpath "$ort_dir/classes.jar" -d "$build_dir/classes" tools/android-model-qa/ModelActivity.java tools/android-model-qa/NativeProbe.java
mapfile -t classes < <(find "$build_dir/classes" -name '*.class' -type f)
"$build_tools/d8" --min-api 23 --lib "$android_jar" --output "$build_dir/dex" "${classes[@]}" "$ort_dir/classes.jar"
cp "$build_dir/resources.ap_" "$build_dir/unsigned.apk"
zip -q -j "$build_dir/unsigned.apk" "$build_dir/dex/classes.dex"
mkdir -p "$build_dir/lib/arm64-v8a"
ln "$ort_dir/jni/arm64-v8a/libonnxruntime.so" "$build_dir/lib/arm64-v8a/libonnxruntime.so"
ln "$ort_dir/jni/arm64-v8a/libonnxruntime4j_jni.so" "$build_dir/lib/arm64-v8a/libonnxruntime4j_jni.so"
(cd "$build_dir" && zip -q unsigned.apk lib/arm64-v8a/*.so)
"$build_tools/zipalign" -p 4 "$build_dir/unsigned.apk" "$build_dir/aligned.apk"
"$build_tools/apksigner" sign --ks "$debug_key" --ks-key-alias androiddebugkey \
  --ks-pass pass:android --key-pass pass:android --out "$build_dir/clearpair-offline-qa.apk" "$build_dir/aligned.apk"
"$build_tools/apksigner" verify --verbose "$build_dir/clearpair-offline-qa.apk"
"$build_tools/aapt2" dump permissions "$build_dir/clearpair-offline-qa.apk"
sha256sum "$build_dir/clearpair-offline-qa.apk"
printf 'QA_APK=%s\n' "$build_dir/clearpair-offline-qa.apk"
