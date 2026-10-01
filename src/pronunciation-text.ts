import type { Language, Word } from './types';

/** Keep display text/romanization separate from the authored speech reading.
 * A single kana in the map is a sound label, not a grammatical particle.
 * Never rewrite は/へ inside words or sentences, where context determines them.
 */
export function pronunciationText(word: Word, language: Language, sentence = false): string {
  if (sentence) return word.sentenceReading ?? word.sentence;
  const reading = word.spoken ?? (language === 'ja-JP' ? word.reading : undefined) ?? word.text;
  if (language !== 'ja-JP') return reading;
  const isolated: Record<string, string> = { 'は': 'ハ', 'へ': 'ヘ', 'を': 'オ', 'ヲ': 'オ' };
  return isolated[reading] ?? reading;
}
