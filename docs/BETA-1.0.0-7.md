# ClearPair 1.0.0 (7) internal testing

All eight independent apps are available to the existing internal testers on
TestFlight and Google Play. Apple's builds are VALID and IN_BETA_TESTING; Google
reports Available to internal testers. The [artifact receipt](../store/artifacts/internal-beta-1.0.0-7.json)
binds package identities, signed hashes and source commit. This is test
availability, not a formal-review submission or public release.

## Try the automatic flow

Tap Record, say the displayed word, then pause. Recording stops after speech and
quiet, and the native practice-match score starts automatically. Tapping Stop
and score ends it immediately. Sentence practice allows a longer pause. Repeat
without changing the button position; replay and export takes from History.

H & F uses a separate consonant-focused FFT analysis for English H/F, Mandarin
H/F and final F/V. Sound separation contributes 80% and word similarity 20%.
Sentence mode searches for the actual word rather than assuming the selected
sound was spoken. See [the algorithm and phone test](HANDF-AUTOMATIC-SCORING.md).

These scores compare acoustic evidence with both installed device-voice
references; they are not calibrated percentages of pronunciation accuracy.
Missing offline voices, silence and uncertain evidence receive guidance rather
than an invented grade. Spoken exploration and same-sound scripts remain
ungraded. The public PWA has not been changed by these native uploads.

## Test access

Use the existing TestFlight invitation. Android testers can join through these
stable links with their enrolled Google account:

| App | Google Play internal test |
| --- | --- |
| H & F | [Join](https://play.google.com/apps/internaltest/4700504989515969850) |
| L & R | [Join](https://play.google.com/apps/internaltest/4699964129264422650) |
| English | [Join](https://play.google.com/apps/internaltest/4701515041942561039) |
| Mandarin | [Join](https://play.google.com/apps/internaltest/4701508145131584373) |
| Korean | [Join](https://play.google.com/apps/internaltest/4701552197367057378) |
| Arabic Letters | [Join](https://play.google.com/apps/internaltest/4701081904617178358) |
| Cantonese | [Join](https://play.google.com/apps/internaltest/4700996599031534890) |
| Japanese | [Join](https://play.google.com/apps/internaltest/4701602453248600334) |

Update in place; do not uninstall if you want to retain recordings. Try correct
and opposite words, short words, sentence pauses, immediate speaking, repeated
recording and History/replay. Listening/recall stars remain separate from speech
scores. Device voice quality varies.

## Validation scope

387 unit tests passed (three existing skips), 47 browser tests passed, and all
eight Android and iOS signed builds passed. Actual native reference generation
and scoring workers passed 16 H/F word pairs and three sentence routes on an
iOS simulator and a physical MIX2S. These are software-path checks, not human
pronunciation accuracy measurements. Owner testing of build (7) found UI
clutter and some wrong-word abstentions; candidate (8) addresses that feedback.
