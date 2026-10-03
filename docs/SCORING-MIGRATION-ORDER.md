# Sequential scoring improvement

Owner request: finish H & F first, then improve the other seven apps slowly,
one at a time. Reuse dependable capture, cancellation, History, playback,
evidence provenance and compact layout. Do not copy an H/F classifier or an
English word dictionary onto another language's contrasts.

The current focused candidate is H & F build 15. The other seven apps' release
identities and provider reviews are unchanged. No shared migration is claimed
complete by this document.

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
