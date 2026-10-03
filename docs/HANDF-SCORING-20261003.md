# H & F: word evidence and difficult-sound evidence

This is an **H & F-only build-10 candidate**, not an update to the other seven
apps. Build 9 remains their release identity. Availability is recorded separately
after provider readback; this document does not claim an upload or review.

## What changed

L & N's useful architecture is separation: identify the word, then explain the
difficult consonant. Its nasal network is not an H/F classifier and is not reused.

1. Analyse the exact saved recording; do not open a second microphone consumer.
2. Check silence, clipping and availability on the original PCM. For H/F feature
   extraction only, normalize against active-frame energy, not trailing silence.
   Weak breath/friction no longer disappears merely because recording gain falls.
3. Keep the segmented FFT, consonant-relative-to-vowel spectra, timing and voicing
   comparison. A shared vowel fitting with no initial consonant gives bounded
   missing-consonant feedback, not an empty-recording claim.
4. For uncertain, unaligned, low-match or carrier-sentence initial H/F takes, run
   a bundled unrestricted English or Mandarin Vosk decoder. No selected-word
   prompt, forced two-word grammar, server request or cloud fallback is used.
5. Fuse content and sound conservatively. A recognized opposite word is bounded
   low. An unrelated transcript alone cannot penalize a correct short take; both
   acoustic references must also be rejected. Existing strong isolated acoustic
   matches stay unchanged. Unknown evidence does not become a constant score.

The UI distinguishes recognized words, word match and measured sound. A word-only
result is capped at 85 and marks the consonant **Uncertain**, not 100/100. Technical
explanations remain collapsed below the fixed recording controls. Added labels
are translated in all eleven UI languages. These are designed practice indices,
**not calibrated pronunciation accuracy percentages**.

Final F/V keeps its acoustic route. The unrestricted word model systematically
confused final F/V spellings in synthetic checks, so lexical grading is excluded
there. Input gain normalization still improves its quiet-word handling.

## Local model and compatibility boundary

The official [Vosk model catalogue](https://alphacephei.com/vosk/models) supplies
small English 0.15 and Mandarin 0.22 models under Apache-2.0. Source ZIP hashes,
reproducible package hashes and sizes are pinned in
[the model manifest](../models/hf-words.json). The browser adapter is pinned to
`vosk-browser@0.0.8`. These are pretrained word-recognition models, not a newly
trained H/F pronunciation grader. Original research weights are not bundled.

The two compressed archives add approximately 85 MB to H & F's native payload.
Only one language model is retained in memory. Each take gets a fresh decoder;
cancellation, backgrounding, timeout and language switching release owned work.
Archives use `.vosk` filenames: Android packaging otherwise gunzips `.gz` assets
and silently changes their names and bytes. Package checks verify the pinned
model bytes. Other apps and the PWA do not receive this model payload.

The decoder is enabled on Android and iOS 26.5 or later. Older iOS retains the
improved acoustic scorer without initializing WebAssembly. The iOS 26.3
simulator repeatedly crashed inside WebKit's signaling-memory handler; a
compatibility guard avoids that unqualified route. No private WebKit settings,
new microphone permissions or recording uploads are introduced.

To reproduce native staging on Linux, keep the two official ZIPs and extracted
folders named in the manifest under `.runtime/reference-qa/vosk-models/`, then
run `node tools/hf-word-models.mjs`. The stager checks source and archive hashes
and uses deterministic GNU tar options. Model weights, downloaded speech,
browser profiles and private test receipts are intentionally not tracked.

## Development evidence

The human regression contains 72 expert-high training-corpus word crops from
42 speakers, mostly the word “he.” Cached alignment proposes boundaries; expert
labels identify the words. It is sparse on actual course words, has no Mandarin
learner-error set, and is **not** an independent accuracy certification. The
official corpus test split was not used or tuned against.

Compared with the prior acoustic-only route on this fixture, the final hybrid
candidate scored 31 rather than 13 crops. Correct-word high matches rose from
3 to 19; low scores on correct words fell from 7 to 4. One high score on an
opposite word remains in both routes. None of the seven unrelated-word, omission or silence controls
received a high grade. These are diagnostic counts, not a general accuracy rate.

Rejected spectral-projection and phoneme-decoder experiments were preserved
privately but are not routed. A generic model's confidence is not treated as
proof of correct pronunciation. See [the separate H/F training experiment](HF-MODEL-DEVELOPMENT.md).

The focused suite covers gain changes, missing/opposite sounds, strict word
tokens, exact homophones, uncertain ASR, cancellation, transferred PCM ownership,
fresh decoders, model failure/retry, language switching and the older-iOS guard.
Native QA uses actual device voices, saved PCM, the offline decoder and scoring
code. These tests do not measure live microphone learner accuracy.

Final native receipts passed 17/17 checks on the physical MIX2S, 17/17 with the
decoder on iOS 26.5, and 17/17 with the decoder safely disabled on iOS 26.3.
The full default suite passed 469 tests (eight skips, including five tests
requiring the native H/F build flag); that enabled integration suite is also run
separately. Type checking passed. Neither a provider upload nor a production
review is implied by these results.

For the next phone test, update without uninstalling. Try hat/fat, hit/fit and
heat/feet in both directions, all Mandarin pairs, quiet speech and the optional
short sentence. Pause or tap Stop, then repeat and replay from History. Report
the displayed word, recognized text and sound/word values together.
