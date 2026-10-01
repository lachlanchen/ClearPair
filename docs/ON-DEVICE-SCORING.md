# On-device contrast scoring

Status: inference/scoring integration under test. **No production model has
passed human accuracy and physical-device gates. Numeric grades are not enabled.**
The user requires scoring inside the iPhone, Android and PWA applications, not on
a backend, and accepts larger installation sizes. There is no cloud fallback,
audio upload, paid provider or server inference in this implementation.

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
until actual artifacts qualify. `ScorePanel` shows that fact instead of a invented
constant score. Existing beta3 has no scoring flow; current source is a new candidate.

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

Next: investigate runtime/quantization differences, validate the exact deployed
emissions and per-contrast calibration on disjoint human speakers, measure real
mobile memory/latency, then package only qualified models with attribution. Other
language adapters/acoustic heads still require development; one English encoder
does not establish Mandarin, Cantonese, Korean, Arabic or Japanese support.

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
