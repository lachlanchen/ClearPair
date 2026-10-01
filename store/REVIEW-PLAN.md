# Seven-app production review plan

Each app focuses on easily confused sounds or letters, not generic vocabulary
practice. The approved V4 identity and eleven interface languages are retained.
Old icon originals and earlier release receipts must not be deleted.

The current store candidate **0.2.0 (2)** is internal testing, not formal review.
The next signed candidate is **1.0.0 (3)**; this version plan is not a submission
receipt and does not imply that a store build has already been uploaded.
The new microphone-permission race fix requires fresh signed builds; do not attach
the older binary as if it contained that fix. Reuse no upload attempt with uncertain
provider status. Each platform can proceed independently once its gates pass.

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

Japanese development is queued after this release is finished, not parallel scope.
