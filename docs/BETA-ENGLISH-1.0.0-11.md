# English — 1.0.0 (11)

Available to existing internal testers on TestFlight and Google Play. Apple
reports `VALID` / `IN_BETA_TESTING`, with automatic notification enabled. Google
reports exact build 11 `Available to internal testers`, without a draft. Apple
formal review uses the same build, `WAITING_FOR_REVIEW`; automatic release after
approval is preserved. Update in place to retain recording History.

The bundled recognizer transcribes saved speech without a selected-word hint.
Different recognized words stay visible. Word identity, focused initial/vowel/
ending evidence and duration have separate, fixed-order feedback. Unmeasured
final-fricative disagreements such as mouth/mouse retain a bounded provisional
practice match. The transcript is not replaced and an unmeasured TH ending is
not invented. Carrier prompts bound the answer slot independently of the shared
surrounding words.

The centered Record control has no visible timer. Tap again or pause to stop and
score. Analysis and coaching sit below the control. Saved audio stays on-device;
bounded analysis gain leaves the recording unchanged.

Qualification: full native baseline **326/326 iOS, 324/326 Android**; corrected
feedback over retained evidence **326/326 each**; fresh focused final-fricative
follow-up **34/34 each**. Feedback re-evaluation is not another native decoder
execution. These are synthetic regressions, not calibrated human pronunciation
accuracy. Scores are practice indices, not probabilities.

Signed packages match the frozen source and pinned English model. Android
64-bit native libraries pass 16 KiB ELF alignment checks. Application source:
`46b948cc8ab1f2b3ac3aec6c3054e59573045cfe`. H & F 15 and the other frozen binaries
are preserved. No new web deployment or Google production availability is claimed.

Sanitized [test receipt](../store/artifacts/internal-beta-english-1.0.0-11.json),
[formal review receipt](../store/artifacts/formal-review-replacements-20261004.json)
and [ending-feedback qualification](ENDING-REFERENCE-FEEDBACK-20261004.md).
