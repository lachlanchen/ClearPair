# H & F: stable analysis and bounded initial-friction recovery

Build 15 keeps build 14's on-device word decoding, completed-partial recovery,
per-take Apple support checks, saved-audio assessment and recording History.
The owner's iPhone SE 3 feedback says recognized wrong words are now useful.
No owner audio was retrieved; this update does not claim a diagnosis of every
phone take or calibrated pronunciation accuracy.

## Layout and evidence

The recording button is centered independently of its state. H & F no longer
shows a timer beside it. Internal capture duration and silence-based stopping
remain intact. Results have one order across measured, word-only and unresolved
takes: **Word match → Target sound → Speech duration**. Timing analysis is still
available in collapsed Details instead of replacing the duration card.

If word identity supports H/F but a consonant cannot be independently measured,
the sound card shows the recognized word's sound and explicitly says **Word
evidence**. This is not an acoustic grade. It follows the actual recognized side,
not the selected target, and Mandarin H is displayed as /x/. Unknown, unrelated,
missing and conflicting evidence never gets an invented phoneme or score.
Existing word-only and provisional score caps remain. Old History results keep
their original provenance. The new label is translated in all 11 UI languages.

## Algorithm

The existing FFT segment comparison uses fricative-to-vowel spectral differences,
relative energy, duration and voicing. A replacement that moved every initial
boundary to local periodicity was evaluated and **rejected**: on the cached
72 human crops its incorrect identifications increased from 7 to 17.

The shipped recovery is narrowly bounded. Only when the existing detector would
discard an initial consonant, it checks for a stable local vowel after an entirely
unvoiced prefix of at least 40 ms with peak energy above the periodic-vowel peak.
This prevents loud short F friction from being mistaken for the vowel through
the legacy 80 ms look-ahead. It does not reinterpret a vowel ramp as a consonant,
change valid existing H/F boundaries, or alter final F/V segmentation. Initial
analysis is versioned `hf-segment-fft:v3`; final F/V remains v1.

The bounded candidate preserves the cached human audit's baseline counts:
5 identified correctly, 7 incorrectly, 60 without a closest word. Those crops
contain mostly *he*, no hat/fat, and are not a calibrated learner test. These
figures qualify only non-regression; they do not establish standalone classifier
accuracy. The offline word-plus-acoustic route remains important.

Fricative cues are multidimensional, not a universal fixed frequency threshold;
see the primary research on [fricative spectra and amplitude measures](https://pmc.ncbi.nlm.nih.gov/articles/PMC10540850/).
No new trained network, cloud scoring or recording upload is introduced.

## Verification before packaging

- 519 H/F-enabled tests passed, 3 skipped; type checking and diff checks passed.
- Browser checks covered 12 repeated synthetic-stream captures at iPhone SE-sized,
  Android-sized, iPad-sized and desktop viewports. The record button stayed
  centered and at the same document position before, during and after capture.
- Measured, word-evidence and unresolved result layouts passed in all 11 UI
  languages at 375 px, with no overflow or page errors: 45 layout/lifecycle cases.

Browser synthetic streams and native synthesized-reference probes are plumbing
and regression checks, not live learner microphone validation. Native delivery
evidence is recorded separately after verified processing and distribution.
