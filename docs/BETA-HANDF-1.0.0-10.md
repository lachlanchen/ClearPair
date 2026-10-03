# H & F 1.0.0 (10): focused scoring update

H & F alone is available to existing internal testers in **TestFlight 1.0.0
(10)** and [Google Play internal testing](https://play.google.com/apps/internaltest/4700504989515969850).
Apple reports VALID / IN_BETA_TESTING, with automatic tester notifications
enabled. Google reports build 10 available internally, with no draft. The
[sanitized receipt](../store/artifacts/internal-beta-handf-1.0.0-10.json) binds
provider readback to both signed packages and their exact application source.

The other seven apps remain on their existing build lane. Existing production
reviews were not replaced, and build 10 was not submitted for formal review.
The PWA was not deployed. No pricing, IAP, country or privacy declarations changed.

## Scoring changes

- Following L & N's architecture, word identity and the difficult sound are
  assessed separately. Its nasal classifier is not reused for H/F.
- Active-speech gain normalization preserves quiet breath/friction and weak
  endings without amplifying silence or changing the original quality checks.
- Segmented Fourier features compare the difficult consonant, vowel fit and
  timing against both candidates. A missing initial sound gets specific
  feedback instead of a false empty-recording message.
- Bundled English/Mandarin word recognition helps uncertain initial H/F words
  and short sentences. It decodes the exact saved recording offline, without
  target-word hints, forced-pair grammar or a second microphone consumer.
- Unrelated recognition text alone cannot penalize a take. Word-only evidence
  does not fabricate a perfect consonant score. Final F/V keeps acoustic grading.
- Fresh decoders, cancellation, timeout/retry, language switching and background
  cleanup prevent evidence from leaking into the next recording.

The offline word helper is enabled on Android and iOS 26.5 or later. Older iOS
retains improved acoustic scoring without initializing the decoder, avoiding
an observed WebKit crash. The two models add approximately 85 MB to H & F only.
Scores remain experimental practice-match indices, not calibrated pronunciation
accuracy percentages. See the [algorithm and evidence notes](HANDF-SCORING-20261003.md).

## Checks and phone testing

469 default unit tests and 75 H/F-enabled focused tests passed; type checking
passed. All 17 native checks passed on the physical MIX2S, all 17 on iOS 26.5
with the decoder, and all 17 on iOS 26.3 with the guarded acoustic fallback.
Both signed packages contain the exact pinned model archives. These native
checks exercise synthesized speech and saved PCM, not live learner microphones.

Update **without uninstalling** to retain recordings. Try hat/fat, hit/fit and
heat/feet in both target directions, Mandarin pairs, quiet speech, a short
sentence, then repeated recordings and History replay. Pause or tap Stop to
finish. Compare the displayed target, recognized words and sound/word values.

Application source: `7d103d30221418aa5baaa8e0e4192488dc8c7560`.
Later receipt/documentation commits do not replace the signed binary source.
Prior icons, recordings and release evidence are preserved.
