# Sound coverage: confusing parts, not a generic repetition course

Research and development snapshot, 4 October 2026.

The eight latest submitted binaries are recorded in
[the release receipt](RELEASE-20261004.md). The additions below are a separate
source candidate, **not part of those submitted binaries or the current public
deployment**. No store review was cancelled to add course content.

## Three different tasks

1. **Reference listening and recall:** a compact, initially collapsed Learn map.
   Tap a letter name or a language-bound sound example. This does not grade a
   phoneme or change the selected recording target.
2. **Contrast practice:** retain the existing H & F-style recording, actual
   transcription, separate word/acoustic evidence and stable controls. New
   Mandarin/Cantonese basic tone contrasts route explicitly to tone assessment,
   never to a generic consonant head.
3. **Connected speech:** context can change a sound. Paused single-syllable tone
   sequences are listening drills, not a connected-speech assessment or a model
   of Mandarin tone sandhi.

Names, spelling, sounds and accent variants are not interchangeable. An alphabet
chart is not evidence that every possible contrast has a calibrated scoring model.

## Candidate inventory

| Course | Learn reference inventory | Boundary |
| --- | --- | --- |
| English | 26 letter names, 24 consonant examples, 17 selected General American vowel/rhotic/glide examples | Vowel quality and movement matter, not merely “long/short.” Regional mergers are not automatically mistakes. |
| Mandarin | 21 initials; 36 common final/spelling labels including **er**; seven spelling/context examples; four basic tone anchors | **y/w** are treated as spelling conventions. Apical **i**, **ü** spelling, neutral tone and erhua are contextual, not extra isolated phonemes inferred from letters. |
| Cantonese | 19 onsets plus zero onset; 51 common rhyme examples and nine listed rare spellings; codas, syllabic nasals and six tone categories | Rare rows have no playback until a reading is verified. Checked syllables do not create three more pitch categories. |
| Korean | 19 initial letters, 21 vowel letters, seven pause-final sound categories, 27 written final forms | Whole-word examples distinguish written batchim from its positional realization; initial **ㅇ** is silent. Romanization is only a reading aid. |
| Arabic | 28 base letters, hamza separately, short/long vowels, diphthongs and contextual marks | Letter names and examples are separate playback modes. Alif is not simply an extra consonant. Case endings/tanwin can change at a pause. |
| Japanese | 46 basic, 25 voiced/semi-voiced and 33 common contracted forms in each script; 23 loanword combinations | Explicit Japanese readings, not Latin-letter TTS. Equal sounds in different scripts are not an acoustic discrimination task. Not an inventory of all kanji. |

H & F and L & R remain focused: no general alphabet/map panel is added to them.
All eleven UI languages have translated map controls and group headings;
specialist English notes are explicitly labeled as English when no translation
exists. Simplified and Traditional Chinese notes use separately authored script
variants. Practice-language playback does not follow the interface language.

### Mandarin and Cantonese tone coverage

The candidate adds four Mandarin and twelve Cantonese lessons, retaining all
existing lesson IDs and recording-history keys. Together with the existing
lessons, this covers the **six unordered Mandarin contrasts** and **fifteen
unordered Cantonese contrasts**. Each added lesson has two same-syllable lexical
families, not an arbitrary different-vowel comparison.

The separate Learn grids contain **16 Mandarin** and **36 Cantonese ordered
sequences**, including repeats, played as separate utterances with a pause.
The grid does not expose a recording grade. Its contours are relative teaching
sketches, not reference recordings or fixed Hz requirements.

## Primary references and design consequences

### Mandarin

[Open University: Pinyin syllables](https://www.open.edu/openlearn/mod/oucontent/view.php?id=106435&section=1.1)
provides a finals/spelling framework. The map explicitly distinguishes abbreviated
**iu/ui/un** spellings and **u** representing **ü** after j/q/x. Different inventory
counts can depend on grouping and inclusion of **er**; the declared map count is
not an assertion that all analyses use 36 finals.

[MIT: Mandarin tones](https://web.mit.edu/~jinzhang/www/pinyin/tones/)
supports low third-tone realizations, neutral-tone context and third-tone sandhi.
We do not demand a full dip-rise in every phrase. We checked examples rather than
copying the page mechanically: its fourth-tone combination paragraph and one
**一群** transcription contain apparent inconsistencies and are not adopted.

[UCLA: Mandarin phonetics](https://phonetics.ucla.edu/appendix/languages/chinese/chinese.html)
is a reference for differences hidden by identical Pinyin letters, including
the different **i** contexts. The displayed romanization is not presented as IPA.

### Cantonese

[LSHK's Jyutping scheme](https://jyutping.org/en/jyutping/)
provides onset/rhyme structure, syllabic nasals, six tones and checked-tone
notation. Its 2018 **a/oet** additions are included as labels; rare examples are
not sent to a device voice as bare Latin strings. The scheme also makes clear
that vowel quality before **-ng/-k** can differ, so **sin/sing** is not modeled as
only a final consonant change.

[CUHK's fu syllable index](https://humanum.arts.cuhk.edu.hk/Lexis/lexi-can/pho-rel.php?s1=f&s2=u)
was used to cross-check the additional **夫/虎/富/扶/婦/父** lexical family.
[LSHK's learning guide](https://jyutping.org/en/learn/)
provides an ordered-sequence teaching framework. Our own layout and guidance
are original; no source audio or illustrations are bundled.

### Korean

[National Institute of Korean Language: Hangeul structure](https://www.korean.go.kr/eng_hangeul/principle/001.html)
distinguishes initial, medial and written-final inventories. The map keeps the
19/21/27 written categories separate from seven pause-final sound categories.
[NIKL: standard pronunciation](https://www.korean.go.kr/front/page/pageView.do?mn_id=95&page_id=P000098)
supports contextual vowel variants. Modern **ㅐ/ㅔ** merger is not diagnosed as
failure merely because two spellings differ. A final may assimilate, link or
trigger tensing in context; a map example is not a universal letter-to-sound rule.

### Arabic

[Tokyo University of Foreign Studies: MSA consonants](https://www.coelang.tufs.ac.jp/mt/ar/pmod2/1-1/1.html),
[pharyngeal/glottal sounds](https://www.coelang.tufs.ac.jp/mt/ar/pmod2/1-6/1.html)
and [emphatic sounds](https://www.coelang.tufs.ac.jp/mt/ar/pmod2/1-7/1.html)
inform the distinction between letter identity, articulation and contextual
realization. Guidance does not tell a learner to squeeze the throat. MSA and
dialect differences remain explicit; native TTS must still be audited for the
new short syllables and isolated grammatical endings.

### Japanese

[Japan Foundation: Irodori editions](https://www.irodori.jpf.go.jp/en/editions.html)
and [Starter lesson 2, kana reference](https://nd.jpf.go.jp/wp-content/uploads/2024/09/X_L02.pdf)
were inspected; the chart page was rendered and visually checked. The candidate
covers the common basic, voiced/semi-voiced and contracted inventory; it does
not promote the chart's rare **ぢゃ/ぢゅ/ぢょ** row as a common modern task.

Isolated **は/へ/を** use explicitly authored sound readings, while whole words
and sentences retain their own contextual readings. Kana identity, mora timing
and historical kanji origins are different topics. Existing licensed stroke
animations remain modern stroke order, not invented historical intermediate forms.

### English

[UCLA phonetics resources](https://phonetics.ucla.edu/)
provide the articulatory/phonetic reference framework. The selected General
American map separates letter names from consonants and vowel examples, retaining
rhoticity, unstressed vowels and diphthong movement. It is not an “all accents”
inventory or a requirement to maintain cot/caught distinctions in merged accents.

## Tutorial caption review

Focused relevant caption sections were reviewed privately for teaching order and
explanation, not as the sole authority for sound inventories:

- [Owner-supplied English vowel tutorial](https://www.youtube.com/watch?v=9E6F57s-V7U): vowel quality, movement and stress, not duration alone.
- [Yoyo Chinese: tones 1 and 2](https://www.youtube.com/watch?v=14yLtFoI-d4) and [tones 3 and 4](https://www.youtube.com/watch?v=w7kU5wGMQQ4): personal pitch range and low third-tone context.
- [Cantonese pronunciation overview](https://www.youtube.com/watch?v=sun1WctOSk): supplementary overview only; the presenter says they do not speak Cantonese, so LSHK/CUHK are the authority.
- [Talk To Me In Korean: Hangul](https://www.youtube.com/watch?v=uNDf0V06m0w): syllable blocks and positional consonant roles.
- [Arabic alphabet tutorial](https://www.youtube.com/watch?v=AJ6bZadGhpw): names/diacritics; vague “throat” cues are replaced by place-specific, non-straining guidance.
- [Japanese kana tutorial](https://www.youtube.com/watch?v=_wZHqOghvSs): script recall, voicing and contracted sounds.

Captions are imperfect research inputs. No downloaded transcript, creator voice,
video frames or tutorial illustrations are shipped. **No model was trained on
these YouTube sources.** Any future training requires an appropriate licensed
dataset and speaker-disjoint evaluation; synthetic demonstrations alone cannot
establish human pronunciation accuracy.

## Scoring expansion contract

Keep the successful H & F interaction, but not a single H/F acoustic rule for
every language. Before adding a new scored pair:

- Use the correct focus region: onset, vowel, final, tone or mora timing.
- Keep unconstrained transcription separate from target-conditioned acoustic
  comparison. Preserve the actual wrong word rather than coercing it into the
  selected pair.
- Retain an **other/omitted/insufficient evidence** outcome. Give usable word
  feedback when phoneme evidence is missing, never a fabricated target-sound grade.
- Compare opposite-side, unrelated, quiet and clipped inputs as well as correct
  inputs; check both target selections. Silence must not yield a speech grade.
- Normalize pitch by speaker/context. Per-clip centering cannot establish high
  versus low register; use a carrier baseline or withhold that measurement.
- Validate accepted accent variants and mergers rather than treating a chart as
  a medical or native-speaker diagnostic.
- Test repeated capture, pause/tap stop, cancellation, waveform, model reuse,
  actual transcript, score order, fixed button geometry and History replay on
  both native runtimes, not only a mocked browser.

Existing submitted-build native receipts remain separate from this candidate.
The new map is reference listening; the additional lexical tone examples still
require native voice and scoring qualification before release. Further English
and Mandarin contrast drafts are not imported into the shipped curriculum.
They require explicit routed heads and per-pair QA; adding a label or generic
similarity calculation is not sufficient.

## Candidate validation snapshot

- TypeScript checking and all eight web builds passed.
- 1,204 unit tests passed; 12 deliberately skipped checks remain explicitly skipped.
- 57 browser checks passed, including the six maps at 320-pixel width across all
  eleven UI languages, repeated/cancelled playback and practice-language isolation.
- The recording subset passed 16 checks for generated-stream waveform, repeated
  capture, pause-based stop, stable controls and persisted History. The stale
  assertion for an empty timer was corrected to require **no timer element**.
- Cantonese, Arabic and Japanese map screenshots were visually inspected.

Mocked speech callbacks and generated streams test lifecycle and layout only.
They do not qualify the new device voices, a physical microphone or human
pronunciation accuracy. No new native binary or public web deployment was made
for this expansion snapshot; the existing formal reviews are left intact.
