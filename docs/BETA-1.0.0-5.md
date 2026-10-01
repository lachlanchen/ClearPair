# ClearPair 1.0.0 (5) · Eight standalone apps

All eight apps are available in internal TestFlight and Google Play internal
testing, verified on 1 October 2026 (UTC). These are beta builds, not formal
review approvals or public store releases.

## iPhone and iPad

Open [TestFlight](https://apps.apple.com/app/testflight/id899247664) with the invited
Apple account, select the app and update to **1.0.0 (5)**. Update without uninstalling
to preserve recordings. Each course has a separate app, recording history and
progress; Japanese is not part of H & F. Descriptions and test notes are course-specific.

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

Links require tester eligibility. Updates may take time to reach a device.

## Build 5 changes

- Reference voices must match the practice language, not the interface language.
  Mandarin and Cantonese are not interchangeable. Android verifies the actual
  selected voice and excludes voices marked not installed.
- iOS excludes novelty and personal voices and prefers higher-quality available
  voices within the correct locale. No personal-voice permission is requested.
- Japanese isolated は, へ and を/ヲ use explicit letter readings rather than
  context-sensitive particle readings. Displayed kana and sentence context are
  preserved. Speech-aware reference keys prevent stale readings being reused.
- Existing V4 artwork, eleven UI languages, pair replay/loop/stop, recall games,
  waveform, local recording history/replay and export remain included.

These fixes do **not** establish that every synthesized reference sounds correct.
The reported H & F hit/fit playback, with /f/ sounding like /θ/, has not been
reproduced or cleared. The user subsequently cleared the earlier hat/fat example.
Installed voices differ by device, quality and language availability.

## Scoring and qualification limits

**Pronunciation grades remain disabled.** No local model has passed full human
accuracy calibration and physical-device qualification. Listening-game stars and
signal quality are not pronunciation scores. There is no backend scoring fallback.

The exact build 5 source passed 275 unit tests, 39 browser tests, 14 native Java
voice-policy checks, eight PWA builds and eight signed builds on each native
platform. These checks do not establish genuine native microphone capture,
auditory reference quality or pronunciation accuracy.

A later source-only fix keeps future assessment targets consistent with the
normalized reference readings. It is not inside the already-uploaded build 5;
grades are disabled in both. Model export experiments are research, not bundled
qualified scoring models.

## Web and testing

The [PWA preview](https://language-agent.lazying.art/) now serves all eight distinct
courses, including [standalone Japanese](https://language-agent.lazying.art/japanese/).
All 167 deployed file hashes matched the build 5 source candidate. Public DOM
checks passed for each course and eleven UI languages; those checks did not play
speech or use a microphone. L & N remains a separate app.

Replay A → B → A repeatedly; start and stop a loop; record twice without restarting;
watch the waveform while speaking; reopen and replay/export both takes; check
permission recovery. Verify H & F hit/fit, and that Cantonese never uses Mandarin.
Keep UI language separate from course language. Export favourites before clearing
data or uninstalling. Recordings are not uploaded by the app.

[Sanitized artifact hashes, provider states and web evidence](../store/artifacts/internal-beta-1.0.0-5.json)
identify the exact builds. Formal production submission remains unfinished.
