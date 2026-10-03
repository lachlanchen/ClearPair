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

## Qualification at this checkpoint

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
