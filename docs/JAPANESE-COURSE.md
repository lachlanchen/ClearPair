# Japanese: practise what you mix up

Status: standalone iPhone/iPad and Android [internal beta 1.0.0 (9)](BETA-1.0.0-9.md).
Its build-8 formal iOS submission is Waiting for Review; Google production
submission is incomplete. This is not a verified public store release or approval.

The eighth ClearPair course combines easily confused kana with contrasts that
change meaning: vowel length, consonant holds, small kana and voicing. It includes
a 46-entry basic kana map (hiragana and katakana), five-question visual/listening
rounds, repeat-until-stopped pairs, private recording/history and explicit
course-authored furigana. It is not a general vocabulary course or an automatic
reading generator for arbitrary kanji. Romaji is a reading aid, not IPA.

## Teaching sources

- The Japan Foundation [kana chart](https://www.irodori.jpf.go.jp/assets/data/Kana_all.pdf)
  supports the modern basic syllabary and the distinction between full-size and
  small kana. Course text and UI are original; their PDFs/audio are not bundled.
- The Japan Foundation [Starter lesson 3](https://www.irodori.jpf.go.jp/assets/data/starter/pdf/X_L03_au.pdf)
  describes hiragana from cursive kanji and katakana from parts of kanji, including
  **安 → あ** and **阿 → ア**. These two examples alone are labelled historical
  origins. An animated comparison is not a reconstruction of intermediate
  historical handwriting. Other visual tricks are explicitly memory aids.
- [KanjiVG](https://github.com/KanjiVG/kanjivg) supplies modern stroke paths/order,
  not evidence for historical etymology. Imported stroke data retains attribution,
  its pinned source revision and individual source hashes. Data and adaptations
  are CC BY-SA 3.0, separate from the application code's license.

## Accuracy and access safeguards

- Same-sound hiragana/katakana cards have visual recall only: no impossible
  listening test and no spoken distinction grade.
- Japanese R is not graded with the English L/R model. Japanese H-series changes
  with the following vowel; calibrated h/b/p assessment must retain all three
  categories. The current experimental match compares the displayed pair,
  not a claimed calibrated three-way phoneme classifier.
- Long vowels and small っ need duration in a **relative mora context**, not a
  fixed absolute length threshold. Voicing, pitch and speaking rate are supporting
  evidence, not a shortcut to a grade.
- Furigana reflects a specific word/context. The course acknowledges alternative
  readings of 日本 and 明日 rather than calling every alternative an error.
- Kana sounds are played in Japanese even when interface language changes.
  Visual recall stars and pronunciation scores remain separate.
- Learn cues follow the selected pair: ね/れ and る/ろ never retain the first
  ぬ/め instructions. Loop/direction/stroke-count cues are modern memory aids,
  not historical etymology. The ふ cue distinguishes lip-to-lip friction from
  English F's lip-to-teeth friction.
- Motion starts only when requested; reduced-motion settings show the full
  character and static order instead. No timed tracing or pressure to speak fast.

## Release gate

Signed Android/iPhone/iPad builds and Apple validation passed for 1.0.0 (9);
both internal tracks are verified available. All eight Japanese spoken lesson
routes pass the actual iOS native reference/worker tests within the 86-route
family sweep. This is not a physical iPhone microphone accuracy measurement.
The local practice-match index is enabled separately from calibrated grades;
same-sound script exploration remains ungraded. Real learner recordings and
per-contrast human validation remain necessary for calibrated pronunciation
claims. Source/unit or synthetic-reference tests must not be described as that
validation. Build 8's iOS formal review is preserved; build 9 is test-only.
