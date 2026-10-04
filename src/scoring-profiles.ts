import { lessonById, productById, products } from "./curriculum";
import type { AppId, Language, Text, Word } from "./types";
import type { ScoreEvidence } from "./scoring";
import { pronunciationText } from "./pronunciation-text";
import { extraMandarinToneLessons, extraCantoneseToneLessons } from './tone-curriculum';

/** Versioned requirements, not hand-tuned scoring weights. An on-device encoder must
 * supply these measurements and pass separate calibration for each routed task. */
export interface ScoringProfile {
  id: string;
  language: Language;
  unit: ScoreEvidence["unit"];
  cues: readonly string[];
  alternatives: readonly string[];
  description: Text;
}
const profile = (
  id: string,
  language: Language,
  unit: ScoreEvidence["unit"],
  cues: string[],
  alternatives: string[],
  en: string,
  zh: string,
): ScoringProfile => ({
  id: `${id}:v1`,
  language,
  unit,
  cues,
  alternatives,
  description: { en, zh },
});

export const scoringProfiles = {
  japaneseKana: profile('ja-kana', 'ja-JP', 'phone',
    ['phone-likelihood','vowel-transition','mora-context','content-confidence'],
    ['target','displayed-confusion','omission','other'],
    'Assess the spoken kana, never infer which script was intended from sound.', '评估假名读音，不根据声音猜测使用哪套字形。'),
  japaneseVoicing: profile('ja-voicing', 'ja-JP', 'phone',
    ['phone-likelihood','closure-release','relative-onset-f0','periodicity','mora-context'],
    ['target','voiced','voiceless','omission','other'],
    'Use contextual voicing evidence, including accepted Japanese allophones.', '结合语境评估清浊，保留日语允许的音位变体。'),
  japaneseHBP: profile('ja-h-b-p', 'ja-JP', 'phone',
    ['phone-likelihood','frication-spectrum','closure-release','vowel-context'],
    ['h-series','b-series','p-series','omission','other'],
    'Compare all three categories with the vowel-dependent h-series realizations.', '比较三类，并考虑 h 行随元音变化的具体音值。'),
  japaneseTiming: profile('ja-mora-timing', 'ja-JP', 'phone',
    ['phone-likelihood','relative-mora-duration','closure-duration','vowel-duration','utterance-rate','mora-context'],
    ['short','long','combined-kana','separate-kana','omission','other'],
    'Align vowel length, consonant holds and combined kana within the mora context.', '在拍的语境中对齐元音长短、辅音停留和拗音。'),
  japaneseReadings: profile('ja-contextual-reading', 'ja-JP', 'phone',
    ['phone-likelihood','word-alignment','accepted-contextual-readings','content-confidence'],
    ['target','accepted-reading','different-word','omission','other'],
    'Use the explicitly supplied word reading and accepted variants, not single-character guesses.', '使用明确提供的词语读音和允许变体，不猜测单字读音。'),
  cantoneseTones: profile('yue-tones', 'zh-HK', 'tone',
    ['relative-f0-contour', 'tone-context', 'voicing-confidence', 'speaker-normalization'],
    ['tone-1', 'tone-2', 'tone-3', 'tone-4', 'tone-5', 'tone-6', 'other'],
    'Compare all six Cantonese tones after alignment; validate mergers by speaker and context.',
    '對齊後比較六個粵語聲調，按說話者及語境驗證合併現象。'),
  cantoneseVowels: profile('yue-vowels', 'zh-HK', 'phone',
    ['formant-trajectory', 'vowel-duration', 'speaker-normalization', 'syllable-alignment'],
    ['aa', 'a', 'other-vowels', 'omission', 'other'],
    'Quality and duration jointly distinguish aa/a; no duration-only grade.', '結合音色與時長區分 aa/a，不只按長短評分。'),
  cantoneseConsonants: profile('yue-consonants', 'zh-HK', 'phone',
    ['phone-likelihood', 'closure-location', 'aspiration', 'vowel-transition', 'syllable-alignment'],
    ['target', 'competitor', 'omission', 'other'],
    'Align the intended initial or coda; retain other and omitted categories.', '對齊目標聲母或韻尾，保留其他音與漏音類別。'),
  englishHF: profile(
    "en-h-f",
    "en-US",
    "phone",
    [
      "phone-likelihood",
      "frication-spectrum",
      "frication-duration",
      "vowel-transition",
    ],
    ["h", "f", "omission", "other"],
    "Listen for breath at the throat versus friction at the lower lip.",
    "分清喉部气流与下唇摩擦。",
  ),
  mandarinHF: profile(
    "cmn-x-f",
    "zh-CN",
    "phone",
    ["phone-likelihood", "frication-spectrum", "vowel-transition"],
    ["x", "f", "omission", "other"],
    "Compare Mandarin velar friction with lip–teeth friction; this is not English H.",
    "比较普通话软腭摩擦与唇齿摩擦，不套用英语 H 的模型。",
  ),
  englishLR: profile(
    "en-l-r",
    "en-US",
    "phone",
    [
      "phone-likelihood",
      "f2-f3-trajectory",
      "vowel-transition",
      "segment-position",
    ],
    ["l", "ɹ", "w", "omission", "other"],
    "Compare the consonant and its vowel transition, with position and accent in context.",
    "结合位置和口音比较辅音及其向元音的过渡。",
  ),
  englishVowels: profile(
    "en-vowel",
    "en-US",
    "phone",
    [
      "phone-likelihood",
      "normalized-f1-f2-trajectory",
      "vowel-duration",
      "stress",
    ],
    ["target", "displayed-confusion", "other-vowels", "omission", "other"],
    "Compare vowel quality and movement as well as length—not length alone.",
    "比较元音音质、变化与时长，不只比较长短。",
  ),
  englishFricatives: profile(
    "en-fricative",
    "en-US",
    "phone",
    [
      "phone-likelihood",
      "frication-spectrum",
      "periodicity",
      "closure-release",
      "vowel-transition",
    ],
    [
      "target",
      "displayed-confusion",
      "same-place-other-manner",
      "omission",
      "other",
    ],
    "Compare friction, voicing and whether the air closes before release.",
    "比较摩擦、声带振动及释放前是否阻塞。",
  ),
  englishEndings: profile(
    "en-ending",
    "en-US",
    "phone",
    [
      "phone-likelihood",
      "closure-release",
      "preceding-vowel-duration",
      "periodicity",
      "segment-position",
    ],
    ["target", "displayed-confusion", "omission", "added-vowel", "other"],
    "Listen for the ending without requiring an exaggerated final release.",
    "听清词尾，不要求夸张爆破。",
  ),
  englishNasals: profile(
    "en-nasal",
    "en-US",
    "phone",
    [
      "phone-likelihood",
      "nasal-spectrum",
      "vowel-transition",
      "segment-position",
    ],
    ["n", "ŋ", "omission", "added-stop", "other"],
    "Compare the nasal ending and its transition from the vowel.",
    "比较鼻音韵尾及元音到韵尾的过渡。",
  ),
  mandarinInitials: profile(
    "cmn-initial",
    "zh-CN",
    "phone",
    [
      "phone-likelihood",
      "frication-spectrum",
      "closure-release",
      "voice-onset-time",
      "vowel-transition",
    ],
    [
      "target",
      "displayed-confusion",
      "same-place-other-manner",
      "other-place",
      "omission",
      "other",
    ],
    "Separate place, aspiration and manner within a valid Mandarin syllable.",
    "在合法普通话音节内区分发音位置、送气和发音方式。",
  ),
  mandarinFinals: profile(
    "cmn-final",
    "zh-CN",
    "phone",
    [
      "phone-likelihood",
      "normalized-f1-f2-trajectory",
      "nasal-spectrum",
      "vowel-transition",
    ],
    ["target", "displayed-confusion", "other-finals", "omission", "other"],
    "Compare the whole final, including vowel quality and any nasal ending.",
    "比较整个韵母，包括元音音质与鼻音韵尾。",
  ),
  mandarinTones: profile(
    "cmn-tone",
    "zh-CN",
    "tone",
    [
      "syllable-alignment",
      "normalized-f0-contour",
      "voiced-coverage",
      "pitch-confidence",
      "tone-context",
    ],
    ["tone-1", "tone-2", "tone-3", "tone-4", "neutral", "unvoiced", "other"],
    "Compare relative pitch and tone context, not the speaker's absolute pitch.",
    "比较相对音高与声调环境，不按说话者的绝对音高打分。",
  ),
  koreanStops: profile(
    "ko-three-way-stop",
    "ko-KR",
    "phone",
    [
      "phone-likelihood",
      "voice-onset-time",
      "relative-onset-f0",
      "phonation",
      "segment-position",
    ],
    ["lenis", "aspirated", "tense", "omission", "other"],
    "Check all three categories together: timing, vowel-onset pitch and phonation.",
    "同时比较松音、送气音和紧音，结合时序、元音起始音高与发声。",
  ),
  koreanFricatives: profile(
    "ko-fricative",
    "ko-KR",
    "phone",
    [
      "phone-likelihood",
      "frication-spectrum",
      "frication-duration",
      "relative-onset-f0",
      "phonation",
    ],
    ["s", "tense-s", "omission", "other"],
    "Compare the fricative and the start of its following vowel.",
    "比较摩擦音及后续元音的起始部分。",
  ),
  koreanVowels: profile(
    "ko-vowel",
    "ko-KR",
    "phone",
    ["phone-likelihood", "normalized-f1-f2-trajectory", "vowel-transition"],
    ["target", "displayed-confusion", "other-vowels", "omission", "other"],
    "Compare vowel quality while respecting supported modern Korean variants.",
    "比较元音音质，尊重支持的现代韩语变体。",
  ),
  koreanPosition: profile(
    "ko-position",
    "ko-KR",
    "phone",
    [
      "phone-likelihood",
      "nasal-spectrum",
      "vowel-transition",
      "segment-position",
    ],
    ["target", "displayed-confusion", "omission", "added-consonant", "other"],
    "Check the sound in its syllable position, not the written letter alone.",
    "结合音节位置评估声音，不只依据书面字母。",
  ),
  koreanNames: profile(
    "ko-letter-name",
    "ko-KR",
    "letter-name",
    ["name-phone-likelihood", "syllable-alignment", "segment-position"],
    ["target-name", "other-name", "isolated-sound", "other"],
    "Assess the spoken letter name separately from its sound inside a word.",
    "字母名称发音与字母在词内的声音分别评估。",
  ),
  arabicNames: profile(
    "ar-letter-name",
    "ar-SA",
    "letter-name",
    [
      "name-phone-likelihood",
      "syllable-alignment",
      "frication-spectrum",
      "emphasis-transition",
      "vowel-duration",
    ],
    [
      "target-name",
      "displayed-name",
      "related-letter-names",
      "isolated-sound",
      "other",
    ],
    "Assess the full spoken Arabic letter name; identifying its dots is a different skill.",
    "评估完整阿拉伯字母名称；识别字母上的点是另一项技能。",
  ),
  arabicVowels: profile(
    "ar-syllable-vowel",
    "ar-SA",
    "phone",
    [
      "phone-likelihood",
      "normalized-f1-f2-trajectory",
      "vowel-duration",
      "syllable-alignment",
    ],
    ["target-vowel", "displayed-vowel", "other-vowels", "omission", "other"],
    "Compare the vowel in a syllable; do not grade it as a spoken letter name.",
    "比较音节中的元音，不将其当作字母名称评估。",
  ),
} satisfies Record<string, ScoringProfile>;

type ProfileName = keyof typeof scoringProfiles;
const routes: Partial<Record<string, ProfileName>> = {};
function route(head: ProfileName, ids: string[]) {
  for (const id of ids) {
    if (routes[id]) throw new Error(`Duplicate scoring route: ${id}`);
    routes[id] = head;
  }
}
route("englishHF", ["hf-en"]);
route('japaneseKana', ['ja-hira-loops','ja-kata-direction']);
route('japaneseVoicing', ['ja-dakuten']);
route('japaneseHBP', ['ja-h-b-p']);
route('japaneseTiming', ['ja-long-vowels','ja-small-tsu','ja-small-y']);
route('japaneseReadings', ['ja-furigana']);
route('cantoneseTones', ['yue-tone-1-3', 'yue-tone-2-5', 'yue-tone-4-6']);
route('cantoneseTones', extraCantoneseToneLessons.map(l => l.id));
route('cantoneseVowels', ['yue-aa-a']);
route('cantoneseConsonants', ['yue-n-ng', 'yue-b-p', 'yue-p-t']);
route("mandarinHF", ["hf-zh"]);
route("englishLR", ["lr-start", "lr-more", "lr-clusters", "lr-end"]);
route("englishVowels", [
  "v-i",
  "v-ae",
  "v-ae-uh",
  "v-u",
  "v-uh-ah",
  "v-ei",
  "v-ai",
]);
route("englishFricatives", [
  "th-s",
  "th-z",
  "th-d",
  "th-voice",
  "v-w",
  "s-z",
  "sh-s",
  "ch-sh",
]);
route("englishEndings", ["hf-final", "end-t-d"]);
route("englishNasals", ["n-ng"]);
route("mandarinInitials", [
  "z-zh",
  "c-ch",
  "s-sh",
  "j-q",
  "q-x",
  "pinyin-i",
  "b-p",
  "d-t",
  "g-k",
  "z-c",
  "zh-ch",
]);
route("mandarinFinals", ["u-y", "i-y", "an-ang", "en-eng", "in-ing", "ou-uo"]);
route("mandarinTones", ["tone-1-4", "tone-2-3"]);
route('mandarinTones', extraMandarinToneLessons.map(l => l.id));
route("koreanStops", [
  "ko-g-k",
  "ko-g-kk",
  "ko-d-t",
  "ko-d-tt",
  "ko-b-p",
  "ko-b-pp",
]);
route("koreanFricatives", ["ko-s-ss"]);
route("koreanVowels", ["ko-a-eo", "ko-o-u", "ko-eu-i"]);
route("koreanPosition", ["ko-batchim", "ko-corners"]);
route("arabicNames", [
  "ar-b-t",
  "ar-t-th",
  "ar-j-h",
  "ar-h-kh",
  "ar-d-dh",
  "ar-r-z",
  "ar-s-sh",
  "ar-sad-dad",
  "ar-ta-za",
  "ar-ayn-ghayn",
  "ar-f-q",
  "ar-joining",
]);
route("arabicVowels", ["ar-vowels"]);

export type AssessmentPlan =
  | { mode: "explore"; reason: "accent-merger" | "connected-speech-guide" | "same-sound-scripts" }
  | {
      mode: "contrast";
      /** Includes app, exercise, side and prompt mode: no accidental cross-task calibration. */
      calibrationKey: string;
      profile: ScoringProfile;
      target: Word;
      competitor: Word;
      spokenPrompt: string;
      targetScope: "aligned-target-only";
      requiresHumanValidatedCalibration: true;
    };

export function assessmentPlan(
  app: AppId,
  lessonId: string,
  pairIndex: number,
  side: 0 | 1,
  sentence = false,
): AssessmentPlan {
  if (
    !products.some((product) => product.id === app) ||
    !productById(app).lessons.includes(lessonId)
  )
    throw new Error("Exercise does not belong to this app");
  const lesson = lessonById(lessonId);
  if (
    !Number.isInteger(pairIndex) ||
    !lesson.pairs[pairIndex] ||
    (side !== 0 && side !== 1)
  )
    throw new Error("Invalid target");
  if (lessonId === "v-merger" || lessonId === "ko-ae-e" || lessonId === 'yue-n-l')
    return { mode: "explore", reason: "accent-merger" };
  if (lessonId === "tone-context")
    return { mode: "explore", reason: "connected-speech-guide" };
  if (lessonId === 'ja-script-bridge') return { mode:'explore',reason:'same-sound-scripts' };
  const pair = lesson.pairs[pairIndex];
  const head =
    lessonId === "ko-corners" && pairIndex === 0
      ? "koreanNames"
      : routes[lessonId];
  if (!head) throw new Error("No explicit scoring profile for this exercise");
  const selected = scoringProfiles[head];
  if (selected.language !== lesson.language)
    throw new Error("Scoring language mismatch");
  return {
    mode: "contrast",
    calibrationKey: `${app}/${lessonId}/${pairIndex}/${side}/${sentence ? "sentence" : "word"}/${selected.id}`,
    profile: selected,
    target: pair[side],
    competitor: pair[1 - side],
    spokenPrompt: pronunciationText(pair[side], lesson.language, sentence),
    targetScope: "aligned-target-only",
    requiresHumanValidatedCalibration: true,
  };
}
