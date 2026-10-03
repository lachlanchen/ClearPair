# H & F 1.0.0 (15): stable controls and clearer sound evidence

H & F **1.0.0 (15)** is verified available in TestFlight and
[Google Play internal testing](https://play.google.com/apps/internaltest/4700504989515969850).
Apple readback reports VALID / IN_BETA_TESTING with automatic tester
notifications enabled. Google reports exact build 15 available internally,
no draft, and the existing tester list unchanged. The
[sanitized delivery receipt](../store/artifacts/internal-beta-handf-1.0.0-15.json)
binds these readbacks to the signed packages and exact source.
Update without uninstalling to preserve recordings.

## What changed

- The recording button is centered in idle, recording and finished states.
  The visible timer is removed; duration tracking and automatic silence stop
  remain. You can still tap Stop and score.
- Results always use **Word match → Target sound → Speech duration**. Timing
  analysis remains in collapsed Details. Small-screen unavailable labels wrap.
- Word-supported /h/, /f/ or Mandarin /x/ is explicitly labelled **Word evidence**,
  not an invented acoustic percentage. It follows the actual recognized word,
  including an opposite word. Opposite-word feedback gives the selected-target
  airflow cue instead of a generic unclear-sound message.
- A bounded initial-friction recovery handles a discarded strong unvoiced onset.
  Valid existing H/F boundaries and final F/V are unchanged. Build 14's per-take
  native recognition recovery, useful transcripts, provisional caps and History
  retention remain.

The [algorithm and layout notes](HANDF-STABLE-ANALYSIS-20261003.md) describe the
rejected broader boundary experiment and the narrower non-regressing change.
These remain inspectable practice indices, not calibrated pronunciation accuracy
percentages. No new trained network, selected-target decoder hints, cloud scoring
or recording upload was added.

## Checks

519 H/F-enabled tests passed, 3 skipped; type checking, diff checks and all 11
README-language checks passed. All 47 native saved-PCM regression rows passed on
the Mac mini, including 12 alternating hat/fat cycles and quiet/opposite controls.
The bundled native recognizer actually ran; Apple's recognizer was unavailable
in that simulator. Browser tests passed 45 layout/lifecycle cases, covering 12
successive synthetic-stream captures at phone, tablet and desktop sizes, plus
three result states in all 11 UI languages at 375 px. There was no control drift,
overflow or page error in the final run.

The cached human boundary audit retained its baseline results: 5 correct
identifications, 7 incorrect and 60 without a closest word among 72 crops from
42 speakers. This sparse, mostly-*he* audit has no hat/fat crops and qualifies
non-regression only—not human learner accuracy. Synthetic audio checks also do
not establish live microphone accuracy on every phone.

Both packages passed source/asset verification: iPhone/iPad archive, export and
Apple upload validation; all 49 iOS public assets and 28 native model files;
all 22 Android public assets and both pinned word models. No duplicate platform
model assets were added. The owned simulator and test-browser desktop were
stopped after evidence capture; other projects' runtimes were left alone.

Try repeated hat/fat, then the other pairs, quiet words, sentence mode and History
replay. Word evidence alone is deliberately not called an independent sound
measurement. No owner iPhone SE 3 recordings were retrieved during this update.

Application source: `07d45441e001674da69536e8904545fff798e224`.
Only H & F has new internal-test builds. Other apps' releases, existing formal
reviews, pricing/IAP/countries/privacy declarations and the public web deployment
are unchanged. Historical icons, audio, packages and evidence are preserved.

The [sequential migration plan](SCORING-MIGRATION-ORDER.md) puts L & R next,
then English, Mandarin, Korean, Arabic, Cantonese and Japanese, with separate
contrast-specific validation gates.
