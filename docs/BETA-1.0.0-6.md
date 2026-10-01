# 1.0.0 (6): local practice-match beta

Candidate for all eight native apps. Upload/provider availability will be recorded
separately after signing and readback; this design note is not an upload receipt.
The owner requested a designed beta first and will test it on their phone.

## What changes

Record → finish → **Assess my pronunciation** now runs an experimental acoustic
comparison on the device. History retains the index, model version, frozen target,
raw reference distances and voice identifier. It does not alter listening stars.
The UI labels the result **Beta practice match**, in all eleven interface languages.

The index combines target-reference similarity (45%) with separation from the
other reference (55%). Inputs use 16 kHz PCM, 25 ms windows, 10 ms hops, 32 mel
filters and 12 cepstra. Partial channel normalization preserves vowel colour;
bounded dynamic time warping tolerates pace changes without unlimited deletion
or repetition. Relative pitch adds contour evidence for tone lessons. Japanese
mora and Cantonese vowel timing receive a stronger duration penalty. Sentence
mode compares the whole spoken sentence, not an allegedly aligned target phoneme.

These are designed constants, not learned calibration. The score is **not a
probability of correct pronunciation**, a diagnosis, or a replacement for a
teacher. Speaker, accent, recording channel and device voice can affect it.
Relative pitch alone cannot identify a speaker's absolute tone register. A large
independent human study is not claimed by the functional tests below.

References are synthesized silently on the device; there is no recording upload,
network ASR or model download. Android accepts only installed offline voices and
tries existing alternate engines without changing the phone's default. Missing
language voices give installation guidance and preserve the recording. iOS avoids
novelty/personal voices and prefers modern voices over legacy synthetic voices.
Reference audio is ephemeral, with a bounded memory cache; Android temp WAVs are
removed after completion/cancellation. Assessment is cancellable and time bounded.

## Test evidence before packaging

- Unit fixtures reject silence, DC, noise and malformed samples; compare opposite
  targets; retain vowel differences; tolerate amplitude and moderate pace changes.
- Runtime/UI tests cover reference caching, language and voice identity, late
  cancellation, worker cleanup, history provenance and experimental-score labeling.
- An isolated iOS simulator used the actual native plugin for all eight courses:
  reference, opposite reference, silence, repeated synthesis and full worker path
  passed. Same-reference 99 vs opposite-reference 36–42 is a plumbing check, **not
  human accuracy**. The simulator was shut down afterward; no peer UI was used.
- Physical MIX 2S: English and Mandarin reference checks passed; its installed
  engine setup lacks usable offline Korean, Arabic, Cantonese and Japanese voices.
  Those attempts return a voice-availability error rather than substituting another
  language. This device result does not imply those languages are unavailable on
  phones with the corresponding installed offline voices.

The independently calibrated ONNX scoring registry remains unchanged and empty.
Research models and earlier assets are preserved. PWA numeric scoring is unchanged
because browsers cannot silently render their system speech voice to PCM.

## Owner phone test

Update in place, do not uninstall. Record the selected word, then deliberately
record the other word. Try a short word, sentence mode, silence and five repeated
attempts. Cancel one assessment and change the word. Confirm History and replay.
Report the app, selected word, spoken word, result and device. This beta is for
feedback before any claim of calibrated accuracy or formal production review.
