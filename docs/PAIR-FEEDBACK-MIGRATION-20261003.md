# Word evidence and contrast feedback migration

H & F build 15 remains the owner-approved baseline. Its scoring path and current
store binary are preserved; the other courses use a separate hybrid adapter.

## Implemented in source

- Recognize the same saved recording before reference synthesis; never start a
  second microphone or send the recording to a server.
- Retain actual text, raw confidence, final/provisional state and engine/locale.
- Distinguish the selected word, displayed partner, different content, mixed
  content, and disagreement between lexical and acoustic observations.
- Keep word identity separate from the aligned initial, vowel, ending, tone,
  timing or letter-name task. Word-only evidence does not become a fabricated
  consonant/phoneme measurement.
- Preserve a strongly measured contrast when ASR collapses both displayed
  pronunciations to the same spelling. Disagreement stays visible and capped;
  a recognized target word cannot hide a measured opposite sound.
- Show a compact, consistent word/contrast/duration row and a labelled pair
  comparison. Keep the centered recording control above results, without the
  distracting visible timer. Internal duration and pause detection remain.
- Preserve failed assessment diagnostics alongside recordings in History.
- Per-app practice-language allowlists; Mandarin is never substituted for Yue.
- Native Android decoding reuses one model and creates a new recognizer per
  take. The pair apps do not retry a missing WASM model after a native failure.
- Relative tone-shape evidence is measured and plotted separately. Centered
  flat tones do not establish absolute high/mid/low register. Empty standalone
  letter/kana transcripts retain measured sound feedback with a provisional cap.

## Earlier qualification checkpoint

| Course | Word-model route | Evidence |
| --- | --- | --- |
| L & R | Apple on-device / pinned English Vosk fallback; native Android Vosk | Fresh 55/55 native saved-PCM checks on both the Mac mini and physical MIX 2S, including both directions of every pair, quieter speech, repeat/cancel/dispose and silence |
| English | Same English route; own contrast profiles | 169/169 native Android checks after fixing collapsed ASR spellings. Initial iOS run 163/169; saved-evidence re-scoring resolves all six failures; fresh iOS check pending |
| Mandarin | Apple on-device / pinned Mandarin Vosk fallback; native Android Vosk | 161/161 native Android checks. Fresh iOS 161/161 after fixing short-aspiration rejection and flattened tone feedback |
| Japanese | Separate publisher model downloaded and checksum-pinned | Fresh 63/63 word-mode saved-PCM checks on iOS and Android after separating mora timing from shared-word similarity; new carrier qualification pending |
| Korean | Separate publisher model downloaded and checksum-pinned | Word/carrier reference capture completed; full native decoder/scoring suite pending |
| Arabic | Separate publisher model downloaded and checksum-pinned | Candidate only; not activated for shipping |
| Cantonese | Cantonese-finetuned SenseVoice, pinned int8 native model | Fresh 41/41 word-mode saved-PCM checks on iOS and Android, including silence and repeat/cancel/dispose; new carrier qualification pending; not activated for shipping |

The shared content/feedback tests cover 541 graded pair-sides. Browser layout
checks cover seven courses × eleven interface languages × four result states
(308 cases), with no overflow or browser errors. H & F-enabled regression tests
also pass. Twelve repeated synthetic browser captures across four viewport sizes
retain the recording control's center and top position. Android native word
recognition median/p95: L & R 723/936 ms; English 742/929 ms; first model loads
2061/2000 ms. These checks are not human pronunciation-accuracy certification.

No new public release, formal-review replacement, or web deployment is claimed
by this source checkpoint. Store availability is recorded only after provider
readback. Existing reviews, recordings, account settings and prices are untouched.

Subsequent verified test distribution: [L & R 1.0.0 (10)](BETA-LANDR-1.0.0-10.md)
is available on both internal TestFlight and Google Play. The other courses remain
at their existing test builds until their separate checks and packaging pass.

## Model provenance and interpretation

[Publisher model catalogue](https://alphacephei.com/vosk/models), exact source
and deterministic package hashes: [pair-words.json](../models/pair-words.json).
Only the selected language is packaged with each app. H & F keeps its original
manifest and default staging. Native library provenance and licences remain in
`models/licenses`.

The 0–100 values are designed practice indices, not calibrated probabilities.
Tone or length exercises cannot receive a high sound grade from spelling alone.
Same-sound visual kana and documented accent/merger explorations remain ungraded.
No target answers, grammar restriction, fuzzy target replacement or cloud ASR
are used to force the recognized words into the displayed pair.

## Subsequent source hardening, 2026-10-04

- Highlight the authored differing pronunciation without pretending to transcribe
  the user's phonemes. Retain the original words returned by the decoder.
- Separate Yue's iOS native decoder from Vosk's static dependency graph. This
  fixes a verified pre-launch registry collision and avoids unused native SDKs
  in the other iOS apps. The Yue package recognizes saved PCM directly, without
  an unrelated Apple speech-consent/model-download wait.
- Digital silence/DC bypasses generative decoding; quiet spoken clips remain
  eligible. Native Android Cantonese word recognition median/p95: 419/516 ms
  on the physical MIX 2S synthetic saved-PCM regression.
- Keep unresolved whole-word comparisons low when shared vowels resemble the
  target but the independently compared pair differs. Do not manufacture a
  phoneme score or confidence for untimed Cantonese recognition.
- Normalize explicitly authored Chinese script variants for content matching;
  keep the actual simplified/traditional transcript unchanged in the UI.
- Give Korean, Arabic and Japanese real short carrier prompts. Preserve the
  explicit isolated Japanese ha/he readings and contextual kanji readings.
- Carrier scoring now uses separately synthesized surrounding speech to bound
  the target window. This prevents a similar carrier word such as "said" from
  being graded instead of "seed". Both displayed candidates remain symmetric.
- A sentence supplies a same-speaker pitch baseline for level-tone comparisons;
  isolated flat tones still do not establish register. The new carrier path is
  under separate native qualification, not yet a shipping claim.
- A brief disconnected carrier pitch fragment before an unvoiced onset no
  longer invalidates the target vowel's reliable contour. Only fragments of at
  most four voiced frames are excluded; two substantial separated nuclei still
  abstain. No interpolation crosses the consonant gap.

Fresh extended iOS regressions now pass English 325/325 and Cantonese 69/69:
word and sentence modes, every graded pair-side, opposite/quiet recordings,
repeat/cancel/dispose and silence. English Android's extended run and the other
courses' sentence/native checks remain in progress. These are synthesized
saved-PCM regressions, not human accuracy certification or new distribution.
English build 10 is reserved for its independently verified candidate; H & F
15 and the distributed L & R 10 remain unchanged. Release source evidence now
uses immutable per-app filenames so equal build numbers cannot overwrite one
another's provenance.

At this source checkpoint, Pair-enabled unit/regression checks pass 1094 tests
(12 intentionally skipped); H/F-enabled checks pass 1097 (9 skipped). Layout
checks pass 308/308 result states and 12/12 repeated browser recordings across
four viewport sizes. The previous full iOS English carrier run exposed nine
failures and the Cantonese carrier run exposed two; the new anchoring and script
fixes are being rechecked rather than those runs being called successful.

Historical recordings remain unchanged. Older sentence takes retain their
original prompt/score; re-assessment never silently changes that prompt to a new
carrier. Existing L & R build 10 distribution and H & F build 15 are preserved.
No additional test upload, production review or web deployment is claimed by
this source-hardening checkpoint.

## Current extended qualification, 2026-10-04

English now passes **326/326 fresh native checks on both iOS and Android**:
word and short-sentence prompts, every graded pair-side in both directions,
quiet recordings, repeated recognizer lifecycle checks, silence and noise.
The latest answer-slot feedback change was separately re-evaluated against both
retained native receipts: 326/326 on each. That re-evaluation is pure feedback
over the actual saved decoder/acoustic evidence, not another native execution.
Arabic also passes its first full **130/130 native iOS checks**; its Android
qualification remains pending. Korean previously passed 133/133 native iOS
checks; its current noise-inclusive, two-platform qualification remains pending.

- Reuse H & F's bounded analysis gain normalization for quiet consonants. Saved
  audio, waveform, clipping and recording-quality checks use original PCM.
- The other pair apps use their bundled native decoder directly on iOS, avoiding
  a repeated wait for absent Apple language assets. H & F keeps its approved
  Apple-first recognition path and unchanged audio normalization.
- Evaluate sentence word identity and confidence inside the explicitly authored
  answer slot. Shared carrier words cannot count as another practice answer.
  Preserve actual decoder text and its original segment confidence values.
- End English n/ng carriers immediately after the target, reducing interference
  from a following vowel. Historical recordings retain their original prompts.
- Low/creaky tone speech may retain tightly fitting word-reference evidence, but
  insufficient F0 still cannot become a measured tone grade.
- Strong independent sound evidence can remain useful with an unconfirmed word;
  the word card shows a dash, not an invented perfect word score. Noise remains
  unscored even if recognition happens to produce the displayed word.

Pair-enabled unit/regression checks pass 1110 tests (12 deliberately skipped).
H & F-enabled regression checks pass 1113 tests (9 deliberately skipped).
The compact layout passes 308 multilingual result cases and twelve repeated
recording checks, with a centered, fixed recording control and no visible timer.
These are synthesized saved-PCM/runtime regressions and browser layout checks,
not human pronunciation-accuracy certification. Scores remain practice indices,
not calibrated phoneme-correctness probabilities.

English build 10 is now [verified available on both internal test tracks](BETA-ENGLISH-1.0.0-10.md).
Provider availability is recorded separately after readback. H & F 15, the already
distributed L & R 10, existing reviews, recordings and account settings remain
unchanged. No new production review or public-release claim is made here.

## Subsequent native findings and fixes

Japanese's extended run initially passed 113/114: a broadband noise control
could fit a short kana reference. A gain-independent FFT flatness check now
rejects overwhelmingly flat, non-periodic captures without using recognition as
a speech detector. Quiet/creaky speech with a structured vowel remains eligible;
H & F's approved signal path is unchanged. A fresh native Japanese iOS run now
passes 114/114, including that control. Android qualification remains pending.

Korean's Android run passed 132/134, exposing a plain/tense stop whose brief
release was discarded after alignment and whose spelling was collapsed by ASR.
Only the Korean stop profile can retain a 30 ms observed cue, with at least a
60 ms reference mask, stronger reference separation and a bounded close fit.
Other contrast profiles keep their existing observed-frame floor. Actual ASR
text stays unchanged and conflicting evidence remains provisional. All 134
retained native Android rows pass deterministic PCM/scoring re-evaluation;
the changed lesson then passes 22/22 fresh native Android checks. Those are
separate pieces of evidence, not a claim of a new full 134-row native run.

Fresh extended native iOS checks also pass Mandarin 310/310, Cantonese 70/70
and L & R 98/98. Pair-enabled regression tests pass 1112 (12 skipped); H & F
regressions pass 1115 (9 skipped). Further native Android checks and exact
packaging remain required before additional tester availability is claimed.

Cantonese's extended Android run now also passes 70/70, matching iOS 70/70.
Its own bundled int8 Cantonese decoder is activated for the build-10 candidate,
with separate iOS native dependencies to avoid the previously fixed registry
collision. On the physical MIX 2S, word-decoding median/p95 is 593/661 ms;
the first model load is 5108 ms. These are synthetic runtime timings, not human
accuracy or a promise for every device. No additional store availability is
claimed until exact package and provider verification are complete.
