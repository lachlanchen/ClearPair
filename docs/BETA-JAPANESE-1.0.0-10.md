# Japanese — 1.0.0 (10)

Available to existing internal testers on TestFlight and Google Play.
Apple readback: `VALID`, `IN_BETA_TESTING`, automatic notification enabled.
Google readback: exact build 10, `Available to internal testers`, no draft.
Verified 2026-10-03 UTC. Update in place to preserve recording History.

Japanese is a separate app. Its bundled Japanese model identifies the saved
utterance without receiving the selected word as a recognition hint. The actual
transcript, including a different word, remains visible. Authored kana/kanji
readings and neutral sentence contexts locate the answer independently of the
shared prefix. Mora timing, vowel and consonant comparisons stay separate from
lexical recognition; same-sound script explorations are explicitly ungraded.
Recognition/sound disagreement is disclosed, not silently corrected.

Word match, focused contrast and speech duration have fixed card order. Pair
visualization and coaching sit below the centered recording control. There is
no visible recording timer. Pause or tap again to stop and score. Broadband
noise cannot earn a grade from an accidental recognized word. Audio stays on
the device and bounded analysis gain does not change the saved recording.

Fresh native saved-PCM regressions pass **114/114 on iOS and 114/114 on Android**:
graded pairs, correct/opposite/quiet words and sentences, repeat/cancel/dispose,
silence and noise. These are synthetic runtime checks, not certification of human
pronunciation accuracy. Scores are practice indices, not calibrated phoneme
probabilities. Signed packages match the standalone app, build, source assets
and pinned Japanese weights; Android 64-bit libraries pass 16 KiB ELF checks.

Application source: `7ba37cc2d574f4a06c971810a8faa9b812b585d5`.
H & F 15, L & R 10, English 10 and existing reviews are preserved. No new formal
submission or web deployment is claimed by this test distribution.

Sanitized [receipt](../store/artifacts/internal-beta-japanese-1.0.0-10.json).
