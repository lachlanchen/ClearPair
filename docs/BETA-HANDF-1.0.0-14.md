# H & F 1.0.0 (14): per-take recovery and useful captured-speech feedback

H & F build 14 is verified available in **TestFlight 1.0.0 (14)** and
[Google Play internal testing](https://play.google.com/apps/internaltest/4700504989515969850).
Apple reports VALID / IN_BETA_TESTING with automatic tester notifications enabled.
Google reports exact build 14 available internally, with no draft and the existing
tester list unchanged. The [sanitized release receipt](../store/artifacts/internal-beta-handf-1.0.0-14.json)
binds these readbacks to the signed artifacts and exact application source.
Update without uninstalling to keep History.

Only H & F is updated. The other seven apps, L & N, existing formal production
reviews and public web deployment are unchanged. No price, IAP, country or
privacy-declaration changes were made; build 14 is an internal test release.

## Focused changes

- Every saved-audio take rechecks Apple on-device speech support. A transient
  initialization error no longer disables the language until the app restarts.
- Usable partial words survive a request ending with an error, timeout or empty
  final result. Their actual non-final flag and confidence are preserved; they
  are explicitly provisional, with a lower cap of 79. No usable transcript still
  invokes the existing bundled offline decoder on the same PCM.
- iOS initial-H/F word recognition runs before reference synthesis changes the
  audio session. The microphone is not reopened, and old cancellation IDs cannot
  cancel a newer take.
- A nearby one-vowel substitution retaining the onset provides partial content
  feedback, capped at 69, never a perfect whole-word or consonant match. Unrelated
  words, TH insertions and low-confidence bundled guesses remain conservative.
- Recognized word-only results say **Word match**. Their existing cap of 85 is not
  a measured H/F sound grade. Captured uncertain speech shows measured duration
  and actual recognized text when available; collapsed Details separates decoder
  and acoustic state. Recording controls and failed-assessment History audio stay
  in place.

Silence, clipping, unusable input and cancellation do not receive invented scores.
Final F/V stays acoustic-only. English and Mandarin use existing offline models;
there is no cloud recognition, audio upload or selected-target decoder hint.

The [implementation notes](HANDF-RECOVERY-SCORING-20261003.md) explain the recovery
faults, evidence distinctions and score caps. These are inspectable practice
indices, not calibrated human pronunciation-accuracy percentages.

## Verification

512 H/F-enabled tests passed, with 3 skipped; type checking, diff checks and the
11-language README check passed. Tests cover completed versus incomplete partial
words, raw zero confidence, nearby-word bounds, native-before-reference ordering,
repeated-take cancellation, captured-speech diagnostics and all 11 UI languages.

The new Swift source compiled on the Mac mini. All **47 native saved-PCM checks**
passed, including 12 alternating hat/fat cycles, quiet takes, opposite words,
language switching, cancellation/disposal, silence and an unrelated-word control.
The bundled native decoder actually executed; Apple's simulator recognizer was
unavailable. The Apple partial-result policy is covered by unit/native-contract
tests, not claimed as observed on the owner's phone. The owned simulator and
store desktop were closed after evidence capture.

iPhone/iPad archive, export, package checks and Apple upload validation passed.
All 49 iOS public assets and 28 native model files matched verified source, with
no duplicate WASM models. All 22 Android public assets and both pinned model
archives matched the signed bundle.

Native checks used synthesized reference audio, not the owner's microphone or
iPhone SE 3 recordings. They establish integration/regression behaviour, not
learner pronunciation accuracy. Try hat/fat and hit/fit repeatedly without
restarting, quieter speech and History replay. If a take remains uncertain,
Details now shows whether words were recognized and whether the sound measurement
was unavailable. Pause or tap Stop to finish recording.

Application source: `24e63fc908a62ad2010a3d67c3b8d26890f07894`.
Later receipt/documentation commits do not replace the signed binary source.
Prior icons, recordings, source history and signed artifacts are preserved.
