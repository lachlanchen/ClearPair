# L & R — 1.0.0 (11)

Available to existing internal testers on TestFlight and Google Play. Apple
reports `VALID` / `IN_BETA_TESTING`, with automatic notification enabled. Google
reports exact build 11 `Available to internal testers`, without a draft. Apple
formal review uses this same build, `WAITING_FOR_REVIEW`; automatic release after
approval is preserved. Update in place to retain recording History.

The bundled English recognizer transcribes saved speech without a selected-word
hint. Different recognized words stay visible. Word identity, independently
focused L/R comparison and duration have separate, fixed-order feedback. A
similar shared vowel cannot silently override an uncertain initial consonant.
Word-only evidence never becomes a fabricated measured L/R score.

The centered Record control has no visible timer. Tap again or pause to stop and
score. Analysis and coaching sit below the control. Saved audio stays on-device;
bounded analysis gain leaves the recording unchanged.

Fresh native saved-PCM checks pass **98/98 on each platform**: word/sentence mode,
both directions of every graded pair, correct/opposite/quiet recordings,
repeat/cancel/dispose, silence and noise. These are synthetic regressions, not
calibrated human pronunciation accuracy. Scores are practice indices.

Signed packages match the frozen source and pinned English model. Android
64-bit native libraries pass 16 KiB ELF alignment checks. Application source:
`46b948cc8ab1f2b3ac3aec6c3054e59573045cfe`. H & F 15 and the other frozen binaries
are preserved. No new web deployment or Google production availability is claimed.

Sanitized [test receipt](../store/artifacts/internal-beta-landr-1.0.0-11.json)
and [formal review receipt](../store/artifacts/formal-review-replacements-20261004.json).
