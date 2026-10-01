# Offline Android model diagnostic

This is a separate, debug-only application, **not** a store build or pronunciation
grade. It has no Android permissions and does not use the microphone. The host
must hold the shared Android UI lease before installation, launching or UI input.
Never replace a release app, clear its data or stop another project's mirror.

The package uses an already verified private model export, existing Android SDK,
existing debug signer and packaged ONNX Runtime Web worker. Native experiments use
the official [ONNX Runtime Android 1.30.0 Maven artifact](https://repo.maven.apache.org/maven2/com/microsoft/onnxruntime/onnxruntime-android/1.30.0/).
Its publisher SHA-1 is `656d941369b97c730c4dc963799b159667893a45`; the downloaded
artifact's pinned SHA-256 is
`e7fb945e402205f6db858d65bb78d2bdb0812317b383976c9e3bceb4862c73f1`.
The build refuses a different artifact. The runtime is MIT-licensed; model/data
redistribution and scoring validation remain separate requirements.

Private prerequisites are `.runtime/android-model-qa/deps/onnxruntime-android-1.30.0.aar`
and its `classes.jar` plus `jni/arm64-v8a/` extracted under `deps/ort-1.30.0/`.
Reuse that checked download; never fetch another SDK or model-weight copy.

```sh
bash tools/android-model-qa/build.sh
node --test tools/android-model-qa/memory.test.mjs
# Under the shared device lease, with the exact APK printed by the build:
node tools/android-model-qa/install.mjs DEVICE QA_APK --continue-exact-prompt
node tools/android-model-qa/run.mjs DEVICE QA_APK PRIVATE_NEW_OUTPUT --installed
node tools/android-model-qa/run.mjs DEVICE QA_APK PRIVATE_NEW_OUTPUT --installed --native
node tools/android-model-qa/run.mjs DEVICE QA_APK PRIVATE_NEW_OUTPUT --installed --native --xnnpack
```

The installer may confirm only the observed MIUI dialog naming **ClearPair Offline
QA**, using that dialog's enabled Continue-install control. It never toggles a
security setting. The runner independently checks the installed APK hash, reads
only its own result/log tag, and force-stops only its own helper in `finally`.
Its temporary DevTools forward is removed. No clear-logcat, uninstall or app-data
reset is performed. Evidence stays in ignored `.runtime/`; screenshots can contain
the previous foreground behind an installation prompt and must remain private.

Reported PSS is sampled, not a continuous peak. WebView-renderer ownership requires
the exact package and caller association; unrelated renderers are never included
or stopped. Numerical parity on one human training clip does not establish speaker
accuracy, all-language support, microphone capture, or sustained thermal behavior.
