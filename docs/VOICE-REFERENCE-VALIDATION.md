# Reference pronunciation and voice selection

Practice audio must use the course language, never the selected interface language.
Arabic letter forms use explicit letter-name text; Korean jamo use authored names
or syllables; Japanese kanji use contextual course-authored readings. Displayed
IPA, romanization and memory cues must not be sent as if they were native words.

## Identified routing defect

The browser previously matched any `zh-*` voice for Mandarin if an exact match was
missing. That could select Cantonese. Browser, Android and iOS source now enforce
the same language boundary: Cantonese must be explicitly Cantonese; Mandarin must
be explicitly Mandarin, and an ambiguous bare `zh` voice is not a safe fallback.
Japanese, Korean, Arabic and English cannot fall back to another language.

Android now verifies the actual selected voice rather than trusting `setLanguage`:
the engine can choose a closest locale. Not-installed voices are excluded; exact
locale and available quality are prioritized. iOS prioritizes installed higher-
quality voices within the correct locale and validates direct-lookup voices too.
Missing suitable voices produce a clear error rather than wrong-language speech.

iOS excludes Apple's explicitly marked novelty/effect and personal voices from
both enumeration and direct lookup. Personal voices are not course references and
their separate consent is not requested. This prevents a character/effect voice
from winning the quality/identifier ordering.

All playback paths use one authored speech-text function. Isolated Japanese は
and へ use ハ and ヘ to avoid grammatical-particle interpretation; を/ヲ use オ,
matching the course's modern `o` reading. Words and sentences are never globally
rewritten. Displayed kana, contextual furigana and romanization remain unchanged.
Arabic connected shapes and Korean jamo still use their explicit names/syllables.
Reference-clip keys include the actual spoken reading/context so a later corrected
reading cannot silently play an older cached clip. The audio-request generator and
application use the same speech-text/key logic.

## What is and is not verified

Voice-language regression tests and native Swift/Java compilation pass. This
does not establish a successful auditory check of every letter on every device.
An exact gibberish example still needs reproduction on its app/device/voice.
Installed voices can mishandle isolated characters even when the locale is correct;
curated reference recordings require explicit readings, rights and audition.

These changes are later source work, not in the already-uploaded 1.0.0 (4) builds.
No model accuracy, microphone success or formal store review is implied.

Primary references: [Android TextToSpeech](https://developer.android.com/reference/android/speech/tts/TextToSpeech)
and [Apple speech voices](https://developer.apple.com/documentation/avfaudio/avspeechsynthesisvoice),
[Apple voice traits](https://developer.apple.com/documentation/avfaudio/avspeechsynthesisvoice/traits),
and [Japan Foundation kana readings](https://www.irodori.jpf.go.jp/assets/data/Kana_all.pdf).
