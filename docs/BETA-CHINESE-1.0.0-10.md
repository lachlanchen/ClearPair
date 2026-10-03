# Mandarin — 1.0.0 (10)

Available to existing internal testers on TestFlight and Google Play. Apple
reports `VALID` / `IN_BETA_TESTING`, with automatic notification enabled. Google
reports exact build 10 `Available to internal testers`, without a draft. Apple
formal review uses the same build, `WAITING_FOR_REVIEW`; automatic release after
approval is preserved. Update in place to retain recording History.

The bundled Mandarin recognizer reads the saved recording without a selected-word
hint. The actual transcript remains visible, including a different word. Word
identity, measured contrast/tone and duration have separate, consistently ordered
feedback. Reference disagreements on weak n/ng endings retain a bounded provisional
practice match rather than inventing a measured ending. Tone/register uncertainty
stays explicit; spelling alone cannot earn a measured tone score.

The centered Record control has no visible timer. Tap again or pause to stop and
score. Analysis and coaching sit below the control. Saved audio stays on-device;
bounded analysis gain does not alter the recording.

Qualification: full native saved-PCM baseline **310/310 iOS, 308/310 Android**;
corrected feedback over retained evidence **310/310 each**; a fresh native
focused ending follow-up **30/30 each**. The feedback re-evaluation is not a second
decoder execution. These are synthetic regressions, not calibrated human
pronunciation accuracy. Scores are practice indices, not probabilities.

Signed packages match the frozen source and pinned Mandarin model. Android
64-bit native libraries pass 16 KiB ELF alignment checks. Application source:
`46b948cc8ab1f2b3ac3aec6c3054e59573045cfe`. H & F 15 and the other frozen binaries
are preserved. Broader tone/phoneme coverage is a subsequent curriculum update.

No Google production availability or new web deployment is claimed here. See the
[test receipt](../store/artifacts/internal-beta-chinese-1.0.0-10.json),
[formal review receipt](../store/artifacts/formal-review-replacements-20261004.json)
and [ending-feedback qualification](ENDING-REFERENCE-FEEDBACK-20261004.md).
