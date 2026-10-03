import { describe,expect,it } from 'vitest';
import {render,screen} from '@testing-library/react';
import {basicKana,japaneseLessons,japanesePairGuidance} from './japanese-curriculum';
import {morae} from './japanese-mora';
import {WordText} from './WordText';
import {assessmentPlan} from './scoring-profiles';
import strokes from '../assets/japanese/kanjivg.json';
describe('Japanese confusion-first course',()=>{
 it('keeps teaching cues tied to every actual pair, never the first pair only',()=>{
  for(const lesson of japaneseLessons)for(const pair of lesson.pairs){
   const cues=japanesePairGuidance(lesson,pair);
   for(let side=0;side<2;side++){
    expect(cues[side].en).toContain(pair[side].text);
    expect(cues[side].zh).toContain(pair[side].text);
   }
  }
  const loops=japaneseLessons[0];
  expect(japanesePairGuidance(loops,loops.pairs[1])[0].en).toContain('ね');
  expect(japanesePairGuidance(loops,loops.pairs[1])[0].en).not.toContain('ぬ');
  const hb=japaneseLessons.find(l=>l.id==='ja-h-b-p')!;
  expect(japanesePairGuidance(hb,hb.pairs[2])[0].en).toContain('not English');
 });
 it('covers 46 basic kana in both scripts, without obsolete or guessed entries',()=>{
  expect(basicKana).toHaveLength(46);
  for(const script of ['hiragana','katakana'] as const){
   expect(new Set(basicKana.map(k=>k[script])).size).toBe(46);
   for(const k of basicKana)expect(strokes.characters).toHaveProperty(k[script]);
  }
  expect(basicKana.find(k=>k.hiragana==='を')?.reading).toBe('o');
 });
 it('provides contextual readings for every course word containing kanji',()=>{
  for(const l of japaneseLessons)for(const pair of l.pairs)for(const w of pair){
   if(/\p{Script=Han}/u.test(w.text))expect(w.reading,w.text).toBeTruthy();
   expect(()=>morae(w.reading??w.spoken??w.text)).not.toThrow();
    expect(w.sentenceReading).not.toMatch(/\p{Script=Han}|[a-z]/u);
    expect(w.sentenceReading).toMatch(/^もういちど、/u);
    expect(w.sentence).toMatch(/^もう一度、/u);
  }
 });
 it('does not turn same-sound scripts into a listening or pronunciation test',()=>{
  const l=japaneseLessons.find(l=>l.id==='ja-script-bridge')!;
  expect(l.quizMode).toBe('visual');expect(l.allowAudioQuiz).not.toBe(true);
  for(const pair of l.pairs)expect(pair[0].spoken).toBe(pair[1].spoken);
  expect(assessmentPlan('japanese',l.id,0,0)).toEqual({mode:'explore',reason:'same-sound-scripts'});
 });
 it('preserves the meaning-changing mora counts rather than absolute durations',()=>{
  expect(morae('おばさん')).toHaveLength(4);expect(morae('おばあさん')).toHaveLength(5);
  expect(morae('さか')).toHaveLength(2);expect(morae('さっか')).toHaveLength(3);
  expect(morae('きや')).toEqual(['き','や']);expect(morae('きゃ')).toEqual(['きゃ']);
  expect(morae('ビール')).toHaveLength(3);expect(morae('ビル')).toHaveLength(2);
  expect(morae('きょう')).toEqual(['きょ','う']);
  expect(()=>morae('今日')).toThrow();expect(()=>morae('ゃ')).toThrow();
 });
 it('renders furigana as semantic ruby without altering the displayed kanji',()=>{
  const {container}=render(<WordText value="今日" reading="きょう"/>);
  expect(container.querySelector('ruby')).not.toBeNull();
  expect(screen.getByText('きょう',{selector:'rt'})).toBeDefined();
  expect(container.querySelector('ruby')?.firstChild?.textContent).toBe('今日');
 });
 it('pins stroke paths and keeps their data license independent of code',()=>{
  expect(strokes.revision).toMatch(/^[a-f0-9]{40}$/);expect(strokes.license).toBe('CC-BY-SA-3.0');
  for(const row of Object.values(strokes.characters)){
   expect(row.sha256).toMatch(/^[a-f0-9]{64}$/);expect(row.sourceUrl).toContain(strokes.revision);
   expect(row.paths.length).toBeGreaterThan(0);
  }
 });
});
