# Contrast-focused scoring update

This is the next source update after the uploaded **1.0.0 (8)** apps, not an
assertion that an installed build has already changed. Build 8's review and
test states are recorded separately in [its receipt](BETA-1.0.0-8.md).

## Borrow the useful separation from L & N

L & N separates word/content evidence from evidence for the difficult consonant.
ClearPair now extends that idea to the contrasting region of each displayed
pair, rather than allowing a long shared vowel or a well-spoken carrier phrase
to dominate a short consonant. It does not reuse L & N's L/N network to classify
unrelated sounds.

| Route | Measurement in this update |
| --- | --- |
| English and Mandarin H/F, final F/V | Existing segmented frication FFT, friction relative to the vowel, timing and final voicing; weak edges are retained |
| L/R, English consonants/endings, Mandarin initials/finals, Korean contrasts, Cantonese consonants, Japanese voicing | Pair-disagreement mask within an initial, vowel, final or whole-word position prior |
| Vowel contrasts | Local spectral-envelope comparison; a long/short-only rule is not used |
| Mandarin/Cantonese tone, Japanese mora timing, Cantonese aa/a | Existing relative-pitch or joint spectral/duration path remains; the new spectral mask does not pretend to measure pitch or mora duration |
| Same-sound script or accent-merger exploration | Remains ungraded |

The on-device worker extracts 25 ms FFT/mel/cepstral frames at 10 ms hops.
Bounded dynamic time alignment first finds the differences between references A
and B. One symmetric take-to-pair path then compares the recording against both
references over that supported region. A/B stay in curriculum order when the
selected side switches. At least several differing reference and recording
frames are required: one spectral artifact cannot create a contrast.

Focused routes combine 80% contrast agreement with 20% word-reference similarity.
A clear match to the other displayed word is capped at 45, with “Closer to”
feedback. Silence, invalid input and indistinguishable device readings still
receive no score. These are designed, inspectable comparison indices—not learned
or calibrated correctness probabilities. H/F keeps its separate sound/vowel/timing
items; other routes expose word match, the measured contrast region and speech
duration. All added labels are available in the 11 UI languages.

Non-H/F sentence mode retains its existing whole-sentence comparison in this
update. H/F still locates the target word within its carrier before assessing
the consonant. Do not describe the new word-level mask as a phoneme aligner or
claim target-only sentence scoring across all courses.

## Fix quiet and short capture without accepting silence

- Availability uses active-frame AC energy, not whole-recording energy diluted
  by auto-stop silence. A natural 220 ms word need not last 700 ms.
- The normalized pitch periodicity test retains clean low-gain speech; its
  numerical floor no longer rejects it before periodicity is checked.
- After finding substantial speech, up to 200 ms of weak onset/ending activity
  is retained. A 30 ms quiet gap stops ending retention, so a later noise burst
  is not appended as a consonant.
- Auto-stop uses separate speech/offset gates, sustained speech and a natural
  pause. Tap-to-stop remains available. The 12-second safety cutoff remains an
  internal recovery limit, not the learner-facing recording instruction.
- English TH position follows the displayed IPA: teeth/teethe, mouth/mouse and
  breathe/breeze are final contrasts; clothing/closing is not forced into an
  initial window.

The same investigation found that Cantonese 波/坡 could be read identically.
The next curriculum uses verified 標 `biu1` / 飄 `piu1`; details and dictionary
attribution are in [the Cantonese notes](CANTONESE.md). Original recordings retain
their frozen words/prompts and are not silently reassessed as replacement words.

## Verification and release boundary

Synthetic fixtures test gain changes, short voiced words plus silence, weak
fricative edges, opposite targets, swapped sides, speed changes, irrelevant shared
vowels, identical references, one-frame artifacts, noise, DC and taps. UI tests
cover visible score items and cancellation; browser tests cover repeated recording,
automatic stop, History/replay, app identities, responsive layouts and languages.

Native tests generate references through the actual Swift/Java voice plugin and
run the actual scoring worker. The iOS QA helper verifies transferred asset
hashes and uses only its owned headless simulator. These are functional and
robustness checks, not human microphone accuracy percentages. Real-world learner
and device accuracy remains a separate measurement; no model is promoted to the
calibrated registry by these checks. No microphone audio is uploaded by this path.

The final source passes 427 unit tests (three existing skips), all eight web
builds and 47 browser regressions. All 86 spoken lesson routes pass the native
iOS sweep with correct/opposite recordings, both selected sides, quieter takes
with trailing silence, repeat synthesis, silence refusal and the scoring worker.
The stronger quiet-take checks caught and verified fixes for final-fricative
trimming and final-TH position, rather than merely checking that a number appeared.

Existing recordings, icon versions and build-8 signed artifacts are preserved.
The new source does not alter build 8's pending iOS reviews or deploy the PWA.
