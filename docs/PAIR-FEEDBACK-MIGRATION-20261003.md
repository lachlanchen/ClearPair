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
| Mandarin | Apple on-device / pinned Mandarin Vosk fallback; native Android Vosk | 161/161 native Android checks. Initial iOS run 157/161 exposed short-aspiration rejection and flattened tone feedback; fresh iOS check follows the targeted fixes |
| Japanese / Korean | Separate publisher models downloaded and checksum-pinned | Candidates only; not activated for shipping |
| Arabic | Separate publisher model downloaded and checksum-pinned | Candidate only; not activated for shipping |
| Cantonese | Cantonese-finetuned SenseVoice candidate downloaded | Language-specific native integration pending; not activated for shipping |

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
