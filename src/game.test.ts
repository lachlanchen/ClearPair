import { beforeEach, describe, expect, it, vi } from 'vitest';
import { completeGame, createChallenge, emptyGame, readGame, saveGame, starsFor } from './game';
import { isCantoneseVoice, selectVoice } from './voices';
import { cantoneseLessons } from './cantonese-curriculum';
import { assessmentPlan } from './scoring-profiles';

describe('five-question, pressure-free challenges', () => {
  beforeEach(() => localStorage.clear());
  it('uses every available pair before recycling, with no immediate repeats', () => {
    for (const count of [2,3,5,12]) {
      const deck = createChallenge(count, () => .3);
      expect(deck).toHaveLength(5);
      expect(new Set(deck.slice(0, Math.min(5,count)).map((q) => q.pair)).size).toBe(Math.min(5,count));
      deck.forEach((q, i) => { expect(q.pair).toBeLessThan(count); if (i) expect(q.pair).not.toBe(deck[i-1].pair); });
    }
  });
  it('rewards completion without pretending that stars grade speech', () => {
    expect(starsFor(0)).toBe(1); expect(starsFor(3)).toBe(2); expect(starsFor(5)).toBe(3);
    expect(completeGame(emptyGame(), [true,false,true,false,true])).toEqual({rounds:1, stars:2, best:3});
    expect(() => completeGame(emptyGame(), [true])).toThrow();
    expect(() => createChallenge(1)).toThrow();
  });
  it('persists stars separately for each app and tolerates storage errors', () => {
    saveGame('a', {rounds:1,stars:3,best:5});
    expect(readGame('a').stars).toBe(3); expect(readGame('b')).toEqual(emptyGame());
    for (const value of ['bad', 'null', '{"rounds":1,"stars":999,"best":7}']) {
      localStorage.setItem('a',value); expect(readGame('a')).toEqual(emptyGame());
    }
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    expect(saveGame('a',emptyGame())).toBe(false); spy.mockRestore();
  });
});
describe('Cantonese stays Cantonese', () => {
  it.each(['zh-HK','zh_HK','zh-Hant-HK','yue','yue-HK','yue-Hant-HK'])('accepts explicit Cantonese tag %s', (lang) => expect(isCantoneseVoice(lang)).toBe(true));
  it('never substitutes a Mandarin voice', () => {
    expect(selectVoice([{lang:'zh-CN'},{lang:'zh-TW'},{lang:'zh'}], 'zh-HK')).toBeUndefined();
    expect(selectVoice([{lang:'zh-CN'},{lang:'yue-HK'}], 'zh-HK')?.lang).toBe('yue-HK');
    expect(selectVoice([{lang:'en-GB'}], 'en-US')?.lang).toBe('en-GB');
  });
  it('uses Jyutping, six tone alternatives, and does not grade n/l variation', () => {
    expect(cantoneseLessons).toHaveLength(8);
    for (const lesson of cantoneseLessons) {
      expect(lesson.language).toBe('zh-HK');
      for (const word of lesson.pairs.flat()) expect(word.ipa).toMatch(/^[a-z]+[1-6]$/);
    }
    expect(assessmentPlan('cantonese','yue-n-l',0,0).mode).toBe('explore');
    const plan=assessmentPlan('cantonese','yue-tone-2-5',0,0);
    if(plan.mode!=='contrast') throw new Error('Missing tone plan');
    expect(plan.profile.alternatives).toContain('tone-6');
    expect(plan.requiresHumanValidatedCalibration).toBe(true);
  });
});
