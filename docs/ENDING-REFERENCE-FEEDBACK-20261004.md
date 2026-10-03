# Recognizer disagreement on weak endings

Mandarin n/ng and English final fricatives can be recognized as the same word
on both sides of a pair. A fresh Android regression exposed 林/零 in sentence
mode and mouth/mouse as isolated words. Quiet endings sometimes provide too few
focused frames to report a measured consonant even when the whole-word reference
comparison distinguishes them.

The hybrid scorer now retains a **provisional practice match** in this bounded
case. It requires clear/quiet captured speech, a final-position Mandarin nasal
or English fricative task, a tight reference fit, separated distances and a
strongly directional reference index. The same gate applies in both directions:
it can prevent false rejection or lower false acceptance. It never replaces the
recognizer's text, invents n/ng or TH evidence, or changes an unrelated transcript
into a confirmed target. Points are capped at 59 while the ending is unmeasured.
Identical references and loose fits retain the ordinary word-only path.

The headline says Practice match for conflicting unmeasured evidence. Actual
recognized words, disagreement and the unmeasured contrast remain visible.
Word/contrast/duration card order and the fixed centered Record control are
unchanged. Saved recordings, waveform and historical results are preserved.

Validation on the current candidate:

- Mandarin: fresh native focused 30/30 on iOS and Android; baseline full 310/310
  iOS and 308/310 Android; corrected pure feedback over retained full native
  evidence 310/310 on each. The latter is not another decoder execution.
- English: fresh native full 326/326 iOS and 324/326 Android; corrected pure
  feedback over retained full evidence 326/326 on each; fresh native focused
  ending follow-up 34/34 on both platforms.
- L & R: current native 98/98 on each platform; its profile does not enter this
  final nasal/fricative exception.
- Unit regressions cover both directions, rounded threshold boundaries,
  unmeasured provenance, identical/loose references and unrelated transcripts.
  Layout fixtures pass 308 cases across seven courses and eleven UI languages.

These are synthetic saved-PCM runtime and algorithm regressions, not a
calibrated human pronunciation accuracy study. Existing H & F 15 and previously
frozen Arabic/Korean/Cantonese/Japanese packages are unchanged. New candidate
identities are Mandarin 10, L & R 11 and English 11; availability and formal
review are recorded separately after provider verification.
