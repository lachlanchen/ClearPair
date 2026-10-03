# H & F 1.0.0 (13): repeated-take scoring and useful uncertainty

H & F build 13 is verified available in **TestFlight 1.0.0 (13)** and
[Google Play internal testing](https://play.google.com/apps/internaltest/4700504989515969850).
Apple reports VALID / IN_BETA_TESTING with automatic tester notifications enabled.
Google reports exact build 13 available internally, with no draft and the existing
tester list unchanged. The [sanitized release receipt](../store/artifacts/internal-beta-handf-1.0.0-13.json)
binds these readbacks to the signed artifacts and exact application source.
Update without uninstalling to keep History.

Only H & F is updated. The other seven apps, L & N, existing formal production
reviews and public web deployment are unchanged. No price, IAP, country or
privacy-declaration changes were made; build 13 is an internal test release.

## Focused fixes

- Final native word evidence is considered even when the acoustic score exceeds
  the old threshold. Recognizer confidence requirements are unchanged.
- Measured but ambiguous H/F takes retain their sound, word and timing analysis,
  plus a provisional score capped at 59, instead of a dead-end uncertainty message.
- Confident native word evidence can resolve an unclear comparison. If the
  consonant cannot be measured, its item says **Not measured**. Word-only results
  are capped at 85, and whole-word ratios cannot count twice as sound evidence.
- The native Apple recognizer stays alive for its request. Empty final results
  use the bundled saved-audio decoder rather than discarding a captured recording.
- Cancellation and cleanup are checked across repeated alternating hat/fat takes.
  The existing recording controls and captured History audio are preserved.

Silence, noise, clipping, missing references and unusable recordings remain
ungraded. This update does not manufacture a score for missing evidence. Final
F/V remains acoustic-only. English and Mandarin use existing bundled offline
models; there is no selected-target decoder hint, cloud recognition or audio upload.

The [implementation notes](HANDF-REPEAT-SCORING-20261003.md) explain the gates,
score caps and native lifecycle hardening. These are inspectable practice indices,
not calibrated pronunciation-accuracy percentages or a newly trained grader.

## Verification

500 H/F-enabled tests passed, with 3 skipped; type checking passed. Integration
checks cover 20 successive takes, cancellation, disposal, low-confidence word
evidence, ambiguous measurements and the word-only score cap.

The Mac mini passed all **47 native saved-PCM regression checks**, including 12
additional alternating hat/fat cycles after cancellation and disposal. Bundled
native Vosk actually executed. Apple's simulator recognizer was unavailable,
so these checks exercised the fallback, not live Apple recognition. Short,
validated console chunks protect the completeness of the native QA receipt.

The signed iPhone/iPad archive, export, package checks and Apple upload validation
passed. All 49 iOS public assets and 28 native model files matched verified source.
Both Android pinned model archives and all 22 public assets matched the build.

Native tests used synthesized reference audio, not the owner's microphone or
iPhone SE 3 recordings. They establish integration/regression behaviour, not
human pronunciation accuracy. After updating, try hat/fat repeatedly in both
directions without restarting, quieter speech and History replay. Pause or tap
Stop to finish recording.

Application source: `e40fd848a61922b629b042a2962870b194d02d7d`.
Later receipt/documentation commits do not replace the signed binary source.
Prior icons, recordings, source history and signed artifacts are preserved.
