# ClearPair 1.0.0 (4) · Eight standalone apps

All eight apps, including **ClearPair Japanese**, are available in internal
TestFlight and Google Play internal testing, verified on 1 October 2026 (UTC).
These are test builds, not public store releases or formal review approvals.

## iPhone and iPad

Open [TestFlight](https://apps.apple.com/app/testflight/id899247664) with the invited
Apple account, select the app and update to **1.0.0 (4)**. Update in place: do not
uninstall if you want to preserve recordings. Each app has its own identity,
course, recordings and progress. Japanese is not part of H & F.

TestFlight descriptions and test notes are now course-specific. The previous
family-wide Japanese update note was misleading and has been corrected without
changing the binaries. Refresh TestFlight if the old text is cached.

## Android

Use the Google account on the invited internal tester list.

| App | Join the Android test |
| --- | --- |
| H & F | [Join](https://play.google.com/apps/internaltest/4700504989515969850) |
| L & R | [Join](https://play.google.com/apps/internaltest/4699964129264422650) |
| English | [Join](https://play.google.com/apps/internaltest/4701515041942561039) |
| Mandarin | [Join](https://play.google.com/apps/internaltest/4701508145131584373) |
| Korean | [Join](https://play.google.com/apps/internaltest/4701552197367057378) |
| Arabic Letters | [Join](https://play.google.com/apps/internaltest/4701081904617178358) |
| Cantonese | [Join](https://play.google.com/apps/internaltest/4700996599031534890) |
| Japanese | [Join](https://play.google.com/apps/internaltest/4701602453248600334) |

Google may show an unreviewed package name until the first formal review. These
links require tester eligibility. Allow time for an update to reach your device.

## Included and not included

- V4 artwork, eleven interface languages, pair replay/loop/stop and recall games.
- Recording waveform, local History/replay and export, with immutable take targets.
- Standalone Japanese: confusing kana, contextual furigana, mora beats, modern
  stroke replay, a basic kana map and pair-specific Learn cues.
- The assessment flow is present, but **pronunciation grades are not enabled**.
  No local model has passed the full accuracy and physical-device qualification.
  Game stars and recording-signal quality are not pronunciation grades.
- Later voice-routing fixes and model-export research are source work, not part
  of the already-uploaded build 4. Store text corrections are separate from binaries.

## Test carefully

Replay A → B → A repeatedly; start/stop a loop; record twice without restarting;
watch the waveform while speaking; reopen and replay/export both takes; test
microphone-permission recovery. Keep interface language separate from course
language. Cantonese must not play with a Mandarin voice.

Installed device voices vary in quality and offline availability. Microphone
recordings are not uploaded. Compilation and mocked browser recordings do not
establish genuine native microphone or pronunciation-accuracy success.

[Sanitized artifact hashes and provider states](../store/artifacts/internal-beta-1.0.0-4.json)
identify the exact source and builds. Production review remains pending. The public
website has not yet been verified on this eight-app candidate; beta availability
does not imply web deployment.
