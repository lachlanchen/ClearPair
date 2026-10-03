import type { Lesson, Text, Word } from "./types";
const t = (en: string, zh: string): Text => ({ en, zh });
const w = (
  text: string,
  ipa: string,
  gloss: string,
  sentence: string,
  spoken?: string,
): Word => ({ text, ipa, gloss, sentence, spoken });
const p = (a: Word, b: Word): [Word, Word] => [a, b];
/** A short neutral carrier ends with the quoted target, avoiding liaison with
 * a following particle. Do not replace an explicitly authored longer example. */
const context = (pairs: [Word, Word][], prefix: string): [Word, Word][] => pairs.map(pair =>
  pair.map(word => word.sentence === (word.spoken ?? word.text)
    ? {...word, sentence: `${prefix}${word.spoken ?? word.text}.`} : word) as [Word, Word]);
const k = (
  id: string,
  title: Text,
  sounds: [string, string],
  cue: Text,
  sides: [Text, Text],
  pairs: [Word, Word][],
  extra: Partial<Lesson> = {},
): Lesson => ({
  id,
  language: "ko-KR",
  group: "Hangul & contrasts",
  title,
  sounds,
  cue,
  sides,
  pairs: context(pairs, '다시 말할게요. '),
  diagram: "glyph",
  difficulty: 1,
  tip: t(
    "Look away, recall the difference, then check. Review a mistake again after a short gap.",
    "先移开视线回忆区别，再核对。答错后隔一会再练。",
  ),
  ...extra,
});
const a = (
  id: string,
  title: Text,
  sounds: [string, string],
  cue: Text,
  sides: [Text, Text],
  pairs: [Word, Word][],
  extra: Partial<Lesson> = {},
): Lesson => ({
  id,
  language: "ar-SA",
  group: "Letter families",
  title,
  sounds,
  cue,
  sides,
  pairs: context(pairs, 'أقول مرة أخرى: '),
  diagram: "glyph",
  difficulty: 1,
  quizMode: "visual",
  allowAudioQuiz: true,
  tip: t(
    "Read right to left. Dots belong to the letter; short vowel marks are a separate layer.",
    "从右向左读。点是字母的一部分，短元音符号是另一层标记。",
  ),
  ...extra,
});
export const scriptLessons: Lesson[] = [
  k(
    "ko-corners",
    t("Which way does it turn?", "拐角朝向哪里？"),
    ["ㄱ", "ㄴ"],
    t(
      "Remember direction, not just “a corner”.",
      "不要只记“拐角”，还要记方向。",
    ),
    [
      t(
        "ㄱ: the horizontal stroke is at the top. Name: giyeok.",
        "ㄱ：横线在上，名称 giyeok。",
      ),
      t(
        "ㄴ: the horizontal stroke is at the bottom. Name: nieun.",
        "ㄴ：横线在下，名称 nieun。",
      ),
    ],
    [
      p(
        w("ㄱ", "giyeok", "giyeok · top horizontal", "기역", "기역"),
        w("ㄴ", "nieun", "nieun · bottom horizontal", "니은", "니은"),
      ),
      p(
        w("가", "ga", "ga · ㄱ + ㅏ", "가"),
        w("나", "na", "na · ㄴ + ㅏ", "나"),
      ),
      p(
        w("고", "go", "go · ㄱ + ㅗ", "고"),
        w("노", "no", "no · ㄴ + ㅗ", "노"),
      ),
    ],
    { quizMode: "visual", allowAudioQuiz: true },
  ),
  k(
    "ko-a-eo",
    t("A small stroke changes the vowel", "短线方向改变元音"),
    ["ㅏ", "ㅓ"],
    t(
      "Find the short stroke: right for ㅏ, left for ㅓ.",
      "看短线：ㅏ 向右，ㅓ 向左。",
    ),
    [
      t(
        "ㅏ /a/: an open vowel. The short stroke points right.",
        "ㅏ /a/：开元音，短线朝右。",
      ),
      t(
        "ㅓ /ʌ~ɔ/: a back vowel, normally unrounded; not an English “o”.",
        "ㅓ /ʌ~ɔ/：通常不圆唇的后元音，不等于英语 o。",
      ),
    ],
    [
      p(w("아", "a", "a", "아"), w("어", "eo", "eo", "어")),
      p(w("산", "san", "mountain", "산"), w("선", "seon", "line", "선")),
      p(
        w("말", "mal", "word / horse", "말"),
        w("멀", "meol", "far (stem)", "멀"),
      ),
    ],
  ),
  k(
    "ko-o-u",
    t("Above or below?", "短线在上还是在下？"),
    ["ㅗ", "ㅜ"],
    t(
      "The short stroke sits above ㅗ and below ㅜ.",
      "ㅗ 短线在上；ㅜ 短线在下。",
    ),
    [
      t(
        "ㅗ /o/: rounded, with a more open tongue position than /u/.",
        "ㅗ /o/：圆唇，舌位比 /u/ 更低。",
      ),
      t(
        "ㅜ /u/: rounded, with a high tongue position.",
        "ㅜ /u/：圆唇，舌位高。",
      ),
    ],
    [
      p(
        w("오", "o", "five (Sino-Korean)", "오"),
        w("우", "u", "u syllable", "우"),
      ),
      p(w("공", "gong", "ball", "공"), w("궁", "gung", "palace", "궁")),
      p(w("논", "non", "rice paddy", "논"), w("눈", "nun", "eye / snow", "눈")),
    ],
  ),
  k(
    "ko-eu-i",
    t("Horizontal or vertical?", "横线还是竖线？"),
    ["ㅡ", "ㅣ"],
    t(
      "An unrounded back vowel versus an unrounded front vowel.",
      "不圆唇的后元音与前元音。",
    ),
    [
      t(
        "ㅡ /ɯ/: high and back, without rounding your lips.",
        "ㅡ /ɯ/：高后元音，不圆唇。",
      ),
      t(
        "ㅣ /i/: high and front, also unrounded.",
        "ㅣ /i/：高前元音，也不圆唇。",
      ),
    ],
    [
      p(w("으", "eu", "eu syllable", "으"), w("이", "i", "two / tooth", "이")),
      p(
        w("금", "geum", "gold", "금"),
        w("김", "gim", "seaweed / surname Kim", "김"),
      ),
      p(w("큰", "keun", "big", "큰"), w("킨", "kin", "kin syllable", "킨")),
    ],
  ),
  k(
    "ko-ae-e",
    t("Different spellings, often one sound", "字形不同，读音常合流"),
    ["ㅐ", "ㅔ"],
    t(
      "Learn the spelling visually; many modern speakers merge these vowels.",
      "用视觉学习拼写；许多现代说话者已合并这两个元音。",
    ),
    [
      t("ㅐ is built from ㅏ + ㅣ.", "ㅐ 由 ㅏ + ㅣ 构成。"),
      t("ㅔ is built from ㅓ + ㅣ.", "ㅔ 由 ㅓ + ㅣ 构成。"),
    ],
    [
      p(
        w("ㅐ", "ae", "ae · ㅏ + ㅣ", "애", "애"),
        w("ㅔ", "e", "e · ㅓ + ㅣ", "에", "에"),
      ),
      p(w("개", "gae", "dog", "개"), w("게", "ge", "crab", "게")),
      p(w("내", "nae", "my", "내"), w("네", "ne", "your (written form)", "네")),
    ],
    {
      quizMode: "visual",
      caution: t(
        "This is a spelling drill, not an audio distinction test. A merger is not an error.",
        "这是拼写辨认，不是听力区分测试；合流不是错误。",
      ),
    },
  ),
  k(
    "ko-g-k",
    t("Plain versus aspirated", "松音与送气音"),
    ["ㄱ", "ㅋ"],
    t(
      "A stronger puff is only part of the contrast: listen to the following vowel too.",
      "更强送气只是部分线索，也要听后面的元音。",
    ),
    [
      t(
        "ㄱ: plain/lenis. Its timing and voicing change with position.",
        "ㄱ：松音，时长和清浊随位置变化。",
      ),
      t(
        "ㅋ: aspirated, with a stronger breathy release.",
        "ㅋ：送气音，释放后的气流较强。",
      ),
    ],
    [
      p(
        w("굴", "gul", "oyster / cave", "굴"),
        w("쿨", "kul", "cool (loanword)", "쿨"),
      ),
      p(w("가", "ga", "ga syllable", "가"), w("카", "ka", "ka syllable", "카")),
      p(w("고", "go", "go syllable", "고"), w("코", "ko", "nose", "코")),
    ],
    {
      diagram: "air",
      difficulty: 2,
      caution: t(
        "Korean plain/aspirated contrasts also use pitch and vary by speaker; they are not simply English g/k.",
        "韩语松音与送气音还使用音高线索，因人而异，不只是英语 g/k。",
      ),
    },
  ),
  k(
    "ko-g-kk",
    t("Plain versus tense", "松音与紧音"),
    ["ㄱ", "ㄲ"],
    t(
      "A compact release—not simply a louder or longer consonant.",
      "释放紧凑，不是单纯更响或更长。",
    ),
    [
      t(
        "ㄱ: the plain member of the three-way family.",
        "ㄱ：三分系列中的松音。",
      ),
      t(
        "ㄲ: tense, with a short, firm release and little aspiration. Never strain your throat.",
        "ㄲ：紧音，释放短而紧凑，少送气；不要挤喉。",
      ),
    ],
    [
      p(w("굴", "gul", "oyster / cave", "굴"), w("꿀", "kkul", "honey", "꿀")),
      p(
        w("가", "ga", "ga syllable", "가"),
        w("까", "kka", "kka syllable", "까"),
      ),
      p(
        w("기", "gi", "gi syllable", "기"),
        w("끼", "kki", "meal / talent", "끼"),
      ),
    ],
    { diagram: "air", difficulty: 2 },
  ),
  k(
    "ko-d-t",
    t("ㄷ, then ㅌ", "分清 ㄷ 和 ㅌ"),
    ["ㄷ", "ㅌ"],
    t(
      "The extra stroke helps you remember the aspirated member.",
      "额外的一笔帮助记住送气音。",
    ),
    [
      t("ㄷ: plain alveolar stop.", "ㄷ：齿龈松塞音。"),
      t("ㅌ: aspirated alveolar stop.", "ㅌ：齿龈送气塞音。"),
    ],
    [
      p(w("달", "dal", "moon", "달"), w("탈", "tal", "mask", "탈")),
      p(w("다", "da", "all", "다"), w("타", "ta", "ta syllable", "타")),
    ],
    { diagram: "air", difficulty: 2 },
  ),
  k(
    "ko-d-tt",
    t("One shape, doubled tension", "相同字形，紧音对比"),
    ["ㄷ", "ㄸ"],
    t(
      "Distinguish the whole syllable: release and vowel onset together.",
      "区分整个音节：释放与元音开头一起听。",
    ),
    [
      t(
        "ㄷ: plain; do not force an English voiced d.",
        "ㄷ：松音，不要强行套用英语浊 d。",
      ),
      t("ㄸ: tense, with little aspiration.", "ㄸ：紧音，少送气。"),
    ],
    [
      p(w("달", "dal", "moon", "달"), w("딸", "ttal", "daughter", "딸")),
      p(w("다", "da", "all", "다"), w("따", "tta", "tta syllable", "따")),
    ],
    { diagram: "air", difficulty: 2 },
  ),
  k(
    "ko-b-p",
    t("ㅂ versus ㅍ", "ㅂ 与 ㅍ"),
    ["ㅂ", "ㅍ"],
    t(
      "Both lips close. The release makes the difference.",
      "双唇都闭合，区别在释放。",
    ),
    [
      t("ㅂ: plain lip closure and release.", "ㅂ：松音双唇闭塞与释放。"),
      t("ㅍ: aspirated release.", "ㅍ：送气释放。"),
    ],
    [
      p(w("불", "bul", "fire", "불"), w("풀", "pul", "grass / glue", "풀")),
      p(w("발", "bal", "foot", "발"), w("팔", "pal", "arm / eight", "팔")),
    ],
    { diagram: "air", difficulty: 2 },
  ),
  k(
    "ko-b-pp",
    t("Fire or a horn?", "火还是角？"),
    ["ㅂ", "ㅃ"],
    t(
      "Recall the meaning while you hear the tense/plain contrast.",
      "听紧松对比时，同时回忆词义。",
    ),
    [
      t("ㅂ: plain.", "ㅂ：松音。"),
      t(
        "ㅃ: tense, not a separate repeated syllable.",
        "ㅃ：紧音，不是重复两个音节。",
      ),
    ],
    [
      p(w("불", "bul", "fire", "불"), w("뿔", "ppul", "horn", "뿔")),
      p(
        w("바", "ba", "ba syllable", "바"),
        w("빠", "ppa", "ppa syllable", "빠"),
      ),
    ],
    { diagram: "air", difficulty: 2 },
  ),
  k(
    "ko-s-ss",
    t("ㅅ versus ㅆ", "ㅅ 与 ㅆ"),
    ["ㅅ", "ㅆ"],
    t(
      "A doubled letter marks a distinct tense consonant.",
      "双写字母代表独立的紧音。",
    ),
    [
      t(
        "ㅅ: plain s; before i-like vowels, the sound changes toward sh.",
        "ㅅ：松 s；在类似 i 的元音前，音色向 sh 变化。",
      ),
      t(
        "ㅆ: tense counterpart; listen to the release into the vowel.",
        "ㅆ：对应紧音，注意进入元音的释放。",
      ),
    ],
    [
      p(
        w("살", "sal", "flesh / age", "살"),
        w("쌀", "ssal", "uncooked rice", "쌀"),
      ),
      p(w("사", "sa", "four", "사"), w("싸", "ssa", "cheap (stem)", "싸")),
    ],
    { diagram: "air", difficulty: 2 },
  ),
  k(
    "ko-batchim",
    t("Same letter, different position", "相同字母，不同位置"),
    ["initial", "final"],
    t(
      "A syllable block is not a left-to-right string of independent sounds.",
      "音节块不是一串从左到右独立读的音。",
    ),
    [
      t(
        "At the start, ㅇ is a silent placeholder before a vowel.",
        "音节开头，ㅇ 是元音前的空位符，不发音。",
      ),
      t(
        "At the bottom, ㅇ represents /ŋ/, as in sing.",
        "音节底部，ㅇ 表示 /ŋ/，如英语 sing 的结尾。",
      ),
    ],
    [
      p(
        w("아", "a", "a · initial ㅇ is silent", "아"),
        w("앙", "ang", "ang · final ㅇ is /ŋ/", "앙"),
      ),
      p(
        w("이", "i", "i · initial ㅇ is silent", "이"),
        w("잉", "ing", "ing · final ㅇ is /ŋ/", "잉"),
      ),
    ],
    {
      difficulty: 2,
      tip: t(
        "Final consonants can neutralize or link into the next syllable. Learn them in words, then phrases.",
        "韵尾可中和或与下一音节连读。先学词，再学短语。",
      ),
    },
  ),
  a(
    "ar-b-t",
    t("One dot below, two above", "下方一点，上方两点"),
    ["ب", "ت"],
    t(
      "Keep the base shape. Move and count the dots.",
      "保留基本字形，改变点的位置和数量。",
    ),
    [
      t("ب bāʾ: one dot below. Sound /b/.", "ب bāʾ：下方一点，/b/。"),
      t("ت tāʾ: two dots above. Sound /t/.", "ت tāʾ：上方两点，/t/。"),
    ],
    [
      p(
        w("ب", "bāʾ", "bāʾ · one dot below", "باء", "باء"),
        w("ت", "tāʾ", "tāʾ · two dots above", "تاء", "تاء"),
      ),
      p(
        w("بـ", "bāʾ · initial", "bāʾ · initial form", "باء", "باء"),
        w("تـ", "tāʾ · initial", "tāʾ · initial form", "تاء", "تاء"),
      ),
      p(
        w("ـبـ", "bāʾ · medial", "bāʾ · medial form", "باء", "باء"),
        w("ـتـ", "tāʾ · medial", "tāʾ · medial form", "تاء", "تاء"),
      ),
    ],
  ),
  a(
    "ar-t-th",
    t("Two dots or three?", "两点还是三点？"),
    ["ت", "ث"],
    t(
      "The third dot changes both the letter and its sound.",
      "第三个点改变字母，也改变声音。",
    ),
    [
      t("ت tāʾ: /t/, a stop.", "ت tāʾ：/t/，塞音。"),
      t(
        "ث thāʾ: /θ/ in Standard Arabic, like English thin.",
        "ث thāʾ：标准阿拉伯语 /θ/，类似英语 thin。",
      ),
    ],
    [
      p(
        w("ت", "tāʾ", "tāʾ · two dots", "تاء", "تاء"),
        w("ث", "thāʾ", "thāʾ · three dots", "ثاء", "ثاء"),
      ),
      p(
        w("ـتـ", "tāʾ · medial", "tāʾ · medial form", "تاء", "تاء"),
        w("ـثـ", "thāʾ · medial", "thāʾ · medial form", "ثاء", "ثاء"),
      ),
    ],
  ),
  a(
    "ar-j-h",
    t("A dot inside or no dot", "里面一点，或没有点"),
    ["ج", "ح"],
    t(
      "Learn the letter before trying to imitate an unfamiliar throat sound.",
      "先识别字母，再练习不熟悉的咽部音。",
    ),
    [
      t(
        "ج jīm: a dot inside/below the bowl. Standard /dʒ/; regional pronunciations vary.",
        "ج jīm：碗形内部偏下有点。标准 /dʒ/，地区读音有差异。",
      ),
      t(
        "ح ḥāʾ: no dot, /ħ/. Gentle pharyngeal friction, not ordinary h; never strain.",
        "ح ḥāʾ：无点，/ħ/。轻柔咽部摩擦，不是普通 h；不要用力挤压。",
      ),
    ],
    [
      p(
        w("ج", "jīm", "jīm · dot inside", "جيم", "جيم"),
        w("ح", "ḥāʾ", "ḥāʾ · no dot", "حاء", "حاء"),
      ),
      p(
        w("جـ", "jīm · initial", "jīm · initial form", "جيم", "جيم"),
        w("حـ", "ḥāʾ · initial", "ḥāʾ · initial form", "حاء", "حاء"),
      ),
    ],
  ),
  a(
    "ar-h-kh",
    t("No dot or a dot above", "无点，或上方一点"),
    ["ح", "خ"],
    t(
      "Same family, a different place for friction.",
      "同一字形家族，不同的摩擦位置。",
    ),
    [
      t("ح ḥāʾ: /ħ/, pharyngeal.", "ح ḥāʾ：/ħ/，咽部摩擦。"),
      t(
        "خ khāʾ: /x~χ/, farther back than English h, at the velar/uvular region.",
        "خ khāʾ：/x~χ/，软腭或小舌区域摩擦，不是英语 h。",
      ),
    ],
    [
      p(
        w("ح", "ḥāʾ", "ḥāʾ · no dot", "حاء", "حاء"),
        w("خ", "khāʾ", "khāʾ · dot above", "خاء", "خاء"),
      ),
      p(
        w("ـحـ", "ḥāʾ · medial", "ḥāʾ · medial form", "حاء", "حاء"),
        w("ـخـ", "khāʾ · medial", "khāʾ · medial form", "خاء", "خاء"),
      ),
    ],
  ),
  a(
    "ar-d-dh",
    t("Dāl and dhāl", "dāl 和 dhāl"),
    ["د", "ذ"],
    t(
      "One added dot; both stop the join to the following letter.",
      "多一个点；两个字母都不向后续字母连写。",
    ),
    [
      t("د dāl: /d/, no dot.", "د dāl：/d/，无点。"),
      t(
        "ذ dhāl: /ð/ in Standard Arabic, a dot above.",
        "ذ dhāl：标准阿拉伯语 /ð/，上方一点。",
      ),
    ],
    [
      p(
        w("د", "dāl", "dāl · no dot", "دال", "دال"),
        w("ذ", "dhāl", "dhāl · dot above", "ذال", "ذال"),
      ),
      p(
        w("ـد", "dāl · final", "dāl · joined from right", "دال", "دال"),
        w("ـذ", "dhāl · final", "dhāl · joined from right", "ذال", "ذال"),
      ),
    ],
  ),
  a(
    "ar-r-z",
    t("Rāʾ and zāy", "rāʾ 和 zāy"),
    ["ر", "ز"],
    t(
      "A dot turns rāʾ into zāy. Neither joins onward to the left.",
      "加一点，rāʾ 变成 zāy；都不向左继续连写。",
    ),
    [
      t(
        "ر rāʾ: typically a tap/trill, not English r.",
        "ر rāʾ：通常为闪音或颤音，不是英语 r。",
      ),
      t("ز zāy: /z/, with one dot above.", "ز zāy：/z/，上方一点。"),
    ],
    [
      p(
        w("ر", "rāʾ", "rāʾ · no dot", "راء", "راء"),
        w("ز", "zāy", "zāy · dot above", "زاي", "زاي"),
      ),
      p(
        w("ـر", "rāʾ · final", "rāʾ · final form", "راء", "راء"),
        w("ـز", "zāy · final", "zāy · final form", "زاي", "زاي"),
      ),
    ],
  ),
  a(
    "ar-s-sh",
    t("Three teeth, then three dots", "三个齿，再加三点"),
    ["س", "ش"],
    t(
      "Notice the same base shape across isolated and connected forms.",
      "在独立与连写形式中识别相同基本形。",
    ),
    [
      t("س sīn: /s/, no dots.", "س sīn：/s/，无点。"),
      t("ش shīn: /ʃ/, three dots above.", "ش shīn：/ʃ/，上方三点。"),
    ],
    [
      p(
        w("س", "sīn", "sīn · no dots", "سين", "سين"),
        w("ش", "shīn", "shīn · three dots", "شين", "شين"),
      ),
      p(
        w("سـ", "sīn · initial", "sīn · initial form", "سين", "سين"),
        w("شـ", "shīn · initial", "shīn · initial form", "شين", "شين"),
      ),
      p(
        w("ـسـ", "sīn · medial", "sīn · medial form", "سين", "سين"),
        w("ـشـ", "shīn · medial", "shīn · medial form", "شين", "شين"),
      ),
    ],
  ),
  a(
    "ar-sad-dad",
    t("Ṣād and ḍād", "ṣād 和 ḍād"),
    ["ص", "ض"],
    t(
      "A dot distinguishes two emphatic consonants.",
      "一个点区分两个强调辅音。",
    ),
    [
      t(
        "ص ṣād: /sˤ/, no dot. Emphasis involves a secondary tongue gesture.",
        "ص ṣād：/sˤ/，无点；强调包含附加舌部动作。",
      ),
      t(
        "ض ḍād: /dˤ/ in Standard Arabic, dot above. Not just a louder d.",
        "ض ḍād：标准 /dˤ/，上方一点，不只是更响的 d。",
      ),
    ],
    [
      p(
        w("ص", "ṣād", "ṣād · no dot", "صاد", "صاد"),
        w("ض", "ḍād", "ḍād · dot above", "ضاد", "ضاد"),
      ),
      p(
        w("صـ", "ṣād · initial", "ṣād · initial form", "صاد", "صاد"),
        w("ضـ", "ḍād · initial", "ḍād · initial form", "ضاد", "ضاد"),
      ),
    ],
    { difficulty: 2 },
  ),
  a(
    "ar-ta-za",
    t("Ṭāʾ and ẓāʾ", "ṭāʾ 和 ẓāʾ"),
    ["ط", "ظ"],
    t("Keep the tall stroke; check for the dot.", "保留高竖线，检查是否有点。"),
    [
      t("ط ṭāʾ: /tˤ/, no dot.", "ط ṭāʾ：/tˤ/，无点。"),
      t(
        "ظ ẓāʾ: /ðˤ/ in the standard model, dot above; dialects differ.",
        "ظ ẓāʾ：标准示范 /ðˤ/，上方一点；方言有差异。",
      ),
    ],
    [
      p(
        w("ط", "ṭāʾ", "ṭāʾ · no dot", "طاء", "طاء"),
        w("ظ", "ẓāʾ", "ẓāʾ · dot above", "ظاء", "ظاء"),
      ),
      p(
        w("ـطـ", "ṭāʾ · medial", "ṭāʾ · medial form", "طاء", "طاء"),
        w("ـظـ", "ẓāʾ · medial", "ẓāʾ · medial form", "ظاء", "ظاء"),
      ),
    ],
    { difficulty: 2 },
  ),
  a(
    "ar-ayn-ghayn",
    t("ʿAyn and ghayn", "ʿayn 和 ghayn"),
    ["ع", "غ"],
    t(
      "The letter changes shape when connected. The dot remains the clue.",
      "连写时字形会变，点仍是线索。",
    ),
    [
      t(
        "ع ʿayn: /ʕ/, no dot; a voiced pharyngeal sound.",
        "ع ʿayn：/ʕ/，无点，浊咽音。",
      ),
      t(
        "غ ghayn: /ɣ~ʁ/, dot above; voiced velar/uvular friction.",
        "غ ghayn：/ɣ~ʁ/，上方一点，浊软腭或小舌摩擦。",
      ),
    ],
    [
      p(
        w("ع", "ʿayn", "ʿayn · no dot", "عين", "عين"),
        w("غ", "ghayn", "ghayn · dot above", "غين", "غين"),
      ),
      p(
        w("عـ", "ʿayn · initial", "ʿayn · initial form", "عين", "عين"),
        w("غـ", "ghayn · initial", "ghayn · initial form", "غين", "غين"),
      ),
      p(
        w("ـعـ", "ʿayn · medial", "ʿayn · medial form", "عين", "عين"),
        w("ـغـ", "ghayn · medial", "ghayn · medial form", "غين", "غين"),
      ),
    ],
    { difficulty: 2 },
  ),
  a(
    "ar-f-q",
    t("One dot or two, with a different bowl", "点数与碗形都要看"),
    ["ف", "ق"],
    t(
      "Modern standard print: fāʾ has one dot, qāf two.",
      "现代标准印刷：fāʾ 一点，qāf 两点。",
    ),
    [
      t("ف fāʾ: /f/, one dot above.", "ف fāʾ：/f/，上方一点。"),
      t(
        "ق qāf: /q/, a back/uvular stop, two dots above; the isolated bowl differs too.",
        "ق qāf：/q/，小舌塞音，上方两点；独立字形的碗形也不同。",
      ),
    ],
    [
      p(
        w("ف", "fāʾ", "fāʾ · one dot", "فاء", "فاء"),
        w("ق", "qāf", "qāf · two dots", "قاف", "قاف"),
      ),
      p(
        w("فـ", "fāʾ · initial", "fāʾ · initial form", "فاء", "فاء"),
        w("قـ", "qāf · initial", "qāf · initial form", "قاف", "قاف"),
      ),
    ],
    {
      caution: t(
        "Some Maghrebi writing traditions use different dot conventions. This course uses common modern print.",
        "部分马格里布书写传统的点法不同；本课采用常见现代印刷体。",
      ),
    },
  ),
  a(
    "ar-joining",
    t("A break is not always a space", "断开不一定是空格"),
    ["بـ", "د"],
    t(
      "ا د ذ ر ز و can join from the right, but do not join onward to the left.",
      "ا د ذ ر ز و 可从右侧连接，但不向左继续连写。",
    ),
    [
      t("ب can connect to the following letter: بـ.", "ب 可连接后续字母：بـ。"),
      t(
        "د ends the connecting stroke, even inside a word.",
        "د 即使在词内，也结束连接笔画。",
      ),
    ],
    [
      p(
        w("بـ", "bāʾ · connects onward", "connects onward · bāʾ", "باء", "باء"),
        w(
          "د",
          "dāl · stops onward join",
          "stops onward join · dāl",
          "دال",
          "دال",
        ),
      ),
      p(
        w("تـ", "tāʾ · connects onward", "connects onward · tāʾ", "تاء", "تاء"),
        w(
          "و",
          "wāw · stops onward join",
          "stops onward join · wāw",
          "واو",
          "واو",
        ),
      ),
    ],
    {
      difficulty: 2,
      tip: t(
        "Follow the letter sequence, not only the connected ink. A joining break can happen within a single word.",
        "按字母顺序阅读，不只看连接的墨迹。一个词内部也可能断开。",
      ),
    },
  ),
  a(
    "ar-vowels",
    t("Same letter, a different short vowel", "同一字母，不同短元音"),
    ["بَ", "بِ"],
    t(
      "The vowel mark is not a dot in the letter.",
      "元音符号不是字母自带的点。",
    ),
    [
      t("Fatḥa ـَ above: a short /a/.", "上方 fatḥa ـَ：短 /a/。"),
      t("Kasra ـِ below: a short /i/.", "下方 kasra ـِ：短 /i/。"),
    ],
    [
      p(
        w("بَ", "ba", "ba · fatḥa above", "بَ", "بَ"),
        w("بِ", "bi", "bi · kasra below", "بِ", "بِ"),
      ),
      p(
        w("تَ", "ta", "ta · fatḥa above", "تَ", "تَ"),
        w("تِ", "ti", "ti · kasra below", "تِ", "تِ"),
      ),
    ],
    { difficulty: 2 },
  ),
];
