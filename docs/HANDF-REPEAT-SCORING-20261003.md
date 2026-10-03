# H & F repeated-take and ambiguous-sound scoring

This source candidate targets **H & F 1.0.0 (13)** only. Upload/distribution is
not implied by this document. [Build 11](BETA-HANDF-1.0.0-11.md) is the previous
verified internal release. Other apps, L & N and production reviews are unchanged.

The owner reported that build 11 sometimes distinguished hat/fat but otherwise
returned an uncertain-sound message, including after reopening. No owner audio
was retrieved. Source inspection identified two concrete assessment gates:

- Final native Vosk word evidence could be discarded whenever a reference score
  was at least 65. It is now considered on every iOS initial-H/F assessment,
  without relaxing Vosk's word-confidence checks.
- A computed H/F measurement with an ambiguous margin was discarded wholesale.
  It now keeps its sound, word and timing analysis and a provisional score capped
  at 59, with feedback explaining the close contrast. This does not turn an
  ambiguous measurement into a confident phoneme claim.

A missing consonant boundary can retain a bounded whole-word practice index only
when speech/reference separation and actual edge friction support that comparison.
Silence, noise, clipping, missing references and unsupported exercises remain
ungraded. Vowel-only initial H/F takes retain specific low-score feedback.

A confidently recognized native word can resolve uncertain sound evidence, but
the unavailable sound item says **Not measured**, and word-only scores remain
capped at 85. A whole-word reference ratio is never counted a second time as
measured consonant evidence. Strong disagreement between bundled recognition and an independently
clear sound measurement remains conservative. Final F/V lexical grading is still
excluded; other courses' scoring gates are unchanged.

The Apple recognizer is retained for its active request and released at completion
or fallback. An empty final Apple transcript now invokes the bundled decoder on
the same PCM instead of being mistaken for usable word evidence. This is lifecycle
hardening, not proof that an Apple task-lifetime fault caused the owner's report.

500 H/F-enabled unit tests passed, with 3 skipped; type checking passed. New
checks cover 20 successive mixed-target takes with cancellation/disposal, native
word evidence above the former threshold, conservative low-confidence words,
ambiguous sound analysis and UI feedback. The separate Mac mini native probe adds
12 consecutive hat/fat cycles after cancellation and disposal to its prior
35 saved-PCM regression rows. All **47 native rows passed**, with final bundled
native decoding actually executed. The QA assets and native source matched
their transferred hashes. Apple's simulator recognizer remained unavailable;
these runtime checks exercised the native fallback, not live Apple recognition.
The console capture now uses short, validated UTF-8 chunks to prevent Apple's
interleaved diagnostics from corrupting long JSON receipts; incomplete or
duplicate receipts fail verification.

These are inspectable practice indices and regression checks, not calibrated
human pronunciation accuracy. Recognized words, measured sound details and
reference similarity remain separate. No cloud recognition, audio uploads,
selected-target decoder hints or newly trained grader is introduced.
