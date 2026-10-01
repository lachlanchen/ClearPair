# ClearPair beta qualification

Scope: eight independent apps, iOS TestFlight and Google Play internal testing only.
No production rollout is implied by a successful build or upload. Existing L & N,
Bunko and other app releases are outside this project's scope.

| App | Bundle / package ID |
| --- | --- |
| ClearPair H & F | art.lazying.clearpair.handf |
| ClearPair L & R | art.lazying.clearpair.landr |
| ClearPair English | art.lazying.clearpair.english |
| ClearPair Mandarin | art.lazying.clearpair.chinese |
| ClearPair Korean | art.lazying.clearpair.korean |
| ClearPair Arabic Letters | art.lazying.clearpair.arabic |
| ClearPair Cantonese | art.lazying.clearpair.cantonese |
| ClearPair Japanese | art.lazying.clearpair.japanese |

Current release guide: [1.0.0 (4)](../docs/BETA-1.0.0-4.md).

## What to test

Development preview: pronunciation grades are not enabled. Please test listening
quizzes, switching/repeating word pairs, starting/stopping loops, microphone
permission recovery, repeated recording, waveform visibility, local history,
replay and exporting a chosen recording. Check small-screen layout and switching
the interface language independently of the practice language.

Test builds use installed device voices. Temporary synthetic research clips are
excluded because redistribution permission has not been verified. Voice quality
and language availability vary by device. Report a specific
lesson, selected word, device/OS and what you heard. Do not treat signal-quality
feedback or listening accuracy as a pronunciation score. No microphone recordings
are uploaded by this preview; exporting is an explicit user-selected share action.

## Release evidence

Private signing and provider receipts belong under ignored `.runtime/`, never Git.
Record exact source commit, version/build, artifact SHA-256 and provider state per
app and platform. Prepared, uploaded, processing and available-to-test are distinct.
Do not announce a test link until it is verified against the intended app/build.

Native permission keys must be root Info.plist entries. Capture actual iOS runtime
evidence in addition to compilation; emulator silence is not speech accuracy.
