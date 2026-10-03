import type { Lesson, Text, Word } from './types';
import { morae } from './japanese-mora';
const t = (en: string, zh: string): Text => ({ en, zh });
const w = (text: string, ipa: string, gloss: string, reading = text, sentence?: string): Word => {
  // The quoted isolated H-series is a sound, not the particle は/へ. Keep a
  // separate phonetic carrier reading so TTS cannot turn /ha/ into /wa/.
  const sound = ({'は':'ハ','へ':'ヘ','を':'オ','ヲ':'オ'} as Record<string,string>)[reading] ?? reading;
  return {text, ipa, gloss, reading, spoken: reading,
    sentence: sentence ?? `もう一度、「${text}」。`,
    sentenceReading: sentence ?? `もういちど、${sound}。`};
};
const p = (left: Word, right: Word): [Word, Word] => [left, right];
function lesson(id: string, title: Text, sounds: [string, string], cue: Text,
  sides: [Text, Text], pairs: [Word, Word][], extra: Partial<Lesson> = {}): Lesson {
  return { id, language: 'ja-JP', group: 'Kana & meaningful contrasts', title, sounds, cue, sides, pairs,
    diagram: 'glyph', difficulty: 1,
    tip: t('Compare the confusing part. Look away, recall it, then hear the pair again.',
      '专练容易混淆的部分。移开视线回忆，再连读词对。'), ...extra };
}

/** Original course text. Sources and limits: docs/JAPANESE-COURSE.md.
 * Romaji is a reading aid, not an IPA claim. Visual homophones are never audio quizzes. */
export const japaneseLessons: Lesson[] = [
  lesson('ja-hira-loops', t('A loop makes a difference', '一个圈，分清假名'), ['ぬ', 'め'],
    t('Notice the loop and the last turn, not just the outline.', '留意收尾的小圈和转向，不只看轮廓。'),
    [t('ぬ /nu/: the final loop is part of the shape.', 'ぬ /nu/：收尾有小圈。'),
     t('め /me/: compare the crossing without a final loop.', 'め /me/：交叉处相似，但没有收尾小圈。')],
    [p(w('ぬ', 'nu', 'nu'), w('め', 'me', 'me')),
     p(w('ね', 'ne', 'ne'), w('れ', 're', 're')),
     p(w('る', 'ru', 'ru'), w('ろ', 'ro', 'ro'))], { quizMode: 'visual', allowAudioQuiz: true }),
  lesson('ja-kata-direction', t('The direction is the clue', '方向就是线索'), ['シ', 'ツ'],
    t('Check the direction of the short marks and the final sweep.', '看短笔画的方向，再看最后一笔的走势。'),
    [t('シ /shi/: the small marks sit more vertically; the long stroke sweeps upward.', 'シ /shi/：短笔画排列较直，长笔画向上挑。'),
     t('ツ /tsu/: the small marks sit more horizontally; the long stroke sweeps downward.', 'ツ /tsu/：短笔画排列较平，长笔画向下写。')],
    [p(w('シ', 'shi', 'shi'), w('ツ', 'tsu', 'tsu')),
     p(w('ン', 'n', 'n'), w('ソ', 'so', 'so')),
     p(w('ク', 'ku', 'ku'), w('ケ', 'ke', 'ke'))], { quizMode: 'visual', allowAudioQuiz: true }),
  lesson('ja-script-bridge', t('Two scripts, the same sound', '两种假名，同一个音'), ['あ', 'ア'],
    t('Match the sound to both scripts. A different shape need not mean a different sound.', '把读音和两套字形对应起来；字形不同，不一定读音不同。'),
    [t('Hiragana often appears in grammar and native words.', '平假名常用于语法和固有词。'),
     t('Katakana often appears in loanwords, names and emphasis.', '片假名常用于外来词、名字和强调。')],
    [p(w('あ', 'a', 'hiragana a'), w('ア', 'a', 'katakana a', 'あ')),
     p(w('い', 'i', 'hiragana i'), w('イ', 'i', 'katakana i', 'い')),
     p(w('う', 'u', 'hiragana u'), w('ウ', 'u', 'katakana u', 'う')),
     p(w('え', 'e', 'hiragana e'), w('エ', 'e', 'katakana e', 'え')),
     p(w('お', 'o', 'hiragana o'), w('オ', 'o', 'katakana o', 'お'))],
    { quizMode: 'visual', caution: t('A script-memory drill, not a spoken distinction. Both cards have the same pronunciation.', '这是字形记忆，不是辨音；两张卡片的读音相同。') }),
  lesson('ja-dakuten', t('Two small marks, a new sound', '两点浊音符，读音有变化'), ['か', 'が'],
    t('Listen to the consonant before the vowel. Do not add another syllable for the marks.', '听元音前的辅音变化，不要把浊音符读成额外音节。'),
    [t('か /ka/: a voiceless stop before the vowel.', 'か /ka/：元音前是清塞音。'),
     t('が /ga/: its voicing and realization can vary with context.', 'が /ga/：清浊和具体音值会随语境变化。')],
    [p(w('か', 'ka', 'ka'), w('が', 'ga', 'ga')),
     p(w('さ', 'sa', 'sa'), w('ざ', 'za', 'za')),
     p(w('て', 'te', 'te'), w('で', 'de', 'de'))], { diagram: 'air' }),
  lesson('ja-h-b-p', t('Dots or a circle?', '浊音点，还是半浊音圈？'), ['は', 'ぱ'],
    t('Keep three categories in mind: h-series, b-series and p-series.', '同时留意三类：h 行、b 行和 p 行。'),
    [t('は /ha/: no full lip closure. The h-series changes before i and u.', 'は /ha/：双唇不完全闭合；h 行在 i、u 前的音值不同。'),
     t('ぱ /pa/: close and release both lips. ば /ba/ is another category.', 'ぱ /pa/：双唇闭合再放开；ば /ba/ 是另一类。')],
    [p(w('は', 'ha', 'ha'), w('ぱ', 'pa', 'pa')),
     p(w('ば', 'ba', 'ba'), w('ぱ', 'pa', 'pa')),
     p(w('ふ', 'fu', 'fu'), w('ぷ', 'pu', 'pu'))], { diagram: 'air', difficulty: 2 }),
  lesson('ja-long-vowels', t('Hold the extra beat', '多留一拍，意思不同'), ['短', '長'],
    t('A long vowel takes two mora beats. Keep the vowel quality steady.', '长元音占两拍，保持元音音质，不要变成另一个元音。'),
    [t('おばさん /obasan/: aunt; the ba vowel is short.', 'おばさん /obasan/：阿姨，ba 的元音较短。'),
     t('おばあさん /obaasan/: grandmother; ba-a has an extra beat.', 'おばあさん /obaasan/：奶奶，ba-a 多一拍。')],
    [p(w('おばさん', 'obasan', 'aunt'), w('おばあさん', 'obaasan', 'grandmother')),
     p(w('おじさん', 'ojisan', 'uncle'), w('おじいさん', 'ojiisan', 'grandfather')),
     p(w('ビル', 'biru', 'building', 'ビル'), w('ビール', 'biiru', 'beer', 'ビール'))],
    { diagram: 'vowel', difficulty: 2 }),
  lesson('ja-small-tsu', t('A quiet beat matters', '小促音，也占一拍'), ['っなし', 'っあり'],
    t('Small っ adds a consonant hold, not the spoken syllable tsu.', '小 っ 表示辅音停留，不要额外读成 tsu。'),
    [t('さか /saka/: continue from the vowel into k.', 'さか /saka/：元音后直接进入 k。'),
     t('さっか /sakka/: hold the k closure for an extra beat.', 'さっか /sakka/：k 的闭塞多留一拍。')],
    [p(w('坂', 'saka', 'slope', 'さか'), w('作家', 'sakka', 'writer', 'さっか')),
     p(w('来て', 'kite', 'come (request)', 'きて'), w('切手', 'kitte', 'postage stamp', 'きって')),
     p(w('かこ', 'kako', 'past (kana)', 'かこ'), w('かっこ', 'kakko', 'brackets', 'かっこ'))],
    { diagram: 'air', difficulty: 2 }),
  lesson('ja-small-y', t('Small kana share a beat', '小假名，合成一拍'), ['きや', 'きゃ'],
    t('Full-size や creates another beat; small ゃ combines with the previous kana.', '大 や 另占一拍；小 ゃ 和前面的假名合成一拍。'),
    [t('きや /ki-ya/: two beats.', 'きや /ki-ya/：两拍。'),
     t('きゃ /kya/: one combined beat.', 'きゃ /kya/：合成一拍。')],
    [p(w('きや', 'ki-ya', 'two morae'), w('きゃ', 'kya', 'one mora')),
     p(w('しゆ', 'shi-yu', 'two morae'), w('しゅ', 'shu', 'one mora')),
     p(w('ちよ', 'chi-yo', 'two morae'), w('ちょ', 'cho', 'one mora'))],
    { difficulty: 2, caution: t('These are sound-shape exercises, not all dictionary words.', '这些是音形练习，不全是词典中的单词。') }),
  lesson('ja-furigana', t('Read the word, not a guessed character', '按词读汉字，不猜单字读音'), ['日', '月'],
    t('Readings depend on the word. Furigana belongs to this example, not every use of the kanji.', '汉字读音取决于词语；这里的注音只适用于这个例词。'),
    [t('日 can be read differently in 日, 日本 and 今日.', '日 在 日、日本、今日 中读音不同。'),
     t('月 can be read differently in 月 and 月曜日.', '月 在 月 和 月曜日 中读音不同。')],
    [p(w('日', 'hi', 'day / sun', 'ひ'), w('月', 'tsuki', 'moon / month', 'つき')),
     p(w('日本', 'nihon', 'Japan (one accepted reading)', 'にほん'), w('日本語', 'nihongo', 'Japanese language', 'にほんご')),
     p(w('今日', 'kyou', 'today', 'きょう'), w('明日', 'ashita', 'tomorrow (one reading)', 'あした')),
     p(w('水', 'mizu', 'water', 'みず'), w('木', 'ki', 'tree / wood', 'き'))],
    { quizMode: 'visual', allowAudioQuiz: true, difficulty: 2,
      caution: t('Vocabulary and reading recall, not minimal pairs or a kanji-reading generator.', '这是词语和读音回忆，不是最小对立词，也不自动生成未知汉字的读音。') }),
];

export const kanaRows = [
  ['あいうえお', 'アイウエオ', ['a','i','u','e','o']],
  ['かきくけこ', 'カキクケコ', ['ka','ki','ku','ke','ko']],
  ['さしすせそ', 'サシスセソ', ['sa','shi','su','se','so']],
  ['たちつてと', 'タチツテト', ['ta','chi','tsu','te','to']],
  ['なにぬねの', 'ナニヌネノ', ['na','ni','nu','ne','no']],
  ['はひふへほ', 'ハヒフヘホ', ['ha','hi','fu','he','ho']],
  ['まみむめも', 'マミムメモ', ['ma','mi','mu','me','mo']],
  ['や ゆ よ', 'ヤ ユ ヨ', ['ya','','yu','','yo']],
  ['らりるれろ', 'ラリルレロ', ['ra','ri','ru','re','ro']],
  ['わ   を', 'ワ   ヲ', ['wa','','','','o']],
  ['ん    ', 'ン    ', ['n','','','','']],
] as const;
export const basicKana = kanaRows.flatMap(([hiragana, katakana, readings]) =>
  Array.from(hiragana).flatMap((h, index) => h === ' ' ? [] :
    [{ hiragana: h, katakana: Array.from(katakana)[index], reading: readings[index] }]));

/** Pair-specific memory/production cues: changing cards must change the guide.
 * These are modern visual aids, never historical etymology or speech grades. */
export function japanesePairGuidance(lesson: Lesson, pair: [Word, Word]): [Text, Text] {
  const shapes: Record<string, Text> = {
    'ぬ': t('ぬ · nu: follow the final loop.', 'ぬ · nu：沿着收尾的小圈看。'),
    'め': t('め · me: a crossing, without the final loop in ぬ.', 'め · me：有交叉，没有 ぬ 的收尾小圈。'),
    'ね': t('ね · ne: compare the loop on the right.', 'ね · ne：比较右侧的小圈。'),
    'れ': t('れ · re: the right side ends without that loop.', 'れ · re：右侧收尾没有那个小圈。'),
    'る': t('る · ru: notice the small loop at the bottom.', 'る · ru：留意底部的小圈。'),
    'ろ': t('ろ · ro: compare the open bottom, without that loop.', 'ろ · ro：比较底部，没有那个闭合小圈。'),
    'シ': t('シ · shi: stacked short marks; the long stroke sweeps upward.', 'シ · shi：短笔画上下排列，长笔画向上挑。'),
    'ツ': t('ツ · tsu: side-by-side short marks; the long stroke sweeps downward.', 'ツ · tsu：短笔画左右排列，长笔画向下写。'),
    'ン': t('ン · n: follow the upward sweep in the stroke replay.', 'ン · n：看笔顺动画中向上挑的长笔画。'),
    'ソ': t('ソ · so: compare the downward sweep.', 'ソ · so：比较向下写的长笔画。'),
    'ク': t('ク · ku: two strokes in this standard stroke guide.', 'ク · ku：标准笔顺中是两笔。'),
    'ケ': t('ケ · ke: three strokes; notice the extra horizontal stroke.', 'ケ · ke：是三笔，留意多出的横笔。'),
  };
  return pair.map(word => {
    if (['ja-hira-loops', 'ja-kata-direction'].includes(lesson.id)) return shapes[word.text];
    const reading = word.reading ?? word.spoken ?? word.text;
    if (lesson.id === 'ja-script-bridge') return t(
      `${word.text} · ${word.ipa}: the same sound as the other script; recall the shape.`,
      `${word.text} · ${word.ipa}：和另一套假名读音相同，专练字形回忆。`);
    if (lesson.id === 'ja-long-vowels' || lesson.id === 'ja-small-y') return t(
      `${word.text} · ${word.ipa}: ${morae(reading).length} mora beats. Compare the beat grouping above.`,
      `${word.text} · ${word.ipa}：${morae(reading).length} 拍，比较上面的拍子分组。`);
    if (lesson.id === 'ja-small-tsu') return t(
      `${word.text} · ${word.ipa}: ${morae(reading).length} mora beats.${reading.includes('っ') ? ' Hold the following consonant; do not say tsu.' : ' No added consonant hold.'}`,
      `${word.text} · ${word.ipa}：${morae(reading).length} 拍。${reading.includes('っ') ? '后面的辅音多留一拍，不要读成 tsu。' : '没有额外的辅音停留。'}`);
    if (lesson.id === 'ja-furigana') return t(
      `${word.text} → ${reading}: use this word's reading, not a fixed reading for every kanji.`,
      `${word.text} → ${reading}：按这个词的注音读，不把汉字读音固定成一种。`);
    if (lesson.id === 'ja-h-b-p') {
      if (reading === 'ふ') return t('ふ · fu: gentle friction between the lips, not English lip-to-teeth F.', 'ふ · fu：双唇间轻微摩擦，不是英语 f 的唇齿摩擦。');
      if (reading === 'は') return t('は · ha: airflow without a full lip closure.', 'は · ha：有气流，双唇不完全闭合。');
      return t(`${word.text} · ${word.ipa}: close and release both lips; compare b/p voicing in context.`, `${word.text} · ${word.ipa}：双唇闭合再放开，结合语境比较 b/p 的清浊。`);
    }
    return t(`${word.text} · ${word.ipa}: listen to the consonant, then compare the other card.`, `${word.text} · ${word.ipa}：听元音前的辅音，再比较另一张卡片。`);
  }) as [Text, Text];
}
