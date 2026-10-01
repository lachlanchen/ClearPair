# On-device contrast scoring

Status: inference/scoring integration under test. **No production model has
passed human accuracy and physical-device gates. Numeric grades are not enabled.**
The user requires scoring inside the iPhone, Android and PWA applications, not on
a backend, and accepts larger installation sizes. There is no cloud fallback,
audio upload, paid provider or server inference in this implementation.

The [2026-10-01 validation receipt](VALIDATION-2026-10-01.md) separates passing
source/browser/native-error-path tests from the still-failing simulator capture
and the unqualified scoring models. Existing beta5 binaries are unchanged.

## Implemented path

1. Decode native PCM WAV directly; compressed browser recordings use a bounded
   local audio decoder. Preserve the original even when analysis fails.
2. Inspect original amplitudes for silence/clipping, then apply pinned
   mono/windowed-sinc/16-kHz preprocessing. Normalizing encoder input must not
   normalize the confidence of a quiet/noisy recording.
3. Run a packaged, SHA-256-verified ONNX encoder in a dedicated single-threaded
   WebAssembly worker. Runtime code is packaged too, with no CDN. The same path
   targets Capacitor's iOS/Android webviews and the PWA. Compatibility is a test
   requirement, not established by the existence of the code.
4. Compare context-preserving target/confusion/omission/insertion/other-phone
   CTC paths. Keep the unlisted mass; do not force unrelated sound into a pair.
5. Forward/backward alignment retains uncertainty over phone positions. Aggregate
   acoustic-head features with the **target's occupancy**, never the whole carrier
   sentence. CTC spikes are not consonant-duration measurements.
6. Apply separately learned content, coverage and out-of-distribution gates,
   then the exact task/model/language calibration. An unsupported/missing head,
   unvalidated artifact, bad signal or uncertain attempt receives no grade.
7. Store an actual grade with the original take's immutable target and model
   provenance. It never changes listening/visual-memory stars. Changing cards,
   starting a new take or leaving the tab cancels pending work without losing audio.

The saved word, spoken prompt and calibration key are checked against the course
before assessment. A changed curriculum cannot silently reinterpret an older
take. Recordings without reliable target provenance remain replayable and ungraded.

Completed model sessions stay warm for at most one idle minute, so a repeated
attempt need not reload weights. There is only one worker/model session at a time.
In-flight cancellation, errors, a 30-second deadline, backgrounding or unmounting
release the worker. Cancelled results cannot attach to a successor take. These
lifecycle checks are automated; mobile speed and memory still need measurement.

`src/local-models.ts` defines the artifact contract. The shipped registry is empty
until actual artifacts qualify. `ScorePanel` shows that fact instead of an invented
constant score. The eight beta5 apps include this flow, but no enabled numeric grade.

## Actual encoder feasibility evidence

The pinned English phonetic encoder has been exported from the existing shared
cache to a **355,059,119-byte int8 ONNX candidate**. Source weights were not
duplicated or downloaded again. `tools/export-local-encoder.py` checks the pinned
source hash, dynamic lengths, finite output and original/quantized regressions.
`tools/test-local-runtime.mjs` runs that candidate through the same bundled
single-threaded WASM inference functions in a real browser worker. It does not
register a production model or upload audio.

The synthetic and one public adult **training-split** probe ran without external
requests or page errors. However, their CPU-versus-WASM log-probability regression
failed the strict numerical gate. The human probe's frame-wise top labels agreed,
but maximum probability difference was about 0.055. Agreement on a top label does
not prove that likelihood-based pronunciation scoring is stable. No calibration
has been approved, and neither probe is held-out accuracy or phone latency evidence.

The follow-up isolated the numerical difference to dynamic activation
quantization: full-precision CPU/WASM inference passed the unchanged strict gate;
reduced-range and unsigned dynamic variants still failed. A compact, per-channel
**weight-only int8 / FP32-activation candidate (355,826,608 bytes)** then passed
the same gate on synthetic input and four adult training-split speech clips.
No external requests or browser errors occurred. These are numerical compatibility
checks, not held-out pronunciation accuracy or mobile microphone evidence.

`tools/export-weight-only-encoder.py` reuses the original verified ONNX export;
`tools/requantize-local-encoder.py` retains the failed alternative trials. No source
weights, SDKs or previous reports are deleted or downloaded again. Weight-only
compression keeps package size down but may expand weights in runtime memory;
physical-device peak memory and speed remain unverified. Desktop inference takes
seconds, so this is not a proven fast mobile solution.

Next: validate the exact runtime emissions and per-contrast calibration on
disjoint human speakers, measure real mobile memory/latency, then package only
qualified models with attribution. Other language adapters/acoustic heads still
require development; one English encoder does not establish Mandarin, Cantonese,
Korean, Arabic or Japanese support. All-language offline scoring is still unfinished.

## Human evaluation — 2026-10-01

The exact weight-only English runtime was evaluated on 1,024 hash-selected adult
recordings from pinned speechocean762. The model fit used 57 official-training
speakers; calibration used ten different official-training speakers. The final
official-test set contained 61 different speakers (488 clips; 486 within the
predeclared duration/signal limits). No test-speaker recording was used to fit
the classifier or calibration. `tools/qualify-english-scorer.py` preserves the plan.

**This candidate failed the acceptance-error requirement.** Among 8,222 clearly
rated held-out phones, 320 were rated incorrect. At the predeclared probability
threshold of 0.8, 164 of those 320 incorrect phones were accepted (51.25%). The
speaker-cluster bootstrap 95% interval was approximately 45.0–59.4%. The false
rejection rate for correct phones was 1.44%. Low aggregate Brier error (0.0271)
and AUC (0.9109) must not be substituted for acceptable error detection in this
imbalanced corpus. Another 843 intermediate ratings were excluded from the binary
analysis and reported separately, not relabeled as correct. Individual phone
categories lack sufficient incorrect examples for a release claim.

`tools/summarize-human-validation.py` reports fixed-threshold uncertainty and
coverage without fitting or selecting thresholds. This final test is now a
consumed evaluation set: any subsequent tuning needs fresh independent evaluation.
No registry entry, release approval, app score, or production submission resulted.

## Error-balanced development and signal fixes — 2026-10-01

The follow-up fits our own small error-detection heads on the existing encoder's
acoustic evidence. It gives equal weight to correct/incorrect classes and to
speakers within each class, instead of rewarding an almost-always-correct answer.
This addresses the imbalance highlighted by [Score-balanced Loss](https://arxiv.org/abs/2305.16664);
it is not a reproduction of that paper's model or reported accuracy.

`tools/expand-english-development.py` completed all **1,340 adult official-training
clips**, preserving the original 57 training / ten development speakers. It reused
cached inference and never reopened official-test audio. The fitting tool refuses
an incomplete expansion. `tools/train-error-detector.py` compares balanced logistic
regression with a 150-tree nonlinear head; neither is registered in the apps.

The development split has 3,415 clearly correct and only 51 clearly incorrect
phones. At the inspected decision statistic 0.6, the nonlinear model misses 5/51
incorrect phones and rejects 327/3,415 correct phones (9.8% and 9.6%). Raising the
threshold to 0.8 misses 2/51 but rejects 598/3,415 (17.5%). These are development
trade-offs, **not a fresh test result or calibrated user score**. In particular,
the F, H, L and R development categories contain no clearly incorrect examples;
their acceptance-error rates are unknown, not zero. All-language and named-pair
accuracy remain unqualified. The earlier consumed test has not been reused for
these fits or threshold exploration.

The nonlinear head exports to a 201,052-byte numeric-tree artifact rather than
executable pickle. Its independent evaluator matched the original classifier on
all 3,466 development rows (maximum absolute difference about 1.1e-16). That is
head serialization parity, not proof of the complete mobile scoring pipeline.
Model/data artifacts remain private and unbundled. Missing acoustic values fail
closed. The exact report hash is
`5bded83af935fda6997c18755d74626a45a47330bc53acb2df90e401b0358d6b`.

The shared app signal analysis also had reproducible octave errors and treated
constant DC input as pitched sound. `src/pitch.ts` now uses a conservative,
independently implemented [YIN-style estimator](https://doi.org/10.1121/1.1458024):
equal-width differences, cumulative normalization, first acceptable minimum and
interpolation. It abstains on uncertain frames. Anti-aliased resampling replaces
sample dropping; AC energy prevents constant input from appearing to be speech.
Fifteen regression cases cover frequency, sample rate, DC, noise, harmonics,
rising pitch and short frames. A pitch trace is still not a word recognizer or
pronunciation grade. This source fix is not in the already-uploaded beta5 binaries.

The separate pinned OMPAL Mandarin annotation audit found 656 detailed clip IDs
absent from the canonical annotation mapping. They remain unresolved; no guessed
renumbering or pairing with audio is permitted. The detailed file has mostly
three ratings per item, not the overview's stated four. Canonical aggregate labels
are retained separately from unanimous individual ratings. This is data validation,
not a Mandarin model accuracy result. See `tools/prepare-mandarin-benchmark.mjs`.

## Compact English onset experiment — 2026-10-01

`tools/onset-model/` now trains an independent 9,461-parameter convolutional
classifier for initial **F, H, L, R and OTHER**. It borrows the compact front-end
idea from L & N, not its L/N weights or labels. `src/onset-features.ts` and
`src/onset-network.ts` implement the matching browser/native-WebView computation.
There are no default weights and no production registry entry.

The feature pipeline is 16 kHz PCM, a 300 ms window, 25 ms Hann frames with 10 ms
hop, a 512-point FFT and 40 HTK mel bands. Two temporal convolutions, mean/max
pooling and two dense layers produce five acoustic-class logits. A CTC-derived
window is only an approximate acoustic anchor; it is not a physical onset label.
The initial 80 ms pre-anchor lead and ±50 ms training jitter are explicit.

Training uses expert-high initial phones from 441 adult official-TRAIN
SpeechOcean762 utterances. The existing split is preserved: 57 training speakers
and ten development speakers, with 1,267 and 369 word-onset crops respectively.
The previously consumed official test set was not reopened. Equal-class and
within-class equal-speaker weighting reduces utterance-count imbalance. Noise,
gain and onset jitter are training augmentations, not new human observations.

| Development measurement | Per-band centering v1 | Global centering v2 |
| --- | --- | --- |
| Overall class accuracy, 369 crops | 68.29% | 69.92% |
| Mean recall across five classes | 74.11% | 68.92% |
| Previously unseen word accuracy, 61 crops | 67.21% | 59.02% |
| OTHER recall, 198 crops | 61.62% | 68.18% |
| L / R recall | 84.62% / 76.47% | 66.67% / 58.82% |

Global centering preserves average spectral shape, but **is not accepted as an
improvement**: its L/R and unseen-word results regress. Both artifacts and all
failed experiments are retained privately. Both Python-to-TypeScript artifact
checks match all ten retained argmax results, with maximum logit discrepancy
below 2.4e-6. Workstation CNN-only timing is not mobile or full-pipeline latency.

A fixed confidence/margin grid on those same development crops
did not find a point with at least 50% pair coverage, at most 5% accepted-label
error and at most 5% out-of-pair acceptance. High cutoffs mainly discard useful
attempts. Frequent hard negatives include W versus F/R, M versus L and vowels
versus H. OTHER here is unrelated **speech**, not silence/noise/device OOD coverage.
No class softmax is a calibrated pronunciation grade. Reusing this development
set to select checkpoints or thresholds is not fresh held-out validation.

Reproduce using the shared research Python environment with NumPy, PyTorch and
ONNX Runtime; preserve existing output folders:

```sh
python tools/onset-model/build-dataset.py --out .runtime/onset-new
python tools/onset-model/train.py .runtime/onset-new/dataset.npz .runtime/onset-new/cnn
node tools/onset-model/verify-runtime.mjs .runtime/onset-new/cnn
```

The builder only uses existing cached, pinned corpus audio; it does not fetch
audio implicitly. Model JSON contains bounded numeric weights rather than pickle.
`tools/onset-model/audit-confidence.py` retains full development outputs and
reports counts, coverage and uncertainty rather than hiding errors by evaluating
only the displayed pair. All artifacts remain unapproved and unbundled.

## Scoring-path corrections

- An impossible CTC competitor has log probability `-Infinity`, not corrupted
  evidence. It now contributes zero mass while the combined alternative must
  remain finite. NaN, positive infinity and an empty alternative mass still fail.
- Accepted pronunciation variants are deduplicated and acoustic anchors are
  marginalised over their sequence probabilities. Their order no longer chooses
  the measured sound region. Existing calibrations must not be reused without
  evaluating this changed feature extractor.
- Decode/preprocessing errors return structured unscored results. Cancelling or
  replacing an assessment prevents its late worker reply from becoming a score.

## Mandarin feasibility probe

`tools/audit-mandarin-heads.py` reconstructs the inspected standard Wav2Vec2
encoder and independent initial/final/tone CTC heads from a pinned cached research
checkpoint. It does not execute remote model code, download weights, or merge
independent head token lists into invented syllables. Blank, unknown and ZERO
initial remain distinct. All seven short synthetic probes completed, but outputs
included questionable finals/tones and a z/j mismatch. These unauditioned TTS
probes establish inference feasibility only, not model errors against verified
human ground truth or Mandarin learner accuracy. The large checkpoint is not
approved for commercial bundling or enabled in any app.

## What each small part needs

The exact exercise-to-head mapping is in `src/scoring-profiles.ts`; every exercise
has a contrast plan or an explicit non-graded exception. Do not attach one generic
transcription percentage to every app.

| Course | Separate measurements and invariances |
| --- | --- |
| H & F | English h/f vs Mandarin x/f; frication spectrum and vowel transitions; final f/v adds voicing/context |
| L & R | Position-aware L/R posteriors and F2/F3 trajectories; accepted bunched/retroflex R and dark L; no fixed-F3 rule |
| English | Speaker-normalized vowel quality/trajectory, not duration alone; frication/place/voicing for TH; closure/release for manner; preceding vowel and coda context for endings |
| Mandarin | Place/aspiration/manner in valid syllables; whole-final vowel/nasal transition; context-aware relative-F0 tone head with sandhi and voicing coverage |
| Korean | All three plain/aspirated/tense competitors, VOT jointly with vowel-onset F0/phonation; word-position variants; no penalty for modern ae/e mergers |
| Arabic | Letter names versus vowelled syllables; place/emphasis/geminates in Standard Arabic context; shape recall is separate |
| Cantonese | Six-tone competition, speaker-relative register and contour; aa/a quality plus duration; initial/coda context and unreleased stops; initial n/l variation ungraded |
| Japanese | Contextual h/b/p and voicing; relative mora duration for long vowels/small tsu/small y-kana; explicit contextual word readings; no English L/R head and no grade for same-sound script forms |

## Release qualification still required

- Licenses for weights and data, accent/phone coverage, correct versioned adapters.
- Speaker/source-disjoint human development/calibration/test evidence per contrast;
  use the existing `docs/SCORING-DESIGN.md` gates and report coverage/error intervals.
- Quantized versus original regression on identical real clips; no fake approval
  flag or synthetic TTS data substituted for expert-labelled learner evidence.
- Actual offline inference and recording tests on iPhone/iPad, Honor/Mi10Pro/modest
  Android; measure peak memory, startup, p95 latency and battery. An app may be large,
  but an unbounded model can still crash a phone.
- Real correct/confused/wrong-word/silence/noise tests, permission recovery,
  background cancellation, repeated playback, storage failure and preserved history.
- Rebuild native releases with unique build numbers only after qualification.
  Formal reviews are held rather than submitting an unsupported accurate-score claim.

References: [ONNX Runtime Web](https://onnxruntime.ai/docs/tutorials/web/),
[runtime flags](https://onnxruntime.ai/docs/tutorials/web/env-flags-and-session-options.html),
[quantization guidance](https://onnxruntime.ai/docs/performance/model-optimizations/quantization.html).
L & N informed recording/permission/replay and short-word retry handling. Its L/N
classifier and heuristic weights are **not** reused as universal phonetic scoring.
