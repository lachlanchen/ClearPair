# Arabic Letters — 1.0.0 (10)

Available to existing internal testers on TestFlight and Google Play.
Apple readback: `VALID`, `IN_BETA_TESTING`, automatic notification enabled.
Google readback: exact build 10, `Available to internal testers`, no draft.
This exact build is `WAITING_FOR_REVIEW` at Apple, with automatic release after
approval preserved. Update in place to retain recording History.

A bundled Arabic model transcribes saved audio without the chosen word as a
recognition hint. The actual recognized text remains visible, including another
word. Letter identity, focused initial/vowel/timing comparisons and duration
stay separate. Reference/recognition disagreements are disclosed and capped;
unmeasured sound details are not invented from recognized spelling.

Cold model preparation is now a separate step from the short per-utterance
decoder deadline. The take is saved while preparation runs, with a message
below the fixed recording controls. Warm repeated takes reuse the prepared
model but start a fresh recognizer. Cancel/retry cannot publish a stale result.
There is no visible recording timer. Tap again or pause to stop and score.
Audio stays on-device; bounded analysis gain leaves the recording unchanged.

Fresh native saved-PCM regressions pass **130/130 on iOS and 130/130 on Android**,
including cold preparation on Android, correct/opposite/quiet words and
sentences, repeated use, cancellation, silence and noise. These are synthetic
runtime checks, not a calibrated human pronunciation accuracy study. Scores
are practice indices, not phoneme probabilities. Signed packages match source,
app identity and pinned Arabic weights; Android 64-bit libraries pass 16 KiB
ELF alignment checks. The interrupted Apple transport was completed within its
original upload, not uploaded again as another build.

Application source: `e1e431bed1c0de6092f4d7d175113b63aa638c93`.
H & F 15 and other app binaries are preserved. No web deployment or Google
production availability is claimed.

Sanitized [test receipt](../store/artifacts/internal-beta-arabic-1.0.0-10.json)
and [formal review receipt](../store/artifacts/formal-review-replacements-20261004.json).
