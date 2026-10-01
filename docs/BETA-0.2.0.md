# ClearPair 0.2.0 (2) · V4 multilingual preview

Practise what you mix up. Learn the difference.

## Android internal testing

All seven signed version-code-2 bundles are **available to internal testers**,
verified on 1 October 2026 (UTC). This is not a production launch or approval.

Use the Google account on the invited internal tester list:

| App | Join the Android test |
| --- | --- |
| H & F | [Join](https://play.google.com/apps/internaltest/4700504989515969850) |
| L & R | [Join](https://play.google.com/apps/internaltest/4699964129264422650) |
| English | [Join](https://play.google.com/apps/internaltest/4701515041942561039) |
| Mandarin | [Join](https://play.google.com/apps/internaltest/4701508145131584373) |
| Korean | [Join](https://play.google.com/apps/internaltest/4701552197367057378) |
| Arabic Letters | [Join](https://play.google.com/apps/internaltest/4701081904617178358) |
| Cantonese | [Join](https://play.google.com/apps/internaltest/4700996599031534890) |

Google may show the package identifier and “unreviewed” until initial app review.
These links require tester eligibility, not a public download. Updates may take
time to reach devices. Android uploads are AABs, not directly installable APKs.

## iPhone and iPad TestFlight

All seven 0.2.0 (2) builds are **available in internal TestFlight**, with
`VALID` processing and `IN_BETA_TESTING` confirmed on 1 October 2026 (UTC).
Each app is attached to its owner-invited internal tester group, with automatic
notifications enabled. Apple invitation/inbox delivery is not independently verified.

Open [TestFlight](https://apps.apple.com/app/testflight/id899247664) using the
invited Apple account. Accept Apple's invitation if prompted. Select **0.2.0 (2)**
and update without uninstalling to preserve recordings. These are private tests,
not unrestricted public TestFlight join links or App Store production releases.

## What's new

- Approved V4 icons and a calmer light palette with tidy cards and steady controls.
- Eleven independent UI languages: English, Arabic, Spanish, French, Japanese,
  Korean, Vietnamese, Simplified Chinese, Traditional Chinese, German and Russian.
- Arabic right-to-left layout; practice words and IPA retain their own direction.
- Cantonese joins H & F, L & R, English, Mandarin, Korean and Arabic Letters.
- Short listening/recall games and optional explanatory learning motion.

Specialist phonetic notes remain English/Chinese; untranslated notes are clearly
labeled English. Changing the interface language does not change practice audio,
words or assessment. [Localization scope](LOCALIZATION.md).

## What to test

- Replay A → B → A repeatedly, then start and stop a pair loop.
- Record twice without restarting; watch the waveform while speaking.
- Reopen and replay or export a recording from History.
- Deny microphone permission, grant it in settings and retry.
- Try a long-label UI language and Arabic on a small screen, plus iPad layout.
- For Cantonese, verify an installed Cantonese voice; Mandarin must not substitute.

**Pronunciation grades remain disabled pending validation.** Stars measure game
recall; waveform/signal feedback is not phonetic accuracy. This release is for
owner-requested real-device self-testing, not a passed microphone qualification.
The earlier iOS automated audio test timed out after permission; no new successful
physical-device microphone test is claimed. Your iPad's built-in microphone can
be used—buying a separate microphone is not a testing prerequisite.

Installed device voices are used, and offline/language availability varies.
Temporary research clips are excluded. Microphone recordings are not uploaded;
history is local. Export favourites before clearing data or uninstalling.

## Evidence and release boundaries

- Application source: `f42e9ab0faab61719a6c3503e99f0e5e28cdb9a7`.
- 171 unit tests, 26 browser tests and all seven PWA builds passed.
- All seven signed Android bundles passed signature and checksum verification.
- All seven signed iPhone/iPad archives exported and passed Apple's validation.
- The [PWA family](https://language-agent.lazying.art/) is live over HTTPS; public
  files were checksum-verified and all eleven UI selectors checked per app.
- [Artifact hashes and verified states](../store/artifacts/internal-beta-0.2.0.json)
  are sanitized; signing material, accounts and raw receipts remain private.

No production review or rollout was submitted in this beta operation. Existing
L & N store releases and the previous six-app 0.1.0 (1) evidence were preserved.
