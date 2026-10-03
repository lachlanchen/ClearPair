# L & R — 1.0.0 (10)

Available to the existing internal testers on TestFlight and Google Play.
Apple readback: `VALID`, `IN_BETA_TESTING`, automatic tester notification enabled.
Google readback: `Available to internal testers`. Verified 2026-10-03 UTC.
Update in place; do not uninstall if you want to retain recording History.

This build applies H & F's successful interaction pattern to L & R through a
separate scoring adapter: actual saved-audio transcription, independent aligned
L/R sound feedback, explicit recognition/acoustic disagreement, and a compact
word/contrast/duration layout below stable centered recording controls. Speech
stops on pause or a second tap; the distracting visible timer is removed.

Fresh native saved-PCM checks passed 55/55 on the Mac mini iOS simulator and
55/55 on the physical MIX 2S: every pair in both directions, quieter speech,
repeated requests, cancellation/disposal, and silence. Android word decoding:
median 723 ms, p95 936 ms, first model load 2061 ms. These are synthetic reference
regressions, not a claim of calibrated human pronunciation accuracy. Values are
practice indices; a transcript alone does not establish a measured L/R sound.

All seven course result layouts passed 308 cases across eleven UI languages and
four states. Twelve repeated synthetic captures across four viewport sizes kept
the recording control centered and at the same vertical position. H & F 15,
other apps' existing tester builds, production reviews, prices and account
settings remain unchanged. No web deployment or new formal review is claimed.

Application source: `6f800c2fcce4bd1c09b2b7669bbbfe2718d8b646`.
Both signed packages were checked against that source's generated public assets,
exact app/version/build, language payload and model provenance. Android's 64-bit
native libraries passed the 16 KiB ELF load-alignment check.

Sanitized [distribution receipt](../store/artifacts/internal-beta-landr-1.0.0-10.json).
