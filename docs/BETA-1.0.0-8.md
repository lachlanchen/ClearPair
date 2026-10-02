# ClearPair 1.0.0 (8): testing and iOS review

All eight independent apps are available to existing internal testers on
TestFlight and Google Play. Apple reports VALID / IN_BETA_TESTING for every exact
build, and all eight iOS production versions are **Waiting for Review**, with
automatic release after approval preserved. Google production submission is
not complete. Waiting for Review is not approval or verified public availability.
The [sanitized receipt](../store/artifacts/internal-beta-1.0.0-8.json) binds the
signed hashes, package identities and exact application source commit.

## What this build changes

Record, speak, then pause; or tap Stop and score. The recording controls and
word pair stay above the result, with technical explanations collapsed. Learn
starts with the useful learning content rather than a large hero. Clear opposite
H/F word matches can produce low-score feedback instead of an alignment failure.
Scores remain local experimental practice-reference comparisons, not calibrated
pronunciation accuracy percentages. Listening/recall stars remain separate.

The deeper quiet-speech and pair-focused algorithm changes in the
[next scoring update](SCORING-UPDATE-20261002.md) are **not in build 8**.
The public PWA was not changed by these native submissions.

## Test access

Use the existing TestFlight invitation and update in place. Do not uninstall if
you want to retain your recordings. Android internal-test links are stable:

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

Try correct and opposite words, quiet short words, immediate speaking, sentence
pauses, repeated recording, background/reopen and History replay. Missing offline
practice-language voices require setup; they must not trigger a fabricated score.

## Build-specific validation

390 unit tests passed (three existing skips), 47 browser regressions passed,
and all eight signed Android and iOS packages passed build verification.
The actual iOS native synthesis and scoring path passed 16 H/F word pairs and
three sentence routes. These are software checks, not a measured human
pronunciation error rate. Later source tests are recorded separately; their
counts must not be attributed to this already-uploaded binary.
