import { describe, expect, it } from 'vitest';
import { audioKey, lessons } from './curriculum';
import { basicKana, japaneseLessons } from './japanese-curriculum';
import { pronunciationText } from './pronunciation-text';
import type { Word } from './types';

const word = (text: string, extra: Partial<Word> = {}): Word => ({ text, ipa: 'display only', sentence: text, ...extra });
describe('authored reference speech', () => {
  it('invalidates stale reference audio when the authored reading or sentence changes', () => {
    const kanji = word('日', { spoken: 'ひ', sentence: 'ひ' });
    expect(audioKey(kanji, 'ja-JP')).not.toBe(audioKey({ ...kanji, spoken: 'にち' }, 'ja-JP'));
    expect(audioKey(kanji, 'ja-JP', true)).not.toBe(audioKey({ ...kanji, sentence: 'ひが でる' }, 'ja-JP', true));
    expect(audioKey(word('light'), 'en-US')).toBe('en-US-6c-69-67-68-74');
  });
  it.each([['は', 'ハ'], ['へ', 'ヘ'], ['を', 'オ'], ['ヲ', 'オ']])(
    'speaks isolated %s as %s without changing the displayed character', (display, spoken) => {
      const value = word(display);
      expect(pronunciationText(value, 'ja-JP')).toBe(spoken);
      expect(value.text).toBe(display);
    },
  );
  it('does not rewrite particles or h-series inside words and sentences', () => {
    expect(pronunciationText(word('はな'), 'ja-JP')).toBe('はな');
    expect(pronunciationText(word('へや'), 'ja-JP')).toBe('へや');
    expect(pronunciationText(word('は', { sentence: 'わたしは がっこうへ いきます。' }), 'ja-JP', true)).toBe('わたしは がっこうへ いきます。');
  });
  it('uses contextual kanji readings, never romanization or a glyph guess', () => {
    const today = japaneseLessons.find(l => l.id === 'ja-furigana')!.pairs[2][0];
    expect(today.text).toBe('今日');
    expect(pronunciationText(today, 'ja-JP')).toBe('きょう');
    expect(pronunciationText(word('今日', { reading: 'きょう' }), 'ja-JP')).toBe('きょう');
    expect(pronunciationText(word('今日', { sentence: '今日は晴れ。', sentenceReading: 'きょうは はれ。' }), 'ja-JP', true)).toBe('きょうは はれ。');
  });
  it('keeps other scripts and authored letter names unchanged', () => {
    expect(pronunciationText(word('ㄱ', { spoken: '기역' }), 'ko-KR')).toBe('기역');
    expect(pronunciationText(word('ـبـ', { spoken: 'باء' }), 'ar-SA')).toBe('باء');
    expect(pronunciationText(word('发', { ipa: 'fā' }), 'zh-CN')).toBe('发');
  });
  it('supplies real short carriers for Korean, Arabic and Japanese without changing word readings', () => {
    for (const language of ['ko-KR','ar-SA','ja-JP'] as const) {
      for (const lesson of lessons.filter(l=>l.language===language)) for (const pair of lesson.pairs) for (const value of pair) {
        const single=pronunciationText(value,language),sentence=pronunciationText(value,language,true);
        expect(sentence).not.toBe(single);
        expect(sentence).toContain(single);
      }
    }
    const ha=japaneseLessons.find(l=>l.id==='ja-h-b-p')!.pairs[0][0];
    expect(pronunciationText(ha,'ja-JP',true)).toBe('もういちど、ハ。');
  });
  it('never sends display-only IPA/romanization/connected forms from the curricula', () => {
    for (const lesson of lessons) for (const pair of lesson.pairs) for (const value of pair) {
      const spoken = pronunciationText(value, lesson.language);
      expect(spoken, `${lesson.id}/${value.text}`).not.toMatch(/[ˈˌːɪɛæʌɑɔʊɹθðʃʒŋ]|·/u);
      if (lesson.language === 'ar-SA') expect(spoken).not.toContain('ـ');
      if (lesson.language === 'ja-JP') expect(spoken).not.toMatch(/[a-z\p{Script=Han}]/u);
    }
    for (const kana of basicKana) for (const script of ['hiragana', 'katakana'] as const) {
      expect(pronunciationText(word(kana[script]), 'ja-JP')).not.toMatch(/[a-z\p{Script=Han}]/u);
    }
  });
});
