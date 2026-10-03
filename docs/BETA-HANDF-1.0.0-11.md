# H & F 1.0.0 (11): native offline word scoring

H & F alone is verified available to existing internal testers in **TestFlight
1.0.0 (11)** and [Google Play internal testing](https://play.google.com/apps/internaltest/4700504989515969850).
Apple reports VALID / IN_BETA_TESTING with automatic notifications enabled.
Google reports build 11 available internally, with no draft and the existing
tester list unchanged. The [sanitized receipt](../store/artifacts/internal-beta-handf-1.0.0-11.json)
binds these readbacks to the signed artifacts and exact application source.

The other seven apps and L & N are unchanged. Existing production reviews were
not replaced; build 11 was not submitted for formal review. No PWA deployment,
pricing, IAP, country or privacy-declaration changes were made.

## Focused changes

- Following L & N's architecture, identify the recorded word and assess the
  difficult sound separately; its nasal classifier is not reused for H/F.
- iOS recognizes the saved recording through Apple's offline-only native
  request. Missing assets, denied speech permission or recognition failure
  fall back to bundled native English/Mandarin Vosk, avoiding reliance on
  WebView decoding. No second microphone or audio upload is used.
- Target words are not supplied as recognition hints or a forced-pair grammar.
  Recognized word identity does not fabricate a perfect sound grade. Word-only
  results are capped at 85; unavailable sound details say **Not measured**.
- Captured audio and failed-assessment reasons remain in H & F History.
  Missing pitch/periodicity evidence no longer falsely says recording failed.
- Fresh decoders, matching request IDs, cancellation, bounded timeouts and
  language-model cleanup protect repeated recordings.
- Android retains its bundled offline word decoder and gains the assessment
  feedback/History changes. Final F/V remains acoustic-only on both platforms.

The [algorithm, runtime and provenance notes](HANDF-NATIVE-SCORING-20261003.md)
explain the segmented Fourier features, bundled model licenses and native iOS
library provenance. Scores are experimental practice indices, not calibrated
pronunciation-accuracy percentages. No newly trained classifier is claimed.

## Verified testing

488 H/F-enabled tests passed, with 3 skipped; type checking passed. The Mac mini
compiled the native implementation and passed all **35 saved-PCM regression
rows**, including both candidate directions, quiet takes, repetition after
language switching, silence and an unrelated word. Native Vosk actually ran;
Apple's simulator recognizer failed initialization, exercising the fallback.

The iPhone/iPad archive, export, signature checks and Apple upload validation
passed. All 49 packaged iOS public assets, including 28 native model files,
matched the verified source transfer. Both Android pinned model archives and
all 22 packaged public assets matched the synchronized build.

These tests establish integration and regression behaviour, not human
pronunciation accuracy. The owner's iPhone SE 3 recordings were not retrieved
or heard. Update **without uninstalling** to preserve History, then compare
hat/fat, hit/fit and heat/feet in both directions, quiet speech, a short sentence,
repeated recordings and History replay. Pause or tap Stop to finish.

Application source: `a9f329fb6e3120393d78c9ec9b3c8a39f4ada9e0`.
Later documentation commits do not replace the signed binary source. Prior
icons, recordings, build 10 artifacts and release evidence are preserved.
