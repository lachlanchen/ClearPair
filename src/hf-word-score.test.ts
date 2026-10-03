import {describe,it,expect} from 'vitest';
import {assessmentPlan} from './scoring-profiles';
import {hfWordDecision,hfHybridScore,type HfWordEvidence} from './hf-word-score';
import type {ScoreResult} from './scoring';
import type {Analysis} from './types';
function plan(lesson='hf-en',side:0|1=0,sentence=false){const p=assessmentPlan('handf',lesson,0,side,sentence);if(p.mode!=='contrast')throw Error('fixture');return p;}
function evidence(text:string,conf=.95):HfWordEvidence{return {engine:'test-only',text,words:text.split(' ').filter(Boolean).map((word,i)=>({word,conf,start:i*.2,end:i*.2+.15}))};}
const quality:Analysis={seconds:1,rms:.06,peak:.2,clipped:0,voicedSeconds:.3,waveform:[],pitch:[],status:'clear'};
const acoustic:ScoreResult={status:'matched',score:95,contrast:plan().calibrationKey,model:'local-reference-dtw:v1',unit:'phone',targetDistance:0,competitorDistance:.3,referenceVoice:'fixture',scope:'word',closestWord:'hat',
 hf:{version:'hf-segment-fft:v1',target:'h',heard:'h',position:'initial',sound:95,word:90,timing:90,segmentMs:80,targetDistance:0,competitorDistance:.3,margin:1,cue:'good'}};
describe('H & F word/content and sound evidence stay separate',()=>{
 it('does not discard a final bundled-native word on a high acoustic result',()=>{
  const e={...evidence('hat',.9),engine:'hf-vosk-native:v1/en-US',final:true};
  const r=hfHybridScore(plan(),e,acoustic,quality);
  expect(r).toMatchObject({status:'matched',closestWord:'hat',recognition:{decision:'target',engine:e.engine}});
 });
 it('lets a confident native word resolve ambiguous sound evidence without inventing sound measurements',()=>{
  const e={...evidence('hat',.9),engine:'hf-vosk-native:v1/en-US',final:true};
  const unclear={...acoustic,score:72,hf:{...acoustic.hf!,heard:'uncertain' as const,sound:52,cue:'uncertain' as const}};
  const r=hfHybridScore(plan(),e,unclear,quality);
  expect(r).toMatchObject({status:'matched',score:85,closestWord:'hat',recognition:{decision:'target'},evidence:'word'});
  if(r.status==='matched'){expect(r.hf).toBeUndefined();expect(r.breakdown?.pairDistinction).toBe(0);}
 });
 it('keeps low-confidence bundled-native words conservative',()=>{
  const e={...evidence('hat',.2),engine:'hf-vosk-native:v1/en-US',final:true};
  expect(hfWordDecision(plan(),e).decision).toBe('unknown');
 });
 it('uses native FINAL word identity without inventing confidence or requiring a synthetic consonant match',()=>{
  const e={...evidence('hat',0),engine:'apple-on-device-words:v1/en-US',final:true};
  expect(hfWordDecision(plan(),e)).toMatchObject({decision:'target',confidence:0});
  const r=hfHybridScore(plan(),e,{status:'unscored',reason:'sound-unresolved'},quality);
  expect(r).toMatchObject({status:'matched',score:85,closestWord:'hat',recognition:{confidence:0,decision:'target'},evidence:'word'});
  expect(hfWordDecision(plan(),{...e,final:false}).decision).toBe('unknown');
 });
 it('uses native final opposite-word identity even when a synthetic reference incorrectly looks favourable',()=>{
  const e={...evidence('fat',.9),engine:'apple-on-device-words:v1/en-US',final:true};
  const r=hfHybridScore(plan(),e,acoustic,quality);
  if(r.status!=='matched')throw Error('fixture');expect(r.closestWord).toBe('fat');expect(r.score).toBeLessThanOrEqual(45);
 });
 it.each([['hat','target'],['fat','opposite'],['at','omitted'],['cat','other'],['hat fat','both'],['','unknown']] as const)('classifies %s without prompting the recognizer', (text,decision)=>{
  expect(hfWordDecision(plan(),evidence(text)).decision).toBe(decision);
 });
 it('matches tokens, not substrings or a word hidden in an isolated-word response',()=>{
  for(const text of ['hats','fatten','that','the hat','hat hat'])expect(hfWordDecision(plan(),evidence(text)).decision).toBe('other');
 });
 it('does not let an expected reference match rescue a confidently opposite word',()=>{
  const r=hfHybridScore(plan(),evidence('fat'),{...acoustic,score:26,hf:{...acoustic.hf!,heard:'f',sound:10,word:90,margin:-1,cue:'gentle-breath'}},quality);expect(r.status).toBe('matched');
  if(r.status==='matched'){expect(r.score).toBeLessThanOrEqual(45);expect(r.closestWord).toBe('fat');expect(r.hf?.heard).toBe('f');expect(r.recognition?.decision).toBe('opposite');}
 });
 it('does not let an unqualified lexical model overrule a strong isolated sound match',()=>{
  expect(hfHybridScore(plan(),evidence('fat'),acoustic,quality)).toBe(acoustic);
 });
 it('accepts exact homophones but a changed coda earns only partial word evidence',()=>{
  const p=assessmentPlan('handf','hf-en',2,0);if(p.mode!=='contrast')throw Error('fixture');
  expect(hfWordDecision(p,evidence("he'd"))).toMatchObject({decision:'target',wordMatch:75});
  const fill=assessmentPlan('handf','hf-en',1,1);if(fill.mode!=='contrast')throw Error('fixture');
  expect(hfWordDecision(fill,evidence('phil'))).toMatchObject({decision:'target',wordMatch:100});
 });
 it('does not infer a final F/V grade from recognition spelling',()=>{
  expect(hfHybridScore(plan('hf-final'),evidence('leave'),acoustic,quality)).toBe(acoustic);
 });
 it.each([['at',30,'missing']] as const)('keeps %s as useful low-score feedback, not an empty recording',(text,cap,cue)=>{
  const r=hfHybridScore(plan(),evidence(text),{status:'unscored',reason:'unaligned'},quality);expect(r.status).toBe('matched');
  if(r.status==='matched'){expect(r.score).toBeLessThanOrEqual(cap);expect(r.closestWord).toBeUndefined();expect(r.recognition?.decision).toBe(text==='at'?'omitted':'other');}
 });
 it('does not penalize an unrelated ASR substitution without independent acoustic rejection',()=>{
  expect(hfHybridScore(plan(),evidence('please'),{status:'unscored',reason:'uncertain'},quality)).toEqual({status:'unscored',reason:'uncertain'});
  const rejected={...acoustic,score:25,targetDistance:1.8,competitorDistance:1.9,hf:{...acoustic.hf!,word:20,sound:15}};
  const r=hfHybridScore(plan(),evidence('cat'),rejected,quality);
  if(r.status!=='matched')throw Error('fixture');expect(r.score).toBeLessThanOrEqual(25);expect(r.recognition?.decision).toBe('other');
 });
 it('resolves recognized words even when reference alignment cannot find a boundary',()=>{
  const r=hfHybridScore(plan(),evidence('hat'),{status:'unscored',reason:'unaligned'},quality);
  expect(r.status).toBe('matched');if(r.status==='matched'){expect(r.closestWord).toBe('hat');expect(r.score).toBe(85);expect(r.hf).toBeUndefined();expect(r.evidence).toBe('word');expect(r.breakdown?.pairDistinction).toBe(0);}
 });
 it('does not reward lexical recognition as a perfect difficult-sound grade',()=>{
  const weak={...acoustic,score:30,hf:{...acoustic.hf!,sound:15,heard:'f' as const,cue:'gentle-breath' as const}};
  const r=hfHybridScore(plan(),evidence('hat'),weak,quality);
  if(r.status!=='matched')throw Error('fixture');expect(r.score).toBeLessThan(75);expect(r.closestWord).toBe('hat');expect(r.hf?.sound).toBe(15);
 });
 it('unavailable lexical evidence cannot silently degrade a usable acoustic result',()=>{
  for(const e of [evidence(''),evidence('hat',.2)]){
   const r=hfHybridScore(plan(),e,acoustic,quality);expect(r).toBe(acoustic);
  }
 });
 it('both words in one take do not become a target success',()=>{
  const r=hfHybridScore(plan('hf-en',0,true),evidence('hat fat'),acoustic,quality);if(r.status!=='matched')throw Error('fixture');expect(r.score).toBeLessThanOrEqual(40);
 });
 it('accepts the authored sentence but not both sides in the same sentence',()=>{
  expect(hfWordDecision(plan('hf-en',0,true),evidence('i said hat again')).decision).toBe('target');
  expect(hfWordDecision(plan('hf-en',0,true),evidence('i said fat again')).decision).toBe('opposite');
  expect(hfWordDecision(plan('hf-en',0,true),evidence('i said hat and fat again')).decision).toBe('both');
 });
 it('keeps Mandarin /x/ and English /h/ separate and permits explicit homophones only',()=>{
  expect(hfWordDecision(plan('hf-zh'),evidence('哈')).decision).toBe('target');
  expect(hfWordDecision(plan('hf-zh'),evidence('发')).decision).toBe('opposite');
  expect(hfWordDecision(plan('hf-zh'),evidence('他')).decision).toBe('other');
  expect(hfWordDecision(plan('hf-zh',0,true),evidence('这个字是哈')).decision).toBe('target');
 });
 it('reverses word identity with the selected side, not the decoded audio',()=>{
  expect(hfWordDecision(plan('hf-en',1),evidence('fat')).decision).toBe('target');
  expect(hfWordDecision(plan('hf-en',1),evidence('hat')).decision).toBe('opposite');
 });
 it('does not mask a cancelled, silent, or corrupt take',()=>{
  for(const reason of ['cancelled','poor-signal','invalid-evidence'] as const){const r={status:'unscored' as const,reason};expect(hfHybridScore(plan(),evidence('hat'),r,{...quality,status:'silent'})).toEqual(r);}
 });
 it('a pitch-estimator failure is not an empty take when speech and a word were captured',()=>{
  const r=hfHybridScore(plan(),evidence('hat'),{status:'unscored',reason:'poor-signal'},quality);expect(r.status).toBe('matched');
 });
 it('rejects contradictory, nonfinite and stale transcript metadata',()=>{
  for(const e of [{...evidence('hat'),text:'fat'},evidence('hat',NaN),{...evidence('hat'),words:[{word:'hat',conf:.9,start:1,end:.1}]}])expect(hfWordDecision(plan(),e).decision).toBe('unknown');
 });
 it('leaves every other app and model-unavailable fallback unchanged',()=>{
  const other={...plan(),calibrationKey:'landr/fixture/0/0/word/en-l-r:v1'};expect(hfHybridScore(other,evidence('hat'),acoustic,quality)).toBe(acoustic);
  expect(hfHybridScore(plan(),undefined,acoustic,quality)).toBe(acoustic);
 });
});
