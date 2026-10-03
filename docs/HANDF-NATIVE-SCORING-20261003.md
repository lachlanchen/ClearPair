# H & F: native saved-audio word evidence

This is the source for **H & F 1.0.0 (11)** only. Its
[internal-test release receipt](BETA-HANDF-1.0.0-11.md) verifies TestFlight and
Google Play internal availability, not formal review or public release.
The other seven apps retain build 9; L & N source and existing production
reviews are untouched. Build 10 and its
[receipt](BETA-HANDF-1.0.0-10.md) remain historical evidence.

## Design learned from L & N

Identify the recorded word first; assess the difficult sound separately. Do
not reuse L & N's nasal classifier as an H/F classifier. L & N can use Apple's
hosted speech recognition; H & F's new request explicitly prohibits that.

- iOS checks the original saved PCM, then requests final Apple **on-device**
  word recognition. No second microphone, selected-word hints or forced-pair
  grammar is used. Actual Apple confidence, including zero, is retained.
- Missing Apple assets, denied speech permission or recognition failure fall
  back to bundled native Vosk inference. This avoids the WebKit/WASM dependency
  that build 10 disabled on older iOS. Android keeps its existing Vosk adapter.
- Both routes decode the same 16 kHz recording. They do not send audio to a
  server. The native fallback needs no extra speech permission.
- Final Apple word identity can lead an initial H/F content decision even when
  synthetic consonant segmentation disagrees. That sound item becomes **Not
  measured**, rather than incorrect sound coaching or an invented perfect grade.
  Native Vosk retains the conservative confidence/conflict rules from build 10.
- Word-only matches remain capped at 85; opposite words are bounded low.
  Original silence/clipping checks remain intact. Final F/V stays acoustic-only.
- Pitch-estimator failure now says that sound details could not be measured,
  rather than falsely claiming no recording. Failed H/F assessment reasons are
  saved alongside History audio without awarding recall stars.

The existing segmented Fourier features compare consonant spectra relative to
the following vowel, timing, voicing and both reference words. These are designed
practice indices, **not calibrated pronunciation accuracy percentages**.

## Lifecycle and packaged model

Every take has a fresh recognizer and request ID. Stale results/cancellations
cannot replace a successor's result. Native inference is on one serial queue,
not the UI thread; only one language model stays cached. Background/disposal
releases it without interrupting a newer request. Apple failure falls back once,
not recursively through cancellation callbacks. No private WebKit flags are used.

iOS stages unpacked English 0.15 and Mandarin 0.22 weights from the same
[checksum-pinned model ZIPs](../models/hf-words.json), rather than shipping duplicate
compressed copies. Native model files total approximately 133 MiB before IPA
compression. PWA and the other courses do not receive these model resources.

The native C API is Vosk 0.3.50, using a checksum-pinned **unofficial** iOS build
from [santalex/libvosk](https://github.com/santalex/libvosk/releases/tag/v0.3.50).
Its public build recipe and Apache-2.0 license were inspected; this is not a
claim of independent bit-for-bit reproduction. SwiftPM verifies the archive hash.
[Attribution and provenance](../models/licenses/HF-native-NOTICE.txt) ship with
the weights. No newly trained pronunciation grader is claimed.

## Verified checks

The H/F-enabled full suite passed **488 tests, with 3 skipped**; type checking
passed. Tests cover strict tokens, no target bias, confidence provenance, PCM
ownership, cancellation, model retries, original signal checks, failed-assessment
History persistence, translations and H/F-only permission metadata.

The Mac mini's isolated iOS 27 simulator compiled the native implementation and
passed **35/35 saved-PCM regression rows**: all English/Mandarin and final F/V
pairs in both selected directions, quiet takes, repeated recognition after
language switches, silence and an unrelated word. Native Vosk actually ran in
the app; this is not a mocked-bridge test. Source assets and packaged assets
had matching hashes, and model ZIP transfers matched their pinned hashes.

Apple's offline recognizer reported `kLSRErrorDomain:300` (initialization failure)
in this simulator. Its fallback was therefore exercised, **not** falsely marked
as successful Apple recognition. The compile/contract checks cover Apple's
offline-only request; live Apple word recognition still needs phone observation.

These synthesized-reference checks establish native decoding/scoring plumbing,
not human pronunciation accuracy or success on the owner's microphone. The
owner's iPhone SE 3 audio was not retrieved or heard. Preserve those History
recordings for comparison after updating without uninstalling.

Reproduce the runtime probe with `CLEARPAIR_QA_SCOPE=hf-offline node
tools/reference-qa/prepare.mjs`, the isolated project creator, native model staging
and `tools/reference-qa/extract-receipt.py`. Keep raw console/xcresult/phone audio
private; do not commit it as public release evidence.
