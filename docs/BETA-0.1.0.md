# ClearPair 0.1.0 (1) development preview

Practise what you mix up. Learn the difference.

## Android internal testing

All six version-code-1 bundles were accepted and published to Google Play's
**internal testing** track on 30 September 2026 (UTC). Console readback says
**Available to internal testers**. This is not a production launch or approval.

Use the Google account added to the private ClearPair internal tester list:

| App | Join the Android test |
| --- | --- |
| H & F | [Join](https://play.google.com/apps/internaltest/4700504989515969850) |
| L & R | [Join](https://play.google.com/apps/internaltest/4699964129264422650) |
| English | [Join](https://play.google.com/apps/internaltest/4701515041942561039) |
| Mandarin | [Join](https://play.google.com/apps/internaltest/4701508145131584373) |
| Korean | [Join](https://play.google.com/apps/internaltest/4701552197367057378) |
| Arabic Letters | [Join](https://play.google.com/apps/internaltest/4701081904617178358) |

Google may initially display each package identifier followed by “unreviewed”
instead of the final app name. Links require tester eligibility; they are not
unrestricted public downloads. New releases may take time to reach devices.

## iOS TestFlight

The six app records, signing profiles and internal tester groups are prepared.
**No iOS build has been uploaded or made available in TestFlight yet.**
Native recording qualification is still required. Simulator compilation alone
does not establish working microphone capture or playback.

## What to test

- Listen to both sides of a contrast; switch pairs and replay repeatedly.
- Start a pair loop, stop it, then record twice without restarting the app.
- Check waveform activity while speaking and replay the saved recording.
- Reopen the app and replay or export a recording from History.
- Deny microphone permission, then grant it in device settings and retry.

Reference playback uses installed device voices. Available languages and offline
voice availability depend on the device. This build does not bundle the private
research reference clips or upload microphone recordings.

**Pronunciation grades are not enabled.** These builds are for testing listening,
capture, playback and local history, not validated phoneme-assessment accuracy.

## Qualification evidence

- Runtime source: `63ca7baba6ccf367ad395f547197d9cd0f27a428`.
- 131 unit tests and 13 browser tests passed; all six PWA builds passed.
- Six signed Android bundles were hash-checked and inspected for excluded audio.
- Android emulator checks covered repeated native capture, local persistence,
  permission recovery and export. A silent emulator does not prove audible
  playback or real-speaker pronunciation accuracy.
- All six generic iOS simulator builds compiled. iOS native runtime qualification
  remains pending; it must not be reported as passed.

Provider receipts, tester addresses, signing material and operational details are
kept in ignored private storage, not in this release note.
