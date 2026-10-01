# Eight-app production review plan

Each app focuses on easily confused sounds or letters, not generic vocabulary
practice. The approved V4 identity and eleven interface languages are retained.
Old icon originals and earlier release receipts must not be deleted.

All eight **1.0.0 (6)** builds were verified in internal testing on both platforms,
not formal review. [The verified beta receipt](artifacts/internal-beta-1.0.0-6.json)
is distinct from a production submission. Later voice fixes and model work require
a new tested build; do not label the older binary as containing those changes.
Reuse no upload attempt with uncertain provider status. Each platform can proceed
independently once its gates pass.

The owner's latest direction is **test build first, owner phone feedback next**.
Build 6 adds a separately labelled, experimental local reference-match index;
see [its design and checks](../docs/BETA-1.0.0-6.md). This does not approve the
calibrated phonetic models or waive formal-production accuracy claims. Prepare
and distribute all eight internal-test builds without changing prices, countries,
production tracks or other app review states. Distribution is complete; the next
step is the owner's phone feedback, not an assertion of calibrated accuracy.

## Truthful product boundaries

- Learn: original schematic articulation/script/relative-tone pictures; optional,
  reduced-motion-aware animation, not an anatomical diagnostic model.
- Listen: pair replay and loops, recall and short five-question challenges.
- Practise: native microphone capture, waveform, replay and export. Recordings and
  progress stay local; export is user initiated.
- History: local, paginated recordings, preserved across an in-place app update.
- Voice: installed device speech, possibly network-backed. Cantonese requires an
  explicit Cantonese voice and refuses Mandarin fallback.
- UI: eleven languages independent of practice language. Specialist lesson notes
  are English/Chinese with an explicitly labeled English fallback elsewhere.
- Game stars and signal quality are **not pronunciation scores**. Speech accuracy
  scoring remains disabled pending human validation. No therapy/diagnosis claims.

## Required before submission

Source regression tests; signed artifact identity/hash; native launch and media
checks with limitations recorded; genuine native iPhone/iPad and Android listing
screenshots; live support/privacy URL; accurate data, content/age, rights and access
declarations; USD0.99 paid-download setup; matching Apple version/build; exact Google
release payload and country/price readback; provider validation and post-submit state.
Do not cancel another app's review or mutate account, IAP, existing price or country
settings. Screenshots must not imply enabled scoring or fabricate microphone results.

An installed TestFlight app must not be uninstalled or overwritten with a debug
package for automation. Hardware, simulator, mock-stream and phonetic audition checks
are different evidence. A zero-test rerun is not a pass. The currently connected MIX
2S is a shared transport: wait for its owner's availability response before GUI QA.

Japanese is a standalone eighth app. Its KanjiVG stroke data is licensed third-party
content and must be reflected truthfully in content-rights declarations. Scoring
qualification, native microphone checks, genuine listing screenshots, privacy,
review contact, availability and paid-price readback remain submission gates.
