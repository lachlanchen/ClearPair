# H & F recognition recovery and captured-speech feedback

Candidate 1.0.0 (14) addresses the owner's iPhone SE 3 report that build 13
usually recognized fat, but left most other attempts uncertain. No owner audio
or device recognition logs were retrieved; these are source-verified recovery
faults, not a proven diagnosis of every reported take.

## Recovery changes

The previous Apple word recognizer discarded partial transcripts and permanently
disabled a locale after one initialization error until the app restarted. The
new implementation rechecks support and availability on every saved-audio take.
It retains the latest usable transcript when the exact request ends with an
error, timeout or empty final result. Such evidence keeps its actual `final:false`
flag and raw confidence; it is marked provisional, not fabricated as a final
recognition result. With no usable words, the existing unrestricted bundled
decoder still processes the same PCM. Cancellation IDs prevent old callbacks
from completing or cancelling a newer take.

On iOS, initial H/F words are now decoded before reference synthesis changes the
audio session. The microphone is not reopened, and the saved PCM is retained.
Apple recognition remains explicitly on-device. There are no selected-target
hints or audio uploads. Apple's documented partial-result and on-device request
controls are described in its [Speech request documentation](https://developer.apple.com/documentation/speech/sfspeechrecognitionrequest).

## Feedback and bounds

- Exact final word-only recognition retains the existing cap of 85. The large
  label now says **Word match**, not a measured pronunciation grade.
- Completed Apple partial evidence is labelled provisional and capped at 79.
- A one-vowel spelling substitution preserving the H/F onset, such as hat/hot,
  provides partial word content (55), capped at 69. It never confirms the entire
  word or its consonant acoustics. Insertions, TH substitutions, unrelated
  phrases and low-confidence bundled words are not rescued this way.
- Captured but unresolved speech shows its measured duration, actual recognized
  text when available, and unavailable sound measurements. Collapsed Details
  separates decoder state from acoustic failure and provides sentence guidance.
  Recording controls stay in place; failed-assessment History audio is retained.
- Silence, clipping, unusable input and cancellation do not receive invented
  scores. Final F/V and the other apps' grading paths are unchanged.

The score is an inspectable practice index, not a calibrated human pronunciation
accuracy percentage. Keeping partial evidence improves recovery without claiming
that word transcription itself measures a correct H/F consonant.

## Validation

512 H/F-enabled tests passed, with 3 skipped; type checking and diff checks passed.
New tests cover completed versus incomplete partial words, raw zero confidence,
conservative nearby-word feedback, native-before-reference ordering, repeated
take cancellation, captured-speech diagnostics and all 11 UI languages.
The new native Swift source compiled on the Mac mini. All 47 native saved-PCM
regression rows passed, including 12 alternating hat/fat cycles, quiet takes,
opposite words, language switching, cancellation/disposal, silence and an
unrelated-word control. The existing bundled native decoder actually executed;
Apple's simulator recognizer was unavailable. These checks use synthesized
references, not live learner microphone audio. The Apple partial-result recovery
policy is covered by unit/native-contract tests, not claimed as observed on the
owner's phone. The owned simulator was shut down after evidence capture.
Exact internal-store delivery is recorded separately after it completes; this
candidate note alone is not an availability receipt.

An existing experimental onset network was independently evaluated on cached
human word crops and did not improve usable coverage. It was not enabled or
included as a new grader. No new model training or learner-accuracy certification
is claimed. Historical icons, recordings, models and build evidence are retained.
