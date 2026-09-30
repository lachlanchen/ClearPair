# ClearPair by LazyingArt

Working family name: **ClearPair** — “Practise what you mix up. Learn the difference.”
Chinese descriptor: 辨音练习. This is a working product name, not trademark clearance.

Seven independently installable apps share one engine:

- `handf`: English /h–f/ and Mandarin h/f (Mandarin h is not identical to English h).
- `landr`: English /l–r/, including initial, medial/final and clusters.
- `english`: vowel quality/height/backness/rounding, diphthongs, TH/s/z, voicing and endings.
- `chinese`: Standard Mandarin initials, finals, aspiration, tones and connected-speech lessons.
- `cantonese`: Jyutping, six-tone contrasts, aa/a, nasal and stop endings, aspiration and an ungraded n/l variation guide.
- `korean`: smart Hangul recall, confusable shapes, aspiration/tension and syllable structure.
- `arabic`: confusable letter families, dots, contextual forms and joining, with RTL script.

Every app targets native iOS, native Android and an installable PWA. Separate application
identities share playback, recording, storage and review code. Native builds use native
audio integrations; a web demo alone does not satisfy the delivery gate.

Web home: `https://language-agent.lazying.art/`, with one path per app ID above. The owner
will point DNS at the L & N server. Deploy a separate site/root; do not change L & N routing.

## Delivery gates

1. Source-backed curriculum; video downloaded privately, original lessons and graphics.
2. Complete responsive Learn/Listen/Practice/History workflow, separate UI/practice language.
3. Pair playback, repeat-until-Stop, stable recording controls, waveform/pitch feedback,
   local recording retention/export/delete, paginated history and honest storage warnings.
4. Listening quizzes and adaptive review; never present signal quality or transcription as a
   validated phoneme score. Offline lessons/reference audio; no default cloud uploads.
5. Seven PWA builds and actual Android/iOS projects/builds; test supported runtimes.
6. Automated unit/browser regression, accessibility/phone/desktop checks, clean resource handoff.
7. Reliable speaking assessment for **each app**, not only recording or transcription:
   language-specific acoustic heads, target-only word/sentence alignment, calibrated
   contrast feedback, negative-control rejection and held-out real-speaker validation.
   Listening/visual recall and speaking assessment retain separate progress meanings.
   This gate is still open; current model probes and math tests do not close it.

Store submissions, new accounts, paid model providers and pricing are out of scope
without a separate release request. L & N source/runtime/review remains untouched.

## Curriculum corrections

- about/above and vision/region are not minimal pairs; do not label them as such.
- English tense/lax vowel quality is not just duration. General American uses /i u ɑ/ here.
- Cot/caught and pen/pin can merge in some accents; those contrasts are optional, never defects.
- Mandarin zi/zhi/ji are a comparison of syllable series, not a three-way minimal contrast
  with an identical vowel. Pinyin i changes quality; j/q/x occur with front high segments.
- Mandarin nasal-final pairs also differ in vowel quality; not just tongue closure.
- Mandarin h commonly uses velar friction; zh/ch/sh need not involve exaggerated tongue curling.
- Third tone is often low in connected speech. Tone sandhi depends on phrase structure.

## Runtime

One Pronunciation browser/desktop at most, one build at a time. Reuse installed SDKs/models;
never copy browser profiles or model weights. Private media/evidence stays in `.runtime/`.
