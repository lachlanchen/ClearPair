import {describe,expect,it} from 'vitest';
import {matchesPracticeVoice,selectVoice} from './voices';
describe('practice-language voice identity',()=>{
 it('never substitutes Cantonese for Mandarin when the exact voice is missing',()=>{
  const cantonese={lang:'zh-HK'},mandarin={lang:'zh-TW'};
  expect(selectVoice([cantonese],'zh-CN')).toBeUndefined();
  expect(selectVoice([cantonese,mandarin],'zh-CN')).toBe(mandarin);
  expect(selectVoice([{lang:'zh'}],'zh-CN')).toBeUndefined();
 });
 it('never substitutes Mandarin for Cantonese',()=>{
  expect(selectVoice([{lang:'zh-CN'},{lang:'zh-TW'}],'zh-HK')).toBeUndefined();
  expect(selectVoice([{lang:'yue_HK'}],'zh-HK')?.lang).toBe('yue_HK');
 });
 it('requires the practice language rather than the interface language',()=>{
  expect(selectVoice([{lang:'en-US'},{lang:'zh-CN'}],'ja-JP')).toBeUndefined();
  expect(selectVoice([{lang:'ja_JP'},{lang:'en-US'}],'ja-JP')?.lang).toBe('ja_JP');
  expect(matchesPracticeVoice('ko-KR','ja-JP')).toBe(false);
 });
 it('preserves ordinary regional fallback within the same language',()=>{
  expect(selectVoice([{lang:'en-GB'}],'en-US')?.lang).toBe('en-GB');
  expect(selectVoice([{lang:'ar-EG'}],'ar-SA')?.lang).toBe('ar-EG');
 });
});
