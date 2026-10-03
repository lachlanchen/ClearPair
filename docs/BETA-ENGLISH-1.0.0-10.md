# English — 1.0.0 (10)

Available to the existing internal testers on TestFlight and Google Play.
Apple readback: `VALID`, `IN_BETA_TESTING`, automatic notification enabled.
Google readback: `Available to internal testers`, exact build 10, no draft.
Verified 2026-10-03 UTC. Update in place to retain recording History.

Actual offline transcription shows the word spoken, including a different word.
Word identity and the independently compared initial, vowel or ending remain
separate. Recognition/sound disagreement is visible; an uncertain transcript
does not hide a strong measured contrast or invent a perfect word grade.
Sentence-mode identity uses the authored answer slot, not the shared prefix.
Bounded analysis gain protects quiet consonants without altering saved audio.
English n/ng sentence prompts end at the word to reduce following-vowel effects.

The compact word/contrast/duration row and labelled pair comparison sit below a
centered, fixed recording control. Record, speak, then pause or tap to stop.
There is no distracting visible timer. Tone, duration and consonant evidence
are not inferred from spelling alone. No recording is uploaded for assessment.

Fresh native saved-PCM checks pass **326/326 on iOS and 326/326 on Android**:
every graded pair-side, word and sentence modes, correct/opposite/quiet takes,
repeat/cancel/dispose, silence and noise. The final answer-slot-only feedback
change also passes 326/326 when re-evaluated over each retained native receipt;
that is not an additional native run. Android decoding median/p95 is 958/1235 ms
on the physical MIX 2S; first model load is 1885 ms. These checks use synthesized
speech and do not certify human pronunciation accuracy. Values are designed
practice indices, not calibrated phoneme-correctness probabilities.

Pair-enabled regression tests pass 1110 (12 skipped); H & F-enabled tests pass
1113 (9 skipped). Layout checks pass 308 multilingual result cases and twelve
repeated recording checks across four viewports. Signed packages match exact
app/version/build, source public assets and pinned English model. Android's
64-bit native libraries pass 16 KiB ELF load-alignment checks.

Application source: `0b16805344e7769574736798bad57e51c0542d84`.
H & F 15, already-distributed L & R 10, other courses' test builds, existing
production reviews and account settings remain unchanged. No new formal review
or web deployment is claimed by this test distribution.

Sanitized [distribution receipt](../store/artifacts/internal-beta-english-1.0.0-10.json).
