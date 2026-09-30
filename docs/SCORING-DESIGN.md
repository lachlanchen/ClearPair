# Contrast-first scoring specification

Status: implementation and validation in progress, **not a claim of validated scoring**.
All seven apps require listening/recognition practice AND spoken-production scoring.
Signal quality and quiz accuracy are useful but do not satisfy pronunciation scoring.

The learning claim is **“Practise what you mix up. Learn the difference.”** A learner
must learn which distinction was lost, not merely receive a generic percentage.

## Shared inference path

1. Capture native PCM on iOS/Android, browser PCM/decoded audio on PWA. Keep original
   compressed audio for export. Resample once to the model's required rate.
2. Quality gate: duration, speech activity, clipping, noise, interrupted capture.
   Quiet recordings may be boosted for feature extraction, but confidence must not
   be boosted with amplitude. No speech means **no score**, not zero or a default.
3. Align against a pronunciation lattice containing the target, named confusions,
   accepted accent/context variants, silence, omission and unrelated-speech paths.
   Do not force every utterance to match the text printed on screen.
4. Use phone posterior evidence and contrastive likelihood ratios on the aligned
   target region, including transitions. ASR text is an optional content check,
   never the pronunciation grade. For short words, offer a carrier sentence, align
   the target inside it, and score the target—not the well-spoken carrier phrase.
5. Combine language-specific acoustic evidence with a calibrated contrast head.
   Exact feature normalization, weights, reliability thresholds and calibration
   tables are model artifacts learned from speaker-disjoint labelled recordings.
6. Abstain if alignment, model coverage, accent assumptions or disagreement makes
   the conclusion unreliable. Explain the retry action; do not reward uncertainty.
7. Report target contrast score, uncertainty, highlighted sound, and one actionable
   teaching cue. Track listening and speaking progress separately.

## App-specific heads

| App | What the scorer must distinguish | Supporting evidence, not standalone rules |
| --- | --- | --- |
| H & F | English /h–f/, Mandarin /x–f/, optional final /f–v/ | Frication spectrum and duration, spectral transitions into the vowel, voiced/unvoiced evidence; different models for English h and Mandarin h |
| L & R | /l–ɹ/ at initial, cluster and final positions | Context-normalized F2/F3 trajectories, lateral/approximant posteriors, consonant-to-vowel transitions; support bunched and retroflex R, don't infer exact tongue shape from audio |
| English | Vowel quality/trajectories, TH/s/z/d, manner, voicing, endings | Speaker-normalized formant trajectories, spectral moments, VOT/closure and release, final consonant alignment; length alone cannot classify tense/lax vowels |
| Mandarin | z/c/s versus zh/ch/sh and j/q/x; aspiration; ü; nasal finals; tones | Sibilant spectra, release-to-voicing timing, vowel trajectories and nasal transitions; normalized F0 shape with voiced-frame coverage, sandhi/context alternatives |
| Korean | Plain/aspirated/tense series, vowel confusions, syllable blocks, batchim | **Three-way** competing classes even in a two-card drill; VOT jointly with vowel-onset F0 and phonation cues; position/allophony-aware lexicon; ㅐ/ㅔ merger not penalized |
| Arabic Letters | Spoken letter names and later consonant-in-syllable drills; pharyngeal/velar/uvular/emphatic contrasts | Separate name pronunciation from isolated letter sounds; segmental posteriors, frication, vowel transitions, duration and emphasis evidence; explicit Standard Arabic model and accepted regional variants |

Korean visual memory and Arabic dot/join identification have a separate recall score.
They must never be presented as pronunciation scores. Likewise “shape identified
correctly” cannot imply that a spoken letter name was pronounced correctly.

## Calculation and calibration

For a target segment x and competing pronunciation c, use length-normalized acoustic
evidence: `LLR_c = (log P(x | target) - log P(x | c)) / aligned_frames`.
Phone-posterior mass for other sounds remains in the denominator: the system must not
decide that arbitrary noise is one of the two displayed words just because it has to
choose. Treat CTC blank explicitly and do not pretend a raw CTC emission is a precise
phone boundary. Test alignment perturbations and context transitions.

The learned head combines LLRs, alignment features and the relevant acoustic cues.
Calibrate on a held-out development split (e.g. isotonic regression or temperature
scaling), then evaluate once on the untouched test split. A displayed 0–100 value is
100 × calibrated estimated correctness for the **target contrast**, not percent
native, medical intelligibility, or transcription accuracy. If calibration does not
support that interpretation, use categorical feedback rather than a numeric score.

No hand-tuned rule such as “F3 below a fixed number = R” or “long = sheep” is sufficient.
No unvalidated waveform-distance-to-one-TTS-voice grade will be shipped. TTS samples
can catch swapped labels and obvious pipeline failures, but are not human validation.

## Model candidates and licensing

- Meta's [XLSR phoneme CTC checkpoint](https://huggingface.co/facebook/wav2vec2-xlsr-53-espeak-cv-ft)
  exposes phonetic labels, requires 16 kHz audio and lists Apache-2.0. Candidate for
  an offline evaluation backend, not evidence of accuracy in every target language.
  Inspect training coverage, label inventory, model/data terms and conversion before
  shipping. Pin revision and hashes; reuse shared model cache.
- [MMS](https://huggingface.co/facebook/mms-1b) lists CC-BY-NC-4.0. **Do not bundle it
  in a commercial app** without separate suitable rights.
- [Allosaurus](https://github.com/xinjli/allosaurus) is GPL-3.0 in the inspected repo;
  not a drop-in permissive mobile dependency. Its documented approximate timestamps
  are also not validated alignment boundaries.

Target runtime: a shared compact encoder plus language/contrast heads, with identical
feature extraction and golden fixtures on Core ML/ONNX/native Android/WebAssembly.
Keep model inference off the UI thread. Quantization must pass regression before use.
Do not launch one-language offline scoring and imply that all seven apps are covered.
Cloud scoring, if later needed, requires explicit user choice and truthful privacy copy.

## Acceptance gates (targets, not achieved measurements)

- Label correct, confused, other-word, uncertain and non-speech attempts with at least
  two qualified listeners; adjudicate disagreements. Do not label “native” = correct.
- Stratify by contrast, language, learner background, voice range, age where supported,
  Android/iOS mic, headset, noise and word/sentence context. No speaker, recording or
  source-clip leakage across training/development/test splits.
- At least 30 held-out speakers and 100 correct + 100 confused examples per contrast
  before enabling a numeric score; increase data when uncertainty remains wide.
- Pre-register acceptable false-rejection and false-acceptance bounds per contrast.
  Initial engineering target: each <=10% with reported confidence intervals, plus
  calibrated uncertainty. Report coverage/abstention separately; high abstention is
  not a way to hide poor results. Publish unaggregated difficult-contrast results.
- Include silence, taps, music, very short speech, another language, unrelated words,
  reversed pairs and merged-accent controls. These must never receive a confident pass.
- Compare baseline vs candidate on the same clips. A change must not silently improve
  English and regress Mandarin/Korean/Arabic. Keep rollbackable model versions.
- Real-device latency/battery/memory and airplane-mode tests on iPhone and Honor Magic
  7 Pro, plus a modest Android device. Targets: feedback <=1.5 s p95 after a short
  utterance on reference devices; record measured values rather than promise them.

`src/validation.ts` implements the initial offline engineering checks: separate
per-contrast error rates, assessment coverage, Brier error, calibration bins and
Wilson intervals. Speaker and source-clip identities cannot cross dataset splits;
synthetic or unresolved labels do not count as human validation. Initial targets
also require at least 50 unrelated and 50 non-speech controls, >=80% coverage for
both correct/confused attempts, calibration error <=0.08 and Brier error <=0.10.
These are engineering targets, not achieved accuracy. Clip-level Wilson intervals
are only an initial check: final evaluation must also account for repeated takes
from the same speaker (clustered confidence intervals and subgroup analysis).
Passing this function does not set a production calibration's `approved` flag.

## Research basis

[Chen et al., SLaTE 2019](https://www.isca-archive.org/slate_2019/chen19_slate.pdf)
studies minimal-pair errors using competing-phone likelihoods and phonological
features. Its real-learner results also show why a reasonable method is not enough
to claim low error rates without validation on the intended users.

[Ryu and Chung, SLaTE 2017](https://www.isca-archive.org/slate_2017/ryu17_slate.html)
explores articulatory-feature feedback for place, manner, voicing and vowels.
[Context-aware GOP](https://arxiv.org/abs/2008.08647) motivates preserving transitions
and surrounding context rather than treating every aligned phone independently.
[Lee et al., Interspeech 2022](https://www.isca-archive.org/interspeech_2022/lee22n_interspeech.html)
addresses cue weighting in Korean three-way stop perception.

## Current delivery status

The local waveform, quality analysis, listening quizzes and recording history are
implemented. The scoring evidence contract, calibration/refusal gates, app-specific
exercise routing and forward/backward CTC alignment are implemented and unit-tested.
The alignment retains phone-position posterior uncertainty: a conditional alignment
is not proof that the learner said the prompt. Sentence scoring requests select only
the target's phone positions, and cannot reuse a word-only calibration.

`src/scoring-profiles.ts` explicitly routes every exercise to a versioned acoustic
profile or an ungraded exploration. English H and Mandarin H have different profiles;
Korean stop exercises retain all three competitors; Arabic names and short-vowel
syllables have different assessment units. Accent mergers do not receive a wrong-sound
penalty. `scorePlannedContrast` rejects evidence for the wrong exercise, side, language,
profile version or prompt context. The production calibration registry remains empty.

**No language has passed the human-labelled scoring acceptance gates yet.** Do not
describe the seven apps as finished or publish a store claim of accurate scoring until
the relevant gates have evidence.

## Reproducible candidate audit

`tools/audit-phone-model.py` runs pinned public model revisions on original-text
synthetic references using a shared cache and four CPU threads. It records model/audio
hashes, raw phone outputs, emissions and measured workstation inference time privately
under `.runtime/model-audit/`. This is not human accuracy or phone-device latency.
It does not upload recordings, enable scores or execute remote model code.

The first 16-reference multilingual-model probe and a 22-reference Korean-specific
probe exposed questionable phone outputs on short references. The Korean inventory
represents plain/aspirated/tense stops explicitly, but that alone is insufficient.
Reference clips have not yet been human-auditioned, so this is a
pipeline warning, not a measured model error rate. The candidate is not release-ready.

Language-specific candidates under evaluation:

- [Korean phone model](https://huggingface.co/slplab/wav2vec2-xls-r-300m_phone-mfa_korean):
  native read-speech training, explicit Korean phone inventory, Apache-2.0 metadata.
  Its reported native-corpus error rate does not establish learner-contrast accuracy.
- [Arabic phone model](https://huggingface.co/MostafaMaroof/wav2vec2-arabic-phoneme-asr):
  its newer inventory preserves emphasis, hamza and geminates. The model card identifies
  synthetic-data and short-vowel limitations. Standard-Arabic letter names need their
  own evaluation; recitation results are not a substitute.
- [English phone model](https://huggingface.co/vitouphy/wav2vec2-xls-r-300m-timit-phoneme):
  an English-specific front end to compare with the multilingual baseline, not an
  already-calibrated ClearPair scorer.
- [Charsiu](https://github.com/lingjzhu/charsiu): English/Mandarin alignment candidate.
  Frame-classification outputs need the correct alignment objective, not CTC blank
  semantics. Resolve checkpoint licensing and tone coverage before integration.

Model-card license tags are preliminary checks, not a completed distribution audit.
Do not bundle any candidate until its weights/data terms, label inventory, accent
policy, quantized accuracy and on-device performance have been checked.

## Context-preserving edit evidence

`src/contrast-lattice.ts` now implements an additional uncalibrated acoustic feature
path. The left and right phone context remain identical while the target region
can be an accepted variant, a named confusion, an omission, another inventory phone
or a one-phone insertion before/after the accepted target. CTC sums over timing
paths; no hard consonant boundary or transcript-string comparison is required.

This approach is informed by [Cao et al., Interspeech 2024](https://www.isca-archive.org/interspeech_2024/cao24b_interspeech.pdf),
which studies context-preserving CTC probability ratios with substitution/deletion
and insertion hypotheses. Our finite candidate enumeration is **not a reproduction
of that paper's unrestricted insertion graph**, nor does it inherit its reported
performance. Longer edits remain outside the listed set.

Implementation safeguards:

- Sum the probability of each distinct collapsed phone sequence once. Duplicate
  variants cannot increase its mass; a sequence assigned to both target and confusion
  is rejected as an unsupported distinction.
- Preserve `unlistedLogLikelihood = log(1 - P(listed sequences))`. Arbitrary speech,
  wrong carrier context and longer/unlisted edits are not forced into the pair.
- `targetGivenListed` is a **conditional diagnostic feature, never a score or content
  confidence**. It can be high while every listed hypothesis is extremely unlikely.
  The complementary mass is not, by itself, a calibrated OOD detector either.
- Korean plans must supply all three named stop categories. A tone-only contrast
  cannot be evaluated by an inventory that collapses the two tone pronunciations.
- A prepared immutable emission snapshot avoids revalidating the full probability
  matrix for every alternative. Work and sequence limits bound evaluation cost.

Exhaustive tiny-path tests check the union/complement against direct enumeration;
other tests cover silence, omissions, insertions, third categories, wrong context,
duplicate variants and repeated-phone/blank semantics. These are mathematical
fixtures, not evidence of learner accuracy.

`tools/audit-contrast-lattice.mjs` applies this exact TypeScript implementation to
the pinned English candidate's stored reference emissions. Its vocabulary adapter
explicitly records affricate spellings and the checkpoint's AH/schwa collapse;
it cannot assess stress or distinctions that those aliases remove. Results stay
private and uncalibrated. It does not enable any production score.

The initial 43-clip English probe uncovered a concrete adapter issue: the checkpoint
emits non-phone spaces and word delimiters. Treating those as missing phonemes made
otherwise plausible sequences extremely unlikely. `mergeCtcSeparators` now projects
only those explicitly identified labels to blank, preserving their probability and
unknown-token mass. Repeated-phone boundaries remain tested. This is a versioned
checkpoint-specific transformation, not permission to merge confusing sound classes.
The corrected 23-lesson probe still has questionable reference results, including
vowels and TH; neither the model nor the unauditioned synthetic references are approved.
The Arabic-specific model also completed 23 reference probes, with questionable
letter-name outputs; phonetic audition and human contrast validation remain open.

## Human-speech development benchmarks

The authors' [speechocean762 repository](https://github.com/jimbozhang/speechocean762)
provides English learner speech with five independent expert ratings and permits
commercial/noncommercial downloads. `tools/prepare-human-benchmark.mjs` pins its
revision, hashes source metadata, checks speaker-disjoint official splits and prepares
at most 40 adult **training-split development** utterances. Expert intermediate
ratings are not automatically treated as wrong; a low rating may indicate omission
or a different error, not necessarily our displayed confusion. The official test
audio remains untouched for later evaluation.

`tools/audit-phone-model.py --candidate english --human-development --limit 40`
can fetch only that bounded, verified source into ignored private storage and reuse
the already-cached model. `tools/evaluate-human-probe.mjs` compares at most three
expert-high and three expert-low phones per utterance. The deliberately selected
sample, uncalibrated conditional features and correlated observations **cannot
establish deployment accuracy or enable a grade**. Source and adapter caveats stay
in its receipt. These human development diagnostics supplement, not replace, the
target-contrast validation protocol above.

The first bounded run processed 37 utterances (three exceeded the 12-second practice
window) and 160 selected phone comparisons from 28 adult speakers. One utterance's
context was unsupported. Most individual phone categories are too sparse for even
an exploratory comparison; no release acceptance gate was closed by this run.

For Mandarin, [OMPAL](https://github.com/phantomhsieh/OMPAL-corpus) is a relevant
CC-BY-4.0 research source: French learners with expert consonant/vowel/tone ratings.
It is not yet imported here and does not represent every learner background or our
short-word/device conditions. It should inform development without being described
as ClearPair's completed release validation.

Do not substitute an alignment model for a pronunciation assessor:
the [Mandarin MFA model card](https://huggingface.co/MontrealCorpusTools/mandarin_mfa)
explicitly identifies pronunciation assessment as outside its intended capabilities.
An aligner accepting a phone sequence is not evidence that the phone was correct.
