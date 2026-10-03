# Sequential scoring improvement

Owner request: finish H & F first, then improve the other seven apps slowly,
one at a time. Reuse dependable capture, cancellation, History, playback,
evidence provenance and compact layout. Do not copy an H/F classifier or an
English word dictionary onto another language's contrasts.

H & F build 15 is owner-approved and remains unchanged. The seven other courses
now have independent unrestricted on-device word recognition plus language-
specific contrast handling. Exact test distributions and formal review states
are recorded in `store/artifacts/`; a test upload is not a production approval.
Mandarin's current candidate additionally preserves cautious word-reference
feedback when final n/ng recognition collapses to one spelling without enough
focused evidence to call the ending measured. Actual transcripts stay visible.

The next curriculum milestone, requested 2026-10-04, expands sound/letter
inventories and useful contrasts, including Mandarin and Cantonese tone
categories and tone sequences. Research uses primary teaching references and
privately retained tutorial captions. It is queued after the current scoring
release, not inserted into already frozen binaries. Script inventories,
phoneme inventories and contextual realizations must be tracked separately;
accepted dialect mergers stay ungraded. No trained/calibrated model accuracy
claim follows merely from collecting tutorials or synthetic regressions.

| Order | App | Contrast-specific requirements |
| --- | --- | --- |
| 1 | H & F | Separate English /h/, Mandarin /x/, /f/, and final /f–v/; keep word evidence distinct from measured friction and voicing. |
| 2 | L & R | Position-aware lateral/rhotic vowel transitions, F2/F3 trajectories, accepted accents, /w/, omitted and unrelated controls. |
| 3 | English | Vowel quality and trajectories as well as duration; dental/alveolar frication; voicing, stop release and word-final contrasts. Do not grade merged accent pairs as errors. |
| 4 | Mandarin | Aspiration, place and affrication; rounded vowels; nasal codas; contextual tone contours and sandhi. Word recognition does not measure tone accuracy. |
| 5 | Korean | Plain/tense/aspirated stops with contextual voicing, VOT and onset pitch; vowel and coda context, not a single aspiration threshold. |
| 6 | Arabic | Articulation and vowel transitions for emphatic/pharyngeal contrasts; length and gemination normalized to speaking rate; authored regional variants. |
| 7 | Cantonese | Six tone categories and accepted contextual variants; vowel quality plus duration; initial/coda place, aspiration and checked syllables. |
| 8 | Japanese | Mora timing, length, gemination, voicing and vowel-dependent H-series realizations. Script recognition stays visual; kanji readings use supplied context, not character guesses. |

## Gate for each app

1. Inventory every authored pair and freeze the recorded target and reading.
2. Check correct and opposite words, omitted sound, unrelated speech, silence,
   noise, quiet captures, different voices, speaking rates and sentence context.
3. Integrate only compatible on-device models with verified language assets,
   licenses, resource bounds, unrestricted recognition and explicit cancellation.
   Preserve actual transcripts and confidence; never prompt decoding to return
   the selected word or turn recognition into a fabricated sound percentage.
4. Test successive recordings, automatic silence stop, manual stop, cancel,
   background/resume, language/pair switching, History persistence and replay.
5. Keep the record control fixed. Keep result item order, units and provenance
   consistent. Show useful measured feedback and honest unmeasured evidence.
6. Compare a pinned baseline on independent recordings before enabling a new
   classifier. Reject increased wrong-side claims even if coverage rises.
7. Verify native packaging and device/runtime regressions, then upload only
   that app's new internal-test builds. Record exact source and artifact hashes,
   provider readback and what was actually tested. Phone validation remains
   distinct from simulation. Preserve old recordings and generated evidence.
8. Move to the next app after the focused app's checks and delivery are recorded.

Production submissions are a separate release step. Shared desktops, devices,
keychains and resources require bounded ownership; no peer lane is interrupted.
