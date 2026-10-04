import type { Language, Lesson, Text, Word } from './types';
import { mapTraditionalNotes } from './ui-map-catalog';

const t = (en: string, zh: string): Text => ({ en, zh, hant:mapTraditionalNotes[en] });
export interface ToneAnchor {
  number: number;
  word: Word;
  contour: number[];
  guide: Text;
}
const word = (text: string, ipa: string, gloss: string, language: Language): Word => ({
  text, ipa, gloss,
  sentence: language === 'zh-HK' ? `呢個字係「${text}」。` : `这个字是${text}。`,
});

/** Course-authored examples. Contours are teaching sketches, not Hz targets or
 * measured reference recordings. Third tone may stay low in connected speech.
 * Sources and task boundaries: docs/SOUND-COVERAGE-RESEARCH.md. */
export const mandarinToneAnchors: ToneAnchor[] = [
  { number: 1, word: word('妈', 'mā', 'mother', 'zh-CN'), contour: [.85,.85,.85],
    guide: t('1: keep a high, steady pitch within your own comfortable range.', '一声：在自己舒适的音域内保持高平。') },
  { number: 2, word: word('麻', 'má', 'hemp', 'zh-CN'), contour: [.4,.6,.85],
    guide: t('2: rise from the middle toward the higher part of your range.', '二声：从中音向较高处上升。') },
  { number: 3, word: word('马', 'mǎ', 'horse', 'zh-CN'), contour: [.3,.1,.4],
    guide: t('3: reach the low part of your range. A full rise is not required in every context.', '三声：到达音域低处。并非所有语境都要完整回升。') },
  { number: 4, word: word('骂', 'mà', 'scold', 'zh-CN'), contour: [.9,.5,.15],
    guide: t('4: start higher and fall. Do not squeeze your throat.', '四声：从较高处下降，不要挤喉。') },
];
export const cantoneseToneAnchors: ToneAnchor[] = [
  { number: 1, word: word('詩', 'si1', 'poem', 'zh-HK'), contour: [.9,.9,.9],
    guide: t('1: a high register; this guide uses the level reference.', '一聲：高音區，本示意採用高平參考。') },
  { number: 2, word: word('史', 'si2', 'history', 'zh-HK'), contour: [.4,.65,.9],
    guide: t('2: rise toward the upper part of your comfortable range.', '二聲：升向舒適音域的較高處。') },
  { number: 3, word: word('試', 'si3', 'try', 'zh-HK'), contour: [.5,.5,.5],
    guide: t('3: keep a middle, relatively level pitch.', '三聲：保持中音，相對平穩。') },
  { number: 4, word: word('時', 'si4', 'time', 'zh-HK'), contour: [.3,.2,.1],
    guide: t('4: stay in the low range, typically with a low fall.', '四聲：保持低音區，通常低降。') },
  { number: 5, word: word('市', 'si5', 'market', 'zh-HK'), contour: [.15,.3,.5],
    guide: t('5: start low and rise less high than the tone-2 reference.', '五聲：低起上升，終點比二聲參考低。') },
  { number: 6, word: word('事', 'si6', 'matter', 'zh-HK'), contour: [.3,.3,.3],
    guide: t('6: a low, relatively level reference.', '六聲：較低、相對平穩的參考。') },
];

const existingMandarin = new Set(['1-4', '2-3']);
const existingCantonese = new Set(['1-3', '2-5', '4-6']);
// A second, same-syllable family lets learners change words without changing
// the contrast. These are lexical tones, not consecutive-tone sandhi examples.
const otherToneWords = {
  'zh-CN': [word('八','bā','eight','zh-CN'),word('拔','bá','pull out','zh-CN'),
    word('把','bǎ','hold','zh-CN'),word('坝','bà','dam','zh-CN')],
  'zh-HK': [word('夫','fu1','husband','zh-HK'),word('虎','fu2','tiger','zh-HK'),
    word('富','fu3','wealthy','zh-HK'),word('扶','fu4','support','zh-HK'),
    word('婦','fu5','woman','zh-HK'),word('父','fu6','father','zh-HK')],
};
function completePairs(anchors: ToneAnchor[], language: 'zh-CN'|'zh-HK', existing: Set<string>): Lesson[] {
  return anchors.flatMap((a, index) => anchors.slice(index + 1).flatMap(b => {
    const key = `${a.number}-${b.number}`;
    if (existing.has(key)) return [];
    const cantonese = language === 'zh-HK';
    return [{
      id: `${cantonese ? 'yue-tone' : 'tone'}-${key}`, language,
      group: cantonese ? 'Cantonese' : 'Tones',
      title: {...t(`Tone ${a.number} or ${b.number}?`, `分清第 ${a.number} 和第 ${b.number} 声`), hant:`分清第 ${a.number} 和第 ${b.number} 聲`},
      sounds: [String(a.number), String(b.number)] as [string,string],
      cue: t('Keep the syllable the same; compare the pitch movement and register.', '保持音节相同，比较音高走向和音区。'),
      sides: [a.guide, b.guide] as [Text,Text],
      tip: t('Use your own pitch range. Try a carrier sentence when level tones are hard to compare.', '使用自己的音域。平调不易比较时，可试短句模式。'),
      pairs: [[a.word, b.word], [otherToneWords[language][a.number-1], otherToneWords[language][b.number-1]]] as [Word,Word][],
      diagram: 'tone' as const, tones: [a.contour, b.contour] as [number[],number[]],
      difficulty: 2 as const,
      caution: cantonese
        ? t('Some speakers merge tone contrasts. These are reference patterns, not an accent diagnosis. A word match alone cannot measure tone.', '部分说话者会合并声调。这些是参考模式，不是口音诊断；识别词语本身不能测量声调。')
        : t('Third tone changes in connected speech. These single-syllable sketches are not fixed pitch requirements for every sentence. Word recognition cannot measure tone.', '三声会随连续语流变化。单音节示意不是每个句子的固定音高要求；识别词语不能测量声调。'),
    }];
  }));
}
export const extraMandarinToneLessons = completePairs(mandarinToneAnchors, 'zh-CN', existingMandarin);
export const extraCantoneseToneLessons = completePairs(cantoneseToneAnchors, 'zh-HK', existingCantonese);

/** All ordered sequences, including repeats. Play separate anchors with a pause:
 * these are perception drills, NOT natural-word sandhi references or grades. */
export function toneSequences(language: Language): [ToneAnchor,ToneAnchor][] {
  const anchors = language === 'zh-CN' ? mandarinToneAnchors : language === 'zh-HK' ? cantoneseToneAnchors : [];
  return anchors.flatMap(a => anchors.map(b => [a,b] as [ToneAnchor,ToneAnchor]));
}
