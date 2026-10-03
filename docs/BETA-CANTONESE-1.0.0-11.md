# Cantonese — 1.0.0 (11)

Available to existing internal testers on TestFlight and Google Play. Apple
readback is `VALID`, `IN_BETA_TESTING`, automatic notifications enabled. Google
readback confirms exact build11, available to internal testers, no draft.
Verified 2026-10-03 UTC. Update in place to retain recording History.

This is a dedicated Cantonese model, not a substituted Mandarin recognizer.
The actual saved utterance is transcribed locally without target-word hints.
Its raw transcript remains visible even for a different word. Tone evidence and
focused consonant/vowel/ending comparison are independent of recognized spelling.
Disagreement is shown; pitch that cannot be measured is not invented from text.
Relative tone curves and fixed word/contrast/duration cards sit below a centered
Record control. Pause or tap to stop. No visible timer or recording upload.

The scoring core passed **70/70 native iOS and 70/70 Android** regressions:
correct/opposite/quiet words and sentences, repeat/cancel/dispose, silence and
noise. These are synthetic regressions, not human accuracy certification.
Practice points are not calibrated pronunciation probabilities.

iOS10 was accepted for upload but rejected during processing: ITMS-90208. The
pinned ONNX framework declared iOS13 despite a binary minimum of iOS15. Build11
corrects the embedded copy before signing and checks framework deployment
metadata before export. The upstream SDK, model weights and original package
are preserved; no scoring-model change was needed. The source separates Vosk
and Cantonese's OpenFst-based native SDKs to avoid duplicate static registries.
Android11's 64-bit libraries pass 16 KiB ELF load-alignment checks.

Source: `78fcdf8878ecd4ce482398d5ddec8532e410b8c2`.
Apple's pending build8 review was subsequently replaced by this exact qualified
build11, confirmed Waiting for Review at 21:37 UTC October3. Automatic release
after approval, existing screenshots, pricing and privacy declarations remain
unchanged. Google production is not yet submitted by this update.

[Test distribution](../store/artifacts/internal-beta-cantonese-1.0.0-11.json)
and [formal review replacement](../store/artifacts/formal-review-replacements-20261004.json).
