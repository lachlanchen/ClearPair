import type { Lesson, Product, Text, Word } from "./types";
import { scriptLessons } from "./script-curriculum";
import { cantoneseLessons } from "./cantonese-curriculum";
import { japaneseLessons } from './japanese-curriculum';

const t = (en: string, zh: string): Text => ({ en, zh });
const e = (text: string, ipa: string, sentence?: string): Word => ({
  text,
  ipa,
  sentence: sentence || `I said ${text} again.`,
});
const z = (
  text: string,
  ipa: string,
  gloss: string,
  sentence?: string,
): Word => ({ text, ipa, gloss, sentence: sentence || `这个字是${text}。` });
const pair = (a: Word, b: Word): [Word, Word] => [a, b];
const en = (
  id: string,
  group: string,
  title: Text,
  sounds: [string, string],
  cue: Text,
  sides: [Text, Text],
  tip: Text,
  pairs: [Word, Word][],
  extra: Partial<Lesson> = {},
): Lesson => ({
  id,
  group,
  title,
  sounds,
  cue,
  sides,
  tip,
  pairs,
  language: "en-US",
  diagram: "tongue",
  difficulty: 1,
  ...extra,
});
const zh = (
  id: string,
  group: string,
  title: Text,
  sounds: [string, string],
  cue: Text,
  sides: [Text, Text],
  tip: Text,
  pairs: [Word, Word][],
  extra: Partial<Lesson> = {},
): Lesson => ({
  id,
  group,
  title,
  sounds,
  cue,
  sides,
  tip,
  pairs,
  language: "zh-CN",
  diagram: "tongue",
  difficulty: 1,
  ...extra,
});
export const lessons: Lesson[] = [
  en(
    "hf-en",
    "Foundations",
    t("Air, with and without friction", "气流与摩擦"),
    ["h", "f"],
    t(
      "A gentle breath, or air against your lower lip.",
      "轻轻呼气，或让气流经过下唇。",
    ),
    [
      t(
        "/h/: open the mouth for the following vowel and breathe out.",
        "/h/：摆好后面元音的口形，呼出气流。",
      ),
      t(
        "/f/: rest the upper teeth lightly on the lower lip; keep air flowing.",
        "/f/：上齿轻触下唇，让气流持续通过。",
      ),
    ],
    t(
      "Use a mirror. Only /f/ needs lip–teeth contact. Do not bite.",
      "照镜子：只有 /f/ 需要唇齿接触，不要咬住。",
    ),
    [
      pair(
        e("hat", "hæt", "The hat is on the chair."),
        e("fat", "fæt", "The cat is not fat."),
      ),
      pair(e("hill", "hɪl"), e("fill", "fɪl")),
      pair(e("heat", "hit"), e("feet", "fit")),
      pair(e("hair", "hɛɹ"), e("fair", "fɛɹ")),
      pair(e("harm", "hɑɹm"), e("farm", "fɑɹm")),
      pair(e("hit", "hɪt"), e("fit", "fɪt")),
    ],
    { diagram: "air" },
  ),
  zh(
    "hf-zh",
    "Mandarin",
    t("Mandarin h is farther back", "普通话 h 的摩擦在后方"),
    ["h", "f"],
    t(
      "Keep h in the back of the mouth; bring f to the lip.",
      "h 的摩擦在口腔后部；f 在唇齿之间。",
    ),
    [
      t(
        "h: raise the back of the tongue toward the soft palate. Gentle friction, not a throat squeeze.",
        "h：舌后部接近软腭，轻柔摩擦，不要挤喉。",
      ),
      t(
        "f: upper teeth meet the lower lip lightly; the tongue stays relaxed.",
        "f：上齿轻触下唇，舌头放松。",
      ),
    ],
    t(
      "Mandarin h is commonly [x], unlike the usually breathier English [h].",
      "普通话 h 通常是 [x]，不同于英语中较轻的 [h]。",
    ),
    [
      pair(z("哈", "hā", "laugh"), z("发", "fā", "send")),
      pair(z("呼", "hū", "call"), z("夫", "fū", "husband")),
      pair(z("黑", "hēi", "black"), z("飞", "fēi", "fly")),
      pair(z("汉", "hàn", "Han"), z("饭", "fàn", "rice / meal")),
      pair(z("虎", "hǔ", "tiger"), z("斧", "fǔ", "axe")),
      pair(z("很", "hěn", "very"), z("粉", "fěn", "powder")),
    ],
    { diagram: "air" },
  ),
  en(
    "hf-final",
    "In context",
    t("Keep the final f", "保留词尾 f"),
    ["f", "v"],
    t(
      "Keep the lip–teeth contact at the end of the word.",
      "词尾也要保持唇齿接触。",
    ),
    [
      t(
        "/f/: air passes the lip without vocal-fold vibration.",
        "/f/：气流通过唇齿，声带不振动。",
      ),
      t(
        "/v/: use the same contact, with voicing. Final voicing can be partial.",
        "/v/：唇齿位置相同，加入声带振动；词尾可能部分清化。",
      ),
    ],
    t(
      "English /h/ does not normally end a word. Use f/v here, not invented final h words.",
      "英语 /h/ 通常不出现在词尾。这里用 f/v 对比，不编造词尾 h。",
    ),
    [
      pair(
        e("leaf", "lif", "Pick up the leaf."),
        e("leave", "liv", "Please leave the door open."),
      ),
      pair(e("safe", "seɪf"), e("save", "seɪv")),
      pair(e("proof", "pɹuf"), e("prove", "pɹuv")),
      pair(e("belief", "bɪˈlif"), e("believe", "bɪˈliv")),
    ],
    { diagram: "air", difficulty: 2 },
  ),
  en(
    "lr-start",
    "Foundations",
    t("Touch for L. Shape for R.", "L 接触，R 塑形"),
    ["l", "ɹ"],
    t(
      "The tongue tip touches for L, but not for English R.",
      "L 舌尖接触齿龈，英语 R 不接触。",
    ),
    [
      t(
        "/l/: touch the ridge behind the upper teeth and let air pass around the sides.",
        "/l/：舌尖接触上齿后方齿龈，气流从舌侧通过。",
      ),
      t(
        "/ɹ/: use a bunched or slightly curled tongue without making contact. Light lip rounding may help.",
        "/ɹ/：舌身拱起或舌尖略后卷，不接触上腭，可轻微圆唇。",
      ),
    ],
    t(
      "There is more than one good R tongue shape. Do not force the tongue into a painful curl.",
      "R 可以用不同舌形发出，不要勉强卷舌或造成疼痛。",
    ),
    [
      pair(e("light", "laɪt"), e("right", "ɹaɪt")),
      pair(e("low", "loʊ"), e("row", "ɹoʊ", "Please sit in this row.")),
      pair(e("lock", "lɑk"), e("rock", "ɹɑk")),
      pair(e("load", "loʊd"), e("road", "ɹoʊd")),
      pair(e("late", "leɪt"), e("rate", "ɹeɪt")),
      pair(e("long", "lɔŋ"), e("wrong", "ɹɔŋ")),
    ],
  ),
  en(
    "lr-more",
    "Everyday words",
    t("Keep the vowel the same", "保持相同元音"),
    ["l", "ɹ"],
    t(
      "Change the beginning, not the whole syllable.",
      "只改变开头，不要改变整个音节。",
    ),
    [
      t("L starts with a tongue-tip contact.", "L 从舌尖接触齿龈开始。"),
      t(
        "R starts without that contact; keep a smooth, voiced sound.",
        "R 没有这个接触，保持流畅的浊音。",
      ),
    ],
    t(
      "Say a short sentence when a single word feels awkward.",
      "单词不好发时，改用短句练习。",
    ),
    [
      pair(e("lice", "laɪs"), e("rice", "ɹaɪs")),
      pair(e("led", "lɛd"), e("red", "ɹɛd")),
      pair(e("leap", "lip"), e("reap", "ɹip")),
      pair(e("list", "lɪst"), e("wrist", "ɹɪst")),
      pair(e("lamp", "læmp"), e("ramp", "ɹæmp")),
      pair(e("lake", "leɪk"), e("rake", "ɹeɪk")),
    ],
  ),
  en(
    "lr-clusters",
    "In context",
    t("Two consonants, one smooth start", "辅音连缀，流畅衔接"),
    ["l", "ɹ"],
    t(
      "Move straight from the first consonant into L or R.",
      "从第一个辅音直接过渡到 L 或 R。",
    ),
    [
      t(
        "In /pl bl kl/, move to the L contact without adding a vowel.",
        "/pl bl kl/ 中直接接 L，不添加元音。",
      ),
      t(
        "In /pɹ bɹ kɹ/, prepare the R shape as the first consonant releases.",
        "/pɹ bɹ kɹ/ 中，在前一个辅音释放时准备 R 舌形。",
      ),
    ],
    t(
      "Slow does not mean adding a syllable: play is not “puh-lay”.",
      "慢读不等于增加音节：play 不读成 “puh-lay”。",
    ),
    [
      pair(e("play", "pleɪ"), e("pray", "pɹeɪ")),
      pair(e("glass", "ɡlæs"), e("grass", "ɡɹæs")),
      pair(e("clue", "klu"), e("crew", "kɹu")),
      pair(e("fly", "flaɪ"), e("fry", "fɹaɪ")),
      pair(e("blew", "blu"), e("brew", "bɹu")),
    ],
    { difficulty: 2 },
  ),
  en(
    "lr-end",
    "In context",
    t("L and R at the end", "词尾 L 与 R"),
    ["l", "ɹ"],
    t(
      "Finish the word without adding an extra vowel.",
      "词尾不要添加额外元音。",
    ),
    [
      t(
        "Final L often has a raised tongue back as well as the tip gesture: a darker L.",
        "词尾 L 常伴随舌后部抬起，音色较暗。",
      ),
      t(
        "In General American, final R colors the preceding vowel. Other accents may not pronounce it.",
        "通用美式英语的词尾 R 会使前面的元音带卷舌色彩；其他口音可能不发 R。",
      ),
    ],
    t(
      "This lesson uses a rhotic American model, not a rule that all accents must follow.",
      "本课采用发词尾 R 的美式示范，不要求所有口音都如此。",
    ),
    [
      pair(e("feel", "fil"), e("fear", "fɪɹ")),
      pair(e("pool", "pul"), e("poor", "pʊɹ")),
      pair(e("tool", "tul"), e("tour", "tʊɹ")),
      pair(e("file", "faɪl"), e("fire", "faɪɹ")),
    ],
    {
      difficulty: 3,
      caution: t(
        "These are word contrasts, not strict minimal pairs in every accent; the vowels may change too.",
        "这些是词语对比，并非每种口音下都属于严格最小对立，元音也可能不同。",
      ),
    },
  ),
  en(
    "v-i",
    "Vowels",
    t("Sheep or ship?", "长短之外：sheep / ship"),
    ["i", "ɪ"],
    t(
      "Start with tongue position—not a stopwatch.",
      "先关注舌位，不只是时长。",
    ),
    [
      t(
        "/i/: tongue body high and forward, lips unrounded.",
        "/i/：舌身高而靠前，不圆唇。",
      ),
      t(
        "/ɪ/: tongue a little lower and more central; keep the jaw easy.",
        "/ɪ/：舌位稍低、稍靠中央，下颌放松。",
      ),
    ],
    t(
      "English duration changes with stress and surrounding sounds. Making ship longer does not make sheep.",
      "英语时长受重音和相邻音影响。把 ship 拉长，并不等于 sheep。",
    ),
    [
      pair(e("sheep", "ʃip"), e("ship", "ʃɪp")),
      pair(e("leave", "liv"), e("live", "lɪv", "I live near the park.")),
      pair(e("seat", "sit"), e("sit", "sɪt")),
      pair(e("feel", "fil"), e("fill", "fɪl")),
    ],
    {
      diagram: "vowel",
      positions: [
        [18, 12],
        [29, 28],
      ],
    },
  ),
  en(
    "v-ae",
    "Vowels",
    t("Bed or bad?", "bed / bad：张口程度"),
    ["ɛ", "æ"],
    t("Let the jaw open a little more for /æ/.", "发 /æ/ 时下颌再打开一些。"),
    [
      t(
        "/ɛ/: a mid-front vowel, with an easy jaw.",
        "/ɛ/：前部中低元音，下颌自然。",
      ),
      t(
        "/æ/: tongue lower and mouth more open; keep it forward.",
        "/æ/：舌位更低、嘴更开，仍在前部。",
      ),
    ],
    t(
      "Practise before the same final consonant, so the contrast is easy to hear.",
      "先在相同的词尾辅音前练习，更容易听出区别。",
    ),
    [
      pair(e("bed", "bɛd"), e("bad", "bæd")),
      pair(e("men", "mɛn"), e("man", "mæn")),
      pair(e("pen", "pɛn"), e("pan", "pæn")),
      pair(e("guess", "ɡɛs"), e("gas", "ɡæs")),
    ],
    {
      diagram: "vowel",
      positions: [
        [27, 56],
        [30, 85],
      ],
    },
  ),
  en(
    "v-ae-uh",
    "Vowels",
    t("Cap or cup?", "cap / cup：前部与中央"),
    ["æ", "ʌ"],
    t(
      "Change where the tongue sits, not just how long you speak.",
      "改变舌位，而不只是时长。",
    ),
    [
      t(
        "/æ/: low and toward the front, with a wider opening.",
        "/æ/：舌位低且靠前，开口较大。",
      ),
      t(
        "/ʌ/: more central, usually with a smaller opening.",
        "/ʌ/：舌位更靠中央，开口通常较小。",
      ),
    ],
    t("Keep the lips unrounded for both sounds.", "这两个音都不圆唇。"),
    [
      pair(e("cap", "kæp"), e("cup", "kʌp")),
      pair(e("hat", "hæt"), e("hut", "hʌt")),
      pair(e("ran", "ɹæn"), e("run", "ɹʌn")),
      pair(e("ankle", "ˈæŋkəl"), e("uncle", "ˈʌŋkəl")),
    ],
    {
      diagram: "vowel",
      positions: [
        [30, 85],
        [55, 65],
      ],
    },
  ),
  en(
    "v-u",
    "Vowels",
    t("Full or fool?", "full / fool：舌位与圆唇"),
    ["ʊ", "u"],
    t(
      "Both can be rounded; their tongue positions differ.",
      "两个音都可圆唇，但舌位不同。",
    ),
    [
      t(
        "/ʊ/: tongue slightly lower and more central; relaxed rounding.",
        "/ʊ/：舌位稍低、稍靠中央，圆唇较自然。",
      ),
      t(
        "/u/: tongue higher, lips rounded; the exact backness varies by speaker.",
        "/u/：舌位更高、圆唇；前后位置因人而异。",
      ),
    ],
    t(
      "Do not make a correct vowel only by stretching the other one.",
      "不要只靠把另一个元音拉长来发音。",
    ),
    [
      pair(e("full", "fʊl"), e("fool", "ful")),
      pair(e("pull", "pʊl"), e("pool", "pul")),
      pair(e("look", "lʊk"), e("Luke", "luk")),
      pair(e("could", "kʊd"), e("cooed", "kud")),
    ],
    {
      diagram: "vowel",
      positions: [
        [72, 28],
        [87, 12],
      ],
    },
  ),
  en(
    "v-uh-ah",
    "Vowels",
    t("Cut or cot?", "cut / cot：中央与后部"),
    ["ʌ", "ɑ"],
    t("Open and move back for the vowel in cot.", "cot 的元音更开、更靠后。"),
    [
      t(
        "/ʌ/: central, unrounded, with a moderate opening.",
        "/ʌ/：中央、不圆唇，开口适中。",
      ),
      t(
        "/ɑ/: lower and farther back, with unrounded lips.",
        "/ɑ/：更低、更靠后，不圆唇。",
      ),
    ],
    t(
      "Use an American model consistently; British LOT often has a different vowel.",
      "保持同一示范口音；英式 LOT 元音通常不同。",
    ),
    [
      pair(e("cut", "kʌt"), e("cot", "kɑt")),
      pair(e("luck", "lʌk"), e("lock", "lɑk")),
      pair(e("hut", "hʌt"), e("hot", "hɑt")),
      pair(e("cup", "kʌp"), e("cop", "kɑp")),
    ],
    {
      diagram: "vowel",
      positions: [
        [55, 65],
        [86, 88],
      ],
    },
  ),
  en(
    "v-ei",
    "Vowels",
    t("A moving vowel", "会移动的元音"),
    ["eɪ", "ɛ"],
    t(
      "A diphthong moves toward another vowel position.",
      "双元音会向另一个舌位移动。",
    ),
    [
      t(
        "/eɪ/: begin mid-front, then move toward a higher front position.",
        "/eɪ/：从前部中高位置开始，向更高的前部移动。",
      ),
      t(
        "/ɛ/: keep a relatively steady mid-low front vowel.",
        "/ɛ/：保持相对稳定的前部中低元音。",
      ),
    ],
    t(
      "One syllable, one smooth movement—not two separate vowels.",
      "一个音节，平滑过渡，不要拆成两个音节。",
    ),
    [
      pair(e("late", "leɪt"), e("let", "lɛt")),
      pair(e("mate", "meɪt"), e("met", "mɛt")),
      pair(e("pain", "peɪn"), e("pen", "pɛn")),
      pair(e("main", "meɪn"), e("men", "mɛn")),
    ],
    {
      diagram: "vowel",
      positions: [
        [22, 35],
        [27, 56],
      ],
    },
  ),
  en(
    "v-ai",
    "Vowels",
    t("Ride or raid?", "ride / raid：不同起点"),
    ["aɪ", "eɪ"],
    t(
      "Both move upward; start in a different place.",
      "两个音都向上移动，但起点不同。",
    ),
    [
      t(
        "/aɪ/: start with an open vowel and glide higher.",
        "/aɪ/：从开元音开始，向高处滑动。",
      ),
      t(
        "/eɪ/: begin much higher, in the front-middle region.",
        "/eɪ/：从更高的前部中间区域开始。",
      ),
    ],
    t(
      "Listen to the beginning of the vowel, not only its ending.",
      "注意听元音开头，不只是结尾。",
    ),
    [
      pair(e("ride", "ɹaɪd"), e("raid", "ɹeɪd")),
      pair(e("like", "laɪk"), e("lake", "leɪk")),
      pair(e("bite", "baɪt"), e("bait", "beɪt")),
      pair(e("mile", "maɪl"), e("mail", "meɪl")),
    ],
    {
      diagram: "vowel",
      positions: [
        [50, 90],
        [22, 35],
      ],
      difficulty: 2,
    },
  ),
  en(
    "v-merger",
    "Accent choices",
    t("Cot and caught", "cot / caught 与口音差异"),
    ["ɑ", "ɔ"],
    t(
      "An optional contrast: many American speakers merge these vowels.",
      "可选对比：许多美式口音不区分这两个元音。",
    ),
    [
      t(
        "In an accent with the distinction, cot is usually lower and unrounded.",
        "区分两音的口音中，cot 通常更低、不圆唇。",
      ),
      t(
        "Caught may be higher and more rounded in an accent that distinguishes it.",
        "区分两音的口音中，caught 可更高、更圆唇。",
      ),
    ],
    t(
      "A merger is a normal accent feature, not a pronunciation failure.",
      "合流是正常口音特征，不是发音失败。",
    ),
    [
      pair(e("cot", "kɑt"), e("caught", "kɔt")),
      pair(e("stock", "stɑk"), e("stalk", "stɔk")),
      pair(e("Don", "dɑn"), e("dawn", "dɔn")),
    ],
    {
      diagram: "vowel",
      positions: [
        [86, 88],
        [87, 58],
      ],
      difficulty: 3,
      caution: t(
        "The installed reference voice may merge this pair. Compare accents; do not use a merged model to grade the contrast.",
        "设备示范语音可能合流。可比较口音，但不要用合流示范评判此对比。",
      ),
    },
  ),
  en(
    "th-s",
    "Consonants",
    t("Thin or sin?", "thin / sin：舌尖位置"),
    ["θ", "s"],
    t(
      "Move the contact point, while keeping both sounds voiceless.",
      "改变气流通过的位置，两音都不振动声带。",
    ),
    [
      t(
        "/θ/: bring the tongue tip lightly to the upper teeth or just between the teeth; let air through.",
        "/θ/：舌尖轻触上齿或稍伸入齿间，让气流通过。",
      ),
      t(
        "/s/: keep the tongue behind the teeth and guide a narrow stream of air forward.",
        "/s/：舌头留在齿后，引导细气流向前。",
      ),
    ],
    t(
      "A small tongue movement is enough. You do not need to push the tongue far out.",
      "小幅度移动就够了，不需要把舌头伸得很远。",
    ),
    [
      pair(e("thin", "θɪn"), e("sin", "sɪn")),
      pair(e("think", "θɪŋk"), e("sink", "sɪŋk")),
      pair(e("thick", "θɪk"), e("sick", "sɪk")),
      pair(e("thumb", "θʌm"), e("sum", "sʌm")),
      pair(e("mouth", "maʊθ", "Open your mouth."), e("mouse", "maʊs")),
    ],
    { diagram: "air" },
  ),
  en(
    "th-z",
    "Consonants",
    t("Voiced TH and Z", "浊 TH 与 Z"),
    ["ð", "z"],
    t(
      "Keep the voice on; change the tongue position.",
      "保持声带振动，改变舌位。",
    ),
    [
      t(
        "/ð/: gentle dental contact with voicing.",
        "/ð/：轻柔的齿间接触，同时发浊音。",
      ),
      t(
        "/z/: a grooved airflow behind the teeth, also voiced.",
        "/z/：齿后形成集中的气流，同时发浊音。",
      ),
    ],
    t(
      "Rest two fingers lightly on the throat to notice voicing; never press.",
      "两根手指轻放喉部感受振动，不要按压。",
    ),
    [
      pair(e("then", "ðɛn"), e("Zen", "zɛn")),
      pair(e("breathe", "bɹið"), e("breeze", "bɹiz")),
      pair(e("clothing", "ˈkloʊðɪŋ"), e("closing", "ˈkloʊzɪŋ")),
    ],
    { diagram: "air", difficulty: 2 },
  ),
  en(
    "th-d",
    "Consonants",
    t("They or day?", "they / day：持续与闭塞"),
    ["ð", "d"],
    t(
      "TH lets air continue. D briefly stops it.",
      "TH 让气流持续通过；D 有短暂闭塞。",
    ),
    [
      t(
        "/ð/: keep a small passage for airflow at the teeth.",
        "/ð/：齿间保留气流通道。",
      ),
      t(
        "/d/: touch the alveolar ridge, briefly close, then release.",
        "/d/：舌尖接触齿龈，短暂闭塞后释放。",
      ),
    ],
    t(
      "Start slowly with the consonant, then let it flow into the vowel.",
      "先慢练辅音，再自然连接元音。",
    ),
    [
      pair(e("they", "ðeɪ"), e("day", "deɪ")),
      pair(e("then", "ðɛn"), e("den", "dɛn")),
      pair(e("though", "ðoʊ"), e("dough", "doʊ")),
      pair(e("there", "ðɛɹ"), e("dare", "dɛɹ")),
    ],
    { diagram: "air", difficulty: 2 },
  ),
  en(
    "th-voice",
    "Consonants",
    t("The two TH sounds", "两种 TH"),
    ["θ", "ð"],
    t(
      "A similar tongue placement, with a voicing contrast.",
      "相近的舌位，加上清浊对比。",
    ),
    [
      t("/θ/: dental airflow without voicing.", "/θ/：齿间气流，不振动声带。"),
      t(
        "/ð/: add voicing while allowing air to continue.",
        "/ð/：气流保持通畅，同时振动声带。",
      ),
    ],
    t(
      "Spelling alone does not tell you which TH a word uses. Learn the word with its sound.",
      "单靠拼写不能判断哪种 TH，结合单词学习。",
    ),
    [
      pair(
        e("teeth", "tiθ"),
        e("teethe", "tið", "Babies teethe at different ages."),
      ),
      pair(
        e("wreath", "ɹiθ"),
        e("wreathe", "ɹið", "Flowers wreathe the doorway."),
      ),
    ],
    { diagram: "air", difficulty: 3 },
  ),
  en(
    "v-w",
    "Consonants",
    t("Vest or west?", "vest / west：唇齿与圆唇"),
    ["v", "w"],
    t("Touch the lip for V. Round the lips for W.", "V 唇齿接触；W 圆唇。"),
    [
      t(
        "/v/: light upper-teeth/lower-lip contact with voicing.",
        "/v/：上齿轻触下唇，发浊音。",
      ),
      t(
        "/w/: round the lips, raise the tongue back, then glide into the vowel.",
        "/w/：圆唇、舌后部抬起，再滑入元音。",
      ),
    ],
    t(
      "Check in a mirror: W does not need teeth touching the lip.",
      "照镜子检查：W 不需要牙齿接触下唇。",
    ),
    [
      pair(e("vest", "vɛst"), e("west", "wɛst")),
      pair(e("vet", "vɛt"), e("wet", "wɛt")),
      pair(e("vine", "vaɪn"), e("wine", "waɪn")),
      pair(e("veil", "veɪl"), e("whale", "weɪl")),
    ],
    { diagram: "air" },
  ),
  en(
    "s-z",
    "Consonants",
    t("Sip or zip?", "sip / zip：清浊"),
    ["s", "z"],
    t(
      "A similar tongue groove; add voicing for Z.",
      "相似舌槽，Z 加入声带振动。",
    ),
    [
      t("/s/: voiceless alveolar friction.", "/s/：清齿龈摩擦音。"),
      t("/z/: voiced alveolar friction.", "/z/：浊齿龈摩擦音。"),
    ],
    t(
      "At word endings, the preceding vowel is often shorter before /s/ than before /z/.",
      "词尾时，/s/ 前的元音常比 /z/ 前短。",
    ),
    [
      pair(e("sip", "sɪp"), e("zip", "zɪp")),
      pair(e("seal", "sil"), e("zeal", "zil")),
      pair(e("rice", "ɹaɪs"), e("rise", "ɹaɪz")),
      pair(e("bus", "bʌs"), e("buzz", "bʌz")),
    ],
    { diagram: "air" },
  ),
  en(
    "sh-s",
    "Consonants",
    t("Ship or sip?", "ship / sip：向后一点"),
    ["ʃ", "s"],
    t(
      "Shift the tongue shape and listen to the noise.",
      "改变舌形，听摩擦声的区别。",
    ),
    [
      t(
        "/ʃ/: a broader constriction a little farther back; slight lip rounding is common.",
        "/ʃ/：较宽的气流通道，位置稍后，常略圆唇。",
      ),
      t(
        "/s/: a narrow grooved stream near the alveolar ridge.",
        "/s/：齿龈附近的细气流。",
      ),
    ],
    t(
      "Aim for smooth air, not a stop or an added vowel.",
      "保持气流平滑，不要闭塞或添加元音。",
    ),
    [
      pair(e("ship", "ʃɪp"), e("sip", "sɪp")),
      pair(e("she", "ʃi"), e("see", "si")),
      pair(e("shock", "ʃɑk"), e("sock", "sɑk")),
      pair(e("cash", "kæʃ"), e("Cass", "kæs")),
    ],
  ),
  en(
    "ch-sh",
    "Consonants",
    t("Chop or shop?", "chop / shop：塞擦与摩擦"),
    ["tʃ", "ʃ"],
    t(
      "CH starts with a brief closure; SH does not.",
      "CH 有短暂闭塞，SH 没有。",
    ),
    [
      t(
        "/tʃ/: close, then release into friction as one sound.",
        "/tʃ/：先闭塞再释放为摩擦，作为一个音。",
      ),
      t("/ʃ/: begin the friction directly.", "/ʃ/：直接开始摩擦。"),
    ],
    t("Do not split CH into separate syllables.", "不要把 CH 拆成不同音节。"),
    [
      pair(e("chop", "tʃɑp"), e("shop", "ʃɑp")),
      pair(e("cheap", "tʃip"), e("sheep", "ʃip")),
      pair(e("chip", "tʃɪp"), e("ship", "ʃɪp")),
      pair(e("catch", "kætʃ"), e("cash", "kæʃ")),
    ],
  ),
  en(
    "n-ng",
    "Endings",
    t("Sin or sing?", "sin / sing：鼻音词尾"),
    ["n", "ŋ"],
    t(
      "Both use nasal airflow. The tongue closure moves.",
      "都通过鼻腔出气，但舌头闭塞位置不同。",
    ),
    [
      t("/n/: tongue tip meets the alveolar ridge.", "/n/：舌尖接触齿龈。"),
      t(
        "/ŋ/: tongue back meets the soft palate; do not add /ɡ/ to sing.",
        "/ŋ/：舌后部接触软腭；sing 词尾不要加 /ɡ/。",
      ),
    ],
    t(
      "Place a finger lightly beside the nose to notice vibration.",
      "可在鼻旁轻放手指感受振动。",
    ),
    [
      pair(e("sin", "sɪn"), e("sing", "sɪŋ")),
      pair(e("thin", "θɪn"), e("thing", "θɪŋ")),
      pair(e("ban", "bæn"), e("bang", "bæŋ")),
      pair(e("ran", "ɹæn"), e("rang", "ɹæŋ")),
    ],
    { difficulty: 2 },
  ),
  en(
    "end-t-d",
    "Endings",
    t("Bet or bed?", "bet / bed：词尾线索"),
    ["t", "d"],
    t(
      "Listen to the vowel duration as well as the ending.",
      "除了词尾，也听前面元音的时长。",
    ),
    [
      t(
        "Before /t/, the vowel is often shorter. A final stop may have no audible release.",
        "/t/ 前元音常较短。词尾塞音可以不明显爆破。",
      ),
      t(
        "Before /d/, the vowel is often longer. Full final voicing is not always present.",
        "/d/ 前元音常较长，词尾未必全程浊音。",
      ),
    ],
    t(
      "A final consonant does not need an added “uh” to be clear.",
      "词尾辅音不需要再加一个“呃”才算清楚。",
    ),
    [
      pair(e("bet", "bɛt"), e("bed", "bɛd")),
      pair(e("seat", "sit"), e("seed", "sid")),
      pair(e("write", "ɹaɪt"), e("ride", "ɹaɪd")),
      pair(e("coat", "koʊt"), e("code", "koʊd")),
    ],
    { difficulty: 2 },
  ),
  zh(
    "z-zh",
    "Initials",
    t("z and zh: forward or back", "z / zh：前后位置"),
    ["z", "zh"],
    t(
      "Keep the same final and tone; move the initial.",
      "保持韵母和声调，只改变声母。",
    ),
    [
      t(
        "z [ts]: tongue toward the alveolar/dental region; brief closure then friction.",
        "z [ts]：舌尖在齿龈附近，先闭塞再摩擦。",
      ),
      t(
        "zh [ʈʂ]: constriction farther back; no need for an exaggerated curl.",
        "zh [ʈʂ]：阻碍位置更靠后，不必过度卷舌。",
      ),
    ],
    t(
      "Compare actual words with the same final before trying the zi/zhi/ji series.",
      "先对比相同韵母的词，再练 zi/zhi/ji 系列。",
    ),
    [
      pair(z("早", "zǎo", "early"), z("找", "zhǎo", "look for")),
      pair(z("在", "zài", "at"), z("债", "zhài", "debt")),
      pair(z("租", "zū", "rent"), z("猪", "zhū", "pig")),
      pair(z("增", "zēng", "increase"), z("争", "zhēng", "compete")),
    ],
  ),
  zh(
    "c-ch",
    "Initials",
    t("c and ch: keep the puff", "c / ch：保留送气"),
    ["c", "ch"],
    t(
      "Both are aspirated affricates; their place differs.",
      "都是送气塞擦音，发音位置不同。",
    ),
    [
      t(
        "c [tsʰ]: release with air near the front teeth.",
        "c [tsʰ]：靠前形成阻碍，释放时送气。",
      ),
      t(
        "ch [ʈʂʰ]: release farther back with aspiration.",
        "ch [ʈʂʰ]：位置更靠后，释放时送气。",
      ),
    ],
    t(
      "Try a small piece of tissue in front of your mouth to notice aspiration.",
      "可用嘴前的一小片纸感受送气。",
    ),
    [
      pair(z("草", "cǎo", "grass"), z("炒", "chǎo", "stir-fry")),
      pair(z("擦", "cā", "wipe"), z("插", "chā", "insert")),
      pair(z("粗", "cū", "coarse"), z("出", "chū", "go out")),
      pair(z("仓", "cāng", "storehouse"), z("昌", "chāng", "prosperous")),
    ],
    { diagram: "air" },
  ),
  zh(
    "s-sh",
    "Initials",
    t("s and sh: continuous air", "s / sh：持续摩擦"),
    ["s", "sh"],
    t(
      "No complete closure. Listen to the friction quality.",
      "没有完全闭塞，注意摩擦声的音色。",
    ),
    [
      t(
        "s [s]: tongue blade/tip near the alveolar region.",
        "s [s]：舌尖或舌叶在齿龈附近。",
      ),
      t(
        "sh [ʂ]: constriction farther back, with a different tongue shape.",
        "sh [ʂ]：位置更靠后，舌形不同。",
      ),
    ],
    t(
      "Mandarin sh and English sh are similar, but not identical articulations.",
      "普通话 sh 与英语 sh 相似，但发音方式并不完全相同。",
    ),
    [
      pair(z("三", "sān", "three"), z("山", "shān", "mountain")),
      pair(z("桑", "sāng", "mulberry"), z("商", "shāng", "business")),
      pair(z("搜", "sōu", "search"), z("收", "shōu", "receive")),
      pair(z("苏", "sū", "revive"), z("书", "shū", "book")),
    ],
  ),
  zh(
    "j-q",
    "Initials",
    t("j and q: aspiration", "j / q：送气对比"),
    ["j", "q"],
    t(
      "Same forward tongue region; q adds a stronger puff.",
      "相近的前部舌位，q 的送气更强。",
    ),
    [
      t(
        "j [tɕ]: tongue blade/body raised toward the front of the palate; unaspirated.",
        "j [tɕ]：舌面前部抬向硬腭前部，不送气。",
      ),
      t(
        "q [tɕʰ]: same region, with aspiration after release.",
        "q [tɕʰ]：位置相近，释放后送气。",
      ),
    ],
    t(
      "Mandarin j is not the English sound in jeep.",
      "普通话 j 不等于英语 jeep 中的辅音。",
    ),
    [
      pair(z("鸡", "jī", "chicken"), z("七", "qī", "seven")),
      pair(z("酒", "jiǔ", "wine"), z("糗", "qiǔ", "embarrassment")),
      pair(z("精", "jīng", "refined"), z("轻", "qīng", "light")),
      pair(z("将", "jiāng", "will"), z("枪", "qiāng", "gun")),
    ],
    { diagram: "air" },
  ),
  zh(
    "q-x",
    "Initials",
    t("q and x: closure or flow", "q / x：闭塞与摩擦"),
    ["q", "x"],
    t(
      "q starts closed; x starts with continuous friction.",
      "q 先闭塞；x 直接摩擦。",
    ),
    [
      t(
        "q [tɕʰ]: closure, friction and aspiration.",
        "q [tɕʰ]：闭塞、摩擦，再送气。",
      ),
      t(
        "x [ɕ]: continuous friction with the front tongue body raised.",
        "x [ɕ]：舌面前部抬起，气流持续摩擦。",
      ),
    ],
    t(
      "Keep the tongue tip relaxed near the lower teeth rather than forcing it upward.",
      "舌尖自然靠近下齿，不要用力向上翘。",
    ),
    [
      pair(z("七", "qī", "seven"), z("西", "xī", "west")),
      pair(z("清", "qīng", "clear"), z("星", "xīng", "star")),
      pair(z("枪", "qiāng", "gun"), z("香", "xiāng", "fragrant")),
      pair(z("秋", "qiū", "autumn"), z("修", "xiū", "repair")),
    ],
  ),
  zh(
    "pinyin-i",
    "Sound families",
    t("One letter, different syllables", "同一个 i，不同的音"),
    ["zi / zhi", "ji"],
    t(
      "Pinyin spelling does not imply an identical vowel.",
      "拼音写法相同，不表示元音完全相同。",
    ),
    [
      t(
        "After z/c/s and zh/ch/sh/r, written i has special syllabic qualities.",
        "z/c/s 和 zh/ch/sh/r 后的 i 有特殊的成音节音色。",
      ),
      t(
        "After j/q/x, i is a high front unrounded vowel [i].",
        "j/q/x 后的 i 是高前不圆唇元音 [i]。",
      ),
    ],
    t(
      "Compare syllable families, not an imaginary single-vowel three-way minimal pair.",
      "比较音节系列，不要当作元音相同的三组最小对立。",
    ),
    [
      pair(z("知", "zhī", "know"), z("鸡", "jī", "chicken")),
      pair(z("吃", "chī", "eat"), z("七", "qī", "seven")),
      pair(z("诗", "shī", "poem"), z("西", "xī", "west")),
      pair(z("丝", "sī", "silk"), z("西", "xī", "west")),
    ],
    {
      difficulty: 2,
      caution: t(
        "These are syllable comparisons, not strict minimal pairs.",
        "这些是音节比较，不是严格的最小对立词。",
      ),
    },
  ),
  zh(
    "b-p",
    "Aspiration",
    t("b and p: feel the air", "b / p：感受送气"),
    ["b", "p"],
    t(
      "The central contrast is aspiration, not English-style voicing.",
      "主要区别是送气，不是英语式的清浊对比。",
    ),
    [
      t(
        "b [p]: close both lips and release without a strong puff.",
        "b [p]：双唇闭合后释放，不强送气。",
      ),
      t(
        "p [pʰ]: same lip closure, followed by a strong puff.",
        "p [pʰ]：相同双唇闭合，释放后送气较强。",
      ),
    ],
    t(
      "Do not add a separate h syllable after p.",
      "不要在 p 后添加一个独立的 h 音节。",
    ),
    [
      pair(z("八", "bā", "eight"), z("趴", "pā", "lie prone")),
      pair(z("抱", "bào", "hug"), z("炮", "pào", "cannon")),
      pair(z("班", "bān", "class"), z("攀", "pān", "climb")),
      pair(z("杯", "bēi", "cup"), z("胚", "pēi", "embryo")),
    ],
    { diagram: "air" },
  ),
  zh(
    "d-t",
    "Aspiration",
    t("d and t", "d / t：舌尖送气"),
    ["d", "t"],
    t(
      "A tongue-tip closure, with different amounts of aspiration.",
      "相同的舌尖闭塞，送气量不同。",
    ),
    [
      t("d [t]: release without a strong puff.", "d [t]：释放时不强送气。"),
      t("t [tʰ]: release with aspiration.", "t [tʰ]：释放后送气。"),
    ],
    t(
      "Keep the following vowel and tone the same.",
      "保持后面的韵母和声调相同。",
    ),
    [
      pair(z("低", "dī", "low"), z("梯", "tī", "ladder")),
      pair(z("肚", "dù", "belly"), z("兔", "tù", "rabbit")),
      pair(z("大", "dà", "big"), z("踏", "tà", "step")),
      pair(z("到", "dào", "arrive"), z("套", "tào", "set")),
    ],
    { diagram: "air" },
  ),
  zh(
    "g-k",
    "Aspiration",
    t("g and k", "g / k：舌后送气"),
    ["g", "k"],
    t("Both close at the back of the mouth.", "两个音都在口腔后部形成闭塞。"),
    [
      t(
        "g [k]: back-tongue closure, without strong aspiration.",
        "g [k]：舌后部闭塞，不强送气。",
      ),
      t(
        "k [kʰ]: same closure, then a puff of air.",
        "k [kʰ]：相同闭塞后加入送气。",
      ),
    ],
    t(
      "A gentle tissue test is more useful than making the sound louder.",
      "轻柔的纸片测试比一味加大音量更有用。",
    ),
    [
      pair(z("哥", "gē", "older brother"), z("科", "kē", "subject")),
      pair(z("姑", "gū", "aunt"), z("枯", "kū", "withered")),
      pair(z("刚", "gāng", "just"), z("康", "kāng", "healthy")),
    ],
    { diagram: "air" },
  ),
  zh(
    "z-c",
    "Aspiration",
    t("z and c", "z / c：塞擦送气"),
    ["z", "c"],
    t(
      "Keep the tongue forward; change the puff after release.",
      "舌位靠前，改变释放后的送气。",
    ),
    [
      t(
        "z [ts]: a short closure released into friction.",
        "z [ts]：短暂闭塞后释放为摩擦。",
      ),
      t(
        "c [tsʰ]: the same sequence followed by stronger aspiration.",
        "c [tsʰ]：相近动作，随后强送气。",
      ),
    ],
    t("Pinyin c is not English k or s.", "拼音 c 不等于英语 k 或 s。"),
    [
      pair(z("早", "zǎo", "early"), z("草", "cǎo", "grass")),
      pair(z("字", "zì", "character"), z("次", "cì", "time / occurrence")),
      pair(z("租", "zū", "rent"), z("粗", "cū", "coarse")),
    ],
    { diagram: "air" },
  ),
  zh(
    "zh-ch",
    "Aspiration",
    t("zh and ch", "zh / ch：舌后送气"),
    ["zh", "ch"],
    t(
      "Keep the back-shifted tongue shape; change aspiration.",
      "保持稍靠后的舌形，改变送气。",
    ),
    [
      t(
        "zh: unaspirated retroflex/postalveolar affricate.",
        "zh：不送气的舌尖后塞擦音。",
      ),
      t("ch: aspirated counterpart.", "ch：对应的送气音。"),
    ],
    t(
      "No need to press the tongue hard against the palate.",
      "不要用力把舌头压向上腭。",
    ),
    [
      pair(z("找", "zhǎo", "look for"), z("炒", "chǎo", "stir-fry")),
      pair(z("住", "zhù", "live"), z("处", "chù", "place")),
      pair(z("知", "zhī", "know"), z("吃", "chī", "eat")),
    ],
    { diagram: "air" },
  ),
  zh(
    "u-y",
    "Finals",
    t("u and ü: round the right vowel", "u / ü：圆唇与舌位"),
    ["u", "ü"],
    t(
      "Keep the lips rounded; move the tongue from back to front.",
      "保持圆唇，舌位由后移前。",
    ),
    [
      t("u [u]: high back rounded vowel.", "u [u]：高后圆唇元音。"),
      t(
        "ü [y]: high front rounded vowel; start with i and round the lips.",
        "ü [y]：高前圆唇元音；可先发 i，再圆唇。",
      ),
    ],
    t(
      "After j/q/x and in yu, the dots are omitted: ju/qu/xu/yu still use ü.",
      "j/q/x 后及 yu 中省略两点：ju/qu/xu/yu 仍是 ü。",
    ),
    [
      pair(z("路", "lù", "road"), z("绿", "lǜ", "green")),
      pair(z("努", "nǔ", "strive"), z("女", "nǚ", "woman")),
      pair(z("录", "lù", "record"), z("律", "lǜ", "law")),
    ],
    {
      diagram: "vowel",
      positions: [
        [88, 12],
        [18, 12],
      ],
    },
  ),
  zh(
    "i-y",
    "Finals",
    t("i and ü: change the lips", "i / ü：只改变圆唇"),
    ["i", "ü"],
    t(
      "Both are front vowels; ü needs lip rounding.",
      "两个音都在前部，ü 需要圆唇。",
    ),
    [
      t(
        "i [i]: tongue high and forward; lips unrounded.",
        "i [i]：舌位高而靠前，不圆唇。",
      ),
      t(
        "ü [y]: similar high front tongue, with rounded lips.",
        "ü [y]：相近的高前舌位，圆唇。",
      ),
    ],
    t(
      "Use actual words to keep the new vowel connected to meaning.",
      "结合真实词语，让新元音与意义建立联系。",
    ),
    [
      pair(z("鸡", "jī", "chicken"), z("居", "jū", "reside")),
      pair(z("西", "xī", "west"), z("需", "xū", "need")),
      pair(z("力", "lì", "strength"), z("绿", "lǜ", "green")),
    ],
    {
      diagram: "vowel",
      positions: [
        [18, 12],
        [24, 12],
      ],
    },
  ),
  zh(
    "an-ang",
    "Finals",
    t("an and ang", "an / ang：韵尾与元音"),
    ["an", "ang"],
    t(
      "Move the nasal closure, and notice the vowel changes too.",
      "改变鼻音闭塞位置，也留意元音变化。",
    ),
    [
      t(
        "an: finish with the tongue tip near the alveolar ridge.",
        "an：收尾时舌尖接近齿龈。",
      ),
      t(
        "ang: finish with the tongue back at the soft palate.",
        "ang：收尾时舌后部接触软腭。",
      ),
    ],
    t(
      "Do not pronounce a separate g after the final ng.",
      "ng 后不要另发一个 g。",
    ),
    [
      pair(z("山", "shān", "mountain"), z("商", "shāng", "business")),
      pair(z("班", "bān", "class"), z("帮", "bāng", "help")),
      pair(z("蓝", "lán", "blue"), z("狼", "láng", "wolf")),
      pair(z("干", "gān", "dry"), z("刚", "gāng", "just")),
    ],
    { difficulty: 2 },
  ),
  zh(
    "en-eng",
    "Finals",
    t("en and eng", "en / eng"),
    ["en", "eng"],
    t(
      "Listen to the whole final, not just its last moment.",
      "听整个韵母，不只听最后一瞬间。",
    ),
    [
      t(
        "en: front nasal closure at the tongue tip.",
        "en：舌尖形成前鼻音闭塞。",
      ),
      t(
        "eng: back nasal closure, with a different vowel quality.",
        "eng：舌后部形成闭塞，元音音色也不同。",
      ),
    ],
    t(
      "Regional Mandarin may merge some nasal finals. This course models a standard contrast.",
      "部分地区口音会合流；本课采用普通话标准对比。",
    ),
    [
      pair(z("真", "zhēn", "real"), z("蒸", "zhēng", "steam")),
      pair(z("陈", "chén", "surname Chen"), z("城", "chéng", "city")),
      pair(z("分", "fēn", "divide"), z("风", "fēng", "wind")),
      pair(z("盆", "pén", "basin"), z("朋", "péng", "friend")),
    ],
    { difficulty: 2 },
  ),
  zh(
    "in-ing",
    "Finals",
    t("in and ing", "in / ing"),
    ["in", "ing"],
    t(
      "A small final change makes a different word.",
      "韵母的小变化，可以构成不同词。",
    ),
    [
      t("in: finish with the tongue tip.", "in：用舌尖收尾。"),
      t(
        "ing: finish with the tongue back, without an added g.",
        "ing：用舌后部收尾，不加 g。",
      ),
    ],
    t(
      "Keep the tone stable while you focus on the final.",
      "专注韵母时保持声调稳定。",
    ),
    [
      pair(z("心", "xīn", "heart"), z("星", "xīng", "star")),
      pair(z("林", "lín", "woods"), z("零", "líng", "zero")),
      pair(z("亲", "qīn", "close"), z("清", "qīng", "clear")),
      pair(z("金", "jīn", "gold"), z("京", "jīng", "capital")),
    ],
    { difficulty: 2 },
  ),
  zh(
    "ou-uo",
    "Finals",
    t("ou and uo: direction matters", "ou / uo：方向不同"),
    ["ou", "uo"],
    t(
      "The movement through the vowel changes direction.",
      "元音中的运动方向不同。",
    ),
    [
      t(
        "ou: begin more open and glide toward a closer rounded position.",
        "ou：从较开位置滑向较闭、圆唇的位置。",
      ),
      t(
        "uo: begin with a short rounded glide and open into the main vowel.",
        "uo：先有短促圆唇介音，再向主要元音打开。",
      ),
    ],
    t(
      "Do not reverse the letters in your mouth: listen to the whole syllable.",
      "不要只看字母顺序，听完整音节。",
    ),
    [
      pair(z("走", "zǒu", "walk"), z("左", "zuǒ", "left")),
      pair(z("头", "tóu", "head"), z("驼", "tuó", "camel")),
      pair(z("够", "gòu", "enough"), z("过", "guò", "pass")),
    ],
    {
      diagram: "vowel",
      positions: [
        [80, 55],
        [90, 20],
      ],
      difficulty: 2,
    },
  ),
  zh(
    "tone-1-4",
    "Tones",
    t("Level or falling", "一声 / 四声"),
    ["1 · ˉ", "4 · ˋ"],
    t("Use your own comfortable pitch range.", "使用自己舒适的音高范围。"),
    [
      t("Tone 1: a relatively high, steady pitch.", "一声：相对高而平稳。"),
      t("Tone 4: begin relatively high and fall.", "四声：从相对高处下降。"),
    ],
    t(
      "Pitch is relative to your voice, not a fixed frequency or musical note.",
      "音高相对于自己的声音，不是固定频率或音符。",
    ),
    [
      pair(z("妈", "mā", "mother"), z("骂", "mà", "scold")),
      pair(z("书", "shū", "book"), z("树", "shù", "tree")),
      pair(z("衣", "yī", "clothing"), z("意", "yì", "meaning")),
    ],
    {
      diagram: "tone",
      tones: [
        [0.8, 0.8, 0.8, 0.8],
        [0.9, 0.65, 0.4, 0.15],
      ],
    },
  ),
  zh(
    "tone-2-3",
    "Tones",
    t("Rising or low", "二声 / 三声"),
    ["2 · ˊ", "3 · ˇ"],
    t(
      "Third tone is often low in a phrase—not always a big dip and rise.",
      "三声在短语中往往保持低音，不总是完整降升。",
    ),
    [
      t("Tone 2: start mid-range and rise.", "二声：从中部向上升。"),
      t(
        "Tone 3: keep a low target; an isolated careful form may fall then rise.",
        "三声：保持低音目标；单独慢读时可先降后升。",
      ),
    ],
    t(
      "The pitch trace is a visual aid, not a validated tone grade.",
      "音高曲线是视觉辅助，不是经过验证的声调评分。",
    ),
    [
      pair(z("麻", "má", "hemp"), z("马", "mǎ", "horse")),
      pair(z("梨", "lí", "pear"), z("李", "lǐ", "plum")),
      pair(z("鱼", "yú", "fish"), z("雨", "yǔ", "rain")),
    ],
    {
      diagram: "tone",
      tones: [
        [0.4, 0.5, 0.65, 0.85],
        [0.35, 0.18, 0.12, 0.5],
      ],
    },
  ),
  zh(
    "tone-context",
    "Connected speech",
    t("Tones change in phrases", "短语中的变调"),
    ["dictionary", "spoken"],
    t(
      "Read the written tone; practise the spoken pattern in context.",
      "认识本调，在语境中练习实际读法。",
    ),
    [
      t(
        "Dictionary tones identify the word. The first of two third tones usually becomes rising.",
        "字典声调帮助识别词。两个三声相连，前一个通常变为升调。",
      ),
      t(
        "不 becomes bú before a fourth tone. 一 changes with its use and following tone.",
        "不在四声前常读 bú。一随用法及后续声调变化。",
      ),
    ],
    t(
      "Both buttons play the natural phrase. This lesson is a context guide, not a listening quiz between two different words.",
      "两个按钮都播放自然短语。本课是语境讲解，不是两个不同词的听辨测验。",
    ),
    [
      pair(
        z("你好", "nǐ hǎo → ní hǎo", "hello", "你好，很高兴认识你。"),
        z("很好", "hěn hǎo → hén hǎo", "very good", "今天很好。"),
      ),
      pair(
        z("不是", "bù shì → bú shì", "is not", "这不是我的。"),
        z("一天", "yī tiān → yì tiān", "one day", "我等了一天。"),
      ),
    ],
    {
      diagram: "tone",
      difficulty: 3,
      caution: t(
        "Grouping matters in longer strings of third tones. These examples are connected-speech patterns, not minimal pairs.",
        "较长的三声组合受分组影响。这里是连读示例，不是最小对立词。",
      ),
    },
  ),
];

lessons.push(...scriptLessons, ...cantoneseLessons, ...japaneseLessons);
for (const lesson of lessons) {
  if (["tone-context", "v-merger"].includes(lesson.id))
    lesson.quizMode = "none";
}

export const products: Product[] = [
  {
    id: "handf",
    name: "H & F",
    zhName: "H 与 F",
    mark: "hf",
    accent: "#007b60",
    blurb: t("A little air. A clearer difference.", "一点气流，清楚的区别。"),
    lessons: ["hf-en", "hf-zh", "hf-final"],
  },
  {
    id: "landr",
    name: "L & R",
    zhName: "L 与 R",
    mark: "lr",
    accent: "#7038df",
    blurb: t("Find the shape. Find your sound.", "找到舌形，发出你的声音。"),
    lessons: ["lr-start", "lr-more", "lr-clusters", "lr-end"],
  },
  {
    id: "english",
    name: "English",
    zhName: "英语发音",
    mark: "ə",
    accent: "#2859dc",
    blurb: t(
      "Hear the small things that change a word.",
      "听见改变单词的细微差别。",
    ),
    lessons: [
      "v-i",
      "v-ae",
      "v-ae-uh",
      "v-u",
      "v-uh-ah",
      "v-ei",
      "v-ai",
      "th-s",
      "th-z",
      "th-d",
      "th-voice",
      "v-w",
      "s-z",
      "sh-s",
      "ch-sh",
      "n-ng",
      "end-t-d",
      "lr-start",
      "hf-en",
      "v-merger",
    ],
  },
  {
    id: "chinese",
    name: "Mandarin",
    zhName: "普通话发音",
    mark: "声",
    accent: "#d63c27",
    blurb: t(
      "From a single sound to a natural phrase.",
      "从一个音，到自然的短句。",
    ),
    lessons: [
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
      "hf-zh",
      "u-y",
      "i-y",
      "an-ang",
      "en-eng",
      "in-ing",
      "ou-uo",
      "tone-1-4",
      "tone-2-3",
      "tone-context",
    ],
  },
  {
    id: "korean",
    name: "Korean",
    zhName: "韩语辨音",
    mark: "한",
    accent: "#bd2678",
    blurb: t(
      "Remember the Hangul you mix up. Hear the sound that changes a word.",
      "记住易混韩文字母，听清改变词义的声音。",
    ),
    lessons: scriptLessons
      .filter((l) => l.language === "ko-KR")
      .map((l) => l.id),
  },
  {
    id: "arabic",
    name: "Arabic Letters",
    zhName: "阿拉伯字母",
    mark: "ب",
    accent: "#007b8e",
    blurb: t(
      "Similar shapes. Different letters. Learn the dots, joins and sounds.",
      "相似字形，不同字母。分清点、连写和声音。",
    ),
    lessons: scriptLessons
      .filter((l) => l.language === "ar-SA")
      .map((l) => l.id),
  },
  {
    id: 'cantonese', name: 'Cantonese', zhName: '粵語辨音', mark: '粵', accent: '#a64b00',
    blurb: t('Small shifts in tone. A whole new meaning.', '聲調一點變化，意思大不相同。'),
    lessons: cantoneseLessons.map((l) => l.id),
  },
  {
    id: 'japanese', name: 'Japanese', zhName: '日语假名与辨音', mark: 'あ', accent: '#b33460',
    blurb: t('Remember the shape. Hear the beat that changes a word.', '记住易混字形，听清改变词义的一拍。'),
    lessons: japaneseLessons.map(l => l.id),
  },
];
export const lessonById = (id: string) => lessons.find((l) => l.id === id)!;
export const productById = (id: string) =>
  products.find((p) => p.id === id) || products[2];
export const audioKey = (word: Word, language: string) =>
  `${language}-${Array.from(word.text)
    .map((c) => c.codePointAt(0)!.toString(16))
    .join("-")}`;
