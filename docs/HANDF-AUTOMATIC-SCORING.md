# H & F: one recording, automatic feedback

Build 1.0.0 (7) added automatic spoken-contrast feedback to all eight apps.
Candidate (8) keeps that flow and compacts the screen around the word pair,
waveform, recording button and result. H & F has a dedicated consonant-focused
analyser; its numerical result remains a designed reference comparison.

Tap **Record your voice**, say the displayed word, then pause. After sustained
speech and 750 ms of quiet, recording stops and local scoring starts. **Stop and
score** does the same immediately. Sentence practice allows a longer 1.2 s pause.
There is no required Assess step. The record control and waveform stay above the
results, so the next take uses the same button position. Recordings remain in History.
Spoken exploration exercises also stop after a pause, without inventing a grade.
The idle timer and Learn hero are removed. Replay/export and optional technical
details sit below the result; playback controls cannot overlay the record button.

## Consonant-focused analysis

The existing L & N end-of-word flow provided the interaction pattern. Its nasal
classifier is not reused for unrelated fricatives. H & F has a dedicated analyser:

1. Decode the actual microphone recording and resample to 16 kHz.
2. Compute 25 ms windowed FFTs at 10 ms intervals, 32 mel-band spectra, cepstra,
   AC energy and periodicity evidence.
3. Find the consonant and vowel transition, retaining weak initial H. Combine a
   sustained energy rise with nearby pitch evidence; intermittent pitch must not
   shift a Mandarin onset into its nasal ending.
4. Compare consonant spectra and consonant-to-vowel spectral differences against
   both displayed words. Relative spectra reduce gain and microphone-colour
   differences. English H/F and Mandarin H/F use their own language references.
   Final F/V additionally considers partial voicing and the ending transition.
   Mandarin uses a stronger consonant-to-vowel energy contribution; sentence
   duration contributes less because carrier context can shorten friction.
5. Show target-sound separation, shared word/vowel match and relative sound timing.
   The overall index weights sound separation 80% and word match 20%, so a shared
   vowel cannot dominate the score for a confused consonant.
6. In sentence mode, symmetrically search for either displayed word before
   extracting the consonant; the chosen card does not determine its location.
   The authored Mandarin carrier restricts the search to its final-word region
   and excludes preceding-vowel padding from the fricative segment.

The result preserves the reference voice, distances, segment duration, target,
detected side and analyser version in local history. Silence, noise, missing
segments and uncertain comparisons produce retry guidance. Device synthesis is
silent during analysis and microphone recordings are never uploaded.

If consonant segmentation fails but the opposite whole word is a clear match
with audible edge friction, candidate (8) retains a low **word-level comparison**
and shows “Closer to” the opposite word. It does not claim a detected consonant.
The fallback uses contrast agreement, not the shared vowel's similarity, so an
opposite word cannot receive a high score from its vowel. Vowel-only, weak or
ambiguous matches and sentences remain ineligible for this fallback.

These are designed comparison indices. Constants are not trained calibration,
and human pronunciation accuracy is still being evaluated. Numerical timing is
relative to the reference, not a requirement to imitate its speaking speed exactly.

## Phonetic basis

Fricative evidence depends on context and speakers; one frequency cutoff is not
a dependable classifier. English research discusses vowel-like H and the limited
perceptual information in isolated F friction ([English F/S/H study](https://pmc.ncbi.nlm.nih.gov/articles/PMC4917926/)).
Mandarin recordings show different spectral distributions for F and velar H
([Yang et al., 2018](https://people.ohio.edu/xul/yang2018jasa.pdf)). These findings
motivate the feature choices; their reported results do not validate this app.

## Phone test

Engineering checks for this candidate passed all 16 word pairs on the isolated
iOS simulator and the physical MIX2S using actual native silent voice rendering.
Correct-reference and opposite-reference cases were tested on both sides. Three
sentence routes on both platforms also passed native reference generation,
target search and the actual scoring worker. Browser tests passed repeated automatic stopping,
manual stopping, fixed control positions, recording storage and replay. These
tests establish the software path; they do not establish accuracy on human speech.
The family regression suite passed 387 unit tests (three existing skips) and
47 browser tests across all eight apps.

Update H & F without uninstalling. Try hat/fat, hit/fit and heat/feet, then each
Mandarin pair and leaf/leave. Say the selected word and its opposite deliberately.
Start speaking immediately after tapping Record, pause briefly within a sentence,
record again while an older result is processing, and replay both takes in History.
Report the selected word, what you said and the three result values.

The release receipt records actual availability after upload; this document alone
does not claim the candidate is in TestFlight or Google Play.
