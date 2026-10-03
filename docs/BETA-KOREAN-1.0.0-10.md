# Korean — 1.0.0 (10)

Available to existing internal testers on TestFlight and Google Play.
Apple readback: `VALID`, `IN_BETA_TESTING`, automatic notification enabled.
Google readback: exact build 10, `Available to internal testers`, no draft.
Apple formal review now uses this exact build: `WAITING_FOR_REVIEW`, automatic
release after approval preserved. Update in place to retain recording History.

The bundled Korean model transcribes saved audio without the selected word as
a recognition hint. Different recognized words remain visible. Word identity,
the focused sound comparison and speech duration are separate, fixed-order
items. Stop-consonant comparisons now accept a brief onset only when the
reference has enough independent evidence; this does not lower the minimum
evidence requirement for other languages. Same-sound spelling and modern
pronunciation mergers remain explicitly ungraded.

The centered recording control has no visible timer. Tap again or pause to
stop and score. Pair direction and coaching appear below the control. Noise
cannot earn a grade merely because the recognizer returns a word. Saved audio
stays on-device; bounded analysis gain leaves the recording unchanged.

Fresh native saved-PCM regressions pass **134/134 on each platform**: graded
pairs, correct/opposite/quiet words and sentences, repeated use, cancellation,
silence and noise. These are synthetic runtime checks, not a calibrated human
pronunciation accuracy study. Scores are practice indices, not probabilities.
Signed packages match the source and pinned Korean model; Android 64-bit native
libraries pass 16 KiB ELF alignment checks.

Application source: `c44a5f8140e5340063fa3b98dded9c6ee32d6f1d`.
H & F 15 and other app binaries are preserved. No web deployment or Google
production availability is claimed.

Sanitized [test receipt](../store/artifacts/internal-beta-korean-1.0.0-10.json)
and [formal review receipt](../store/artifacts/formal-review-replacements-20261004.json).
