# ClearPair 1.0.0 (9): contrast-focused local scoring

All eight standalone apps are available to existing internal testers on
TestFlight and Google Play. Apple reports VALID / IN_BETA_TESTING for every exact
build; Google reports code 9 available internally, with no draft. The
[sanitized receipt](../store/artifacts/internal-beta-1.0.0-9.json) binds signed
hashes, package identities and application source. Build 8's eight iOS formal
submissions remain Waiting for Review, with automatic release after approval
preserved. Build 9 is an internal-test update, not a replacement production
submission. Google production submission remains incomplete. The live PWA was
not deployed.

## What improved

- Quiet short words are measured using active speech, not whole-recording energy
  diluted by trailing silence. Weak consonant onsets and endings are retained.
- The confusing initial, vowel or ending gets more weight than shared sounds.
  Both displayed candidates use one symmetric alignment; switching the target
  does not change which word gets a favourable alignment.
- Clear opposite-word matches give low-score feedback rather than a
  missing-recording message. Silence and indistinguishable reference readings
  still receive no invented score.
- H & F exposes sound evidence, vowel/word match and relative timing. The other
  courses expose word match, the measured contrast and speech duration. The
  recording controls stay above results; technical explanations stay collapsed.
- Cantonese B/P uses verified 標 `biu1` / 飄 `piu1` instead of an ambiguous 波/坡
  pair. Existing recordings keep their frozen words and prompts.

The [algorithm notes](SCORING-UPDATE-20261002.md) explain the FFT/mel features,
bounded alignment, separate tone/mora routes and sentence-mode boundaries.
Scores are experimental local reference-match indices, not calibrated
pronunciation accuracy percentages. An installed offline practice-language
voice is required; PWA scoring and calibrated phoneme grades remain disabled.

## Test access

Use the existing TestFlight invitation and select **1.0.0 (9)**.
Update without uninstalling to retain local recordings. Google internal-test
links remain unchanged:

| App | Google Play internal test |
| --- | --- |
| H & F | [Join](https://play.google.com/apps/internaltest/4700504989515969850) |
| L & R | [Join](https://play.google.com/apps/internaltest/4699964129264422650) |
| English | [Join](https://play.google.com/apps/internaltest/4701515041942561039) |
| Mandarin | [Join](https://play.google.com/apps/internaltest/4701508145131584373) |
| Korean | [Join](https://play.google.com/apps/internaltest/4701552197367057378) |
| Arabic Letters | [Join](https://play.google.com/apps/internaltest/4701081904617178358) |
| Cantonese | [Join](https://play.google.com/apps/internaltest/4700996599031534890) |
| Japanese | [Join](https://play.google.com/apps/internaltest/4701602453248600334) |

Start with H & F: try hat/fat, hit/fit and an opposite word, then speak quietly
and repeat. Check that the waveform appears, pause or tap again to finish, and
replay from History. Missing voices give a setup message, not a fabricated score.

## Build-specific validation

427 unit tests passed (three existing skips), 47 browser regressions passed,
and all eight signed packages passed verification on each platform. All 86
spoken lesson routes passed the actual iOS native reference/worker sweep:
correct/opposite words, both target directions, quiet padded takes, repeats
and silence refusal. The physical MIX2S passed all 46 routes supported by its
installed voices; the other 40 reported unavailable offline voices. Those
language routes passed iOS. These native reference checks do not measure human
microphone pronunciation accuracy.

The exact application source is
`d8273cf8b7d02778a1eb7ad01199ef1d1e29d293`; later test-tool/documentation changes do
not silently replace the signed build. Prior icons, recordings and build-8
artifacts are retained. No recording uploads, pricing, IAP, country or privacy
declaration changes were introduced by this scoring update.
