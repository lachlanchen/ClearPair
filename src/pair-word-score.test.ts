import {describe,it,expect} from 'vitest';
import {products,lessonById} from './curriculum';
import {assessmentPlan} from './scoring-profiles';
import {pronunciationText} from './pronunciation-text';
import {pairWordDecision,pairHybridScore,feedbackFor,normalizeWords} from './pair-word-score';
import type {HfWordEvidence} from './hf-word-score';
import type {Analysis} from './types';
import type {ScoreResult} from './scoring';
const quality:Analysis={seconds:.5,rms:.08,peak:.2,clipped:0,voicedSeconds:.4,waveform:[],pitch:[],status:'clear'};
const unresolved:ScoreResult={status:'unscored',reason:'sound-unresolved'};
const evidence=(text:string,language:string,conf=.9):HfWordEvidence=>({engine:`apple-on-device-words:v1/${language}`,text,
 words:[{word:text,conf,start:0,end:.4}],final:true});
describe('every authored pair: offline content feedback, separate sound provenance',()=>{
 for(const product of products.filter(p=>p.id!=='handf'))for(const id of product.lessons)for(const [pair,words] of lessonById(id).pairs.entries())for(const side of [0,1] as const){
  const plan=assessmentPlan(product.id,id,pair,side,false);if(plan.mode!=='contrast')continue;
  it(`${product.id}/${id}/${pair}/${side}: exact, opposite, poor signal, language isolation`,()=>{
   const target=pronunciationText(words[side],plan.profile.language),other=pronunciationText(words[1-side],plan.profile.language);
   const correct=pairHybridScore(plan,evidence(target,plan.profile.language,0),unresolved,quality);
   expect(correct).toMatchObject({status:'matched',recognition:{text:target,decision:'target',confidence:0},pairFeedback:{soundMeasured:false,targetSound:words[side].ipa}});
   const wrong=pairHybridScore(plan,evidence(other,plan.profile.language,0),unresolved,quality);
   expect(wrong).toMatchObject({status:'matched',recognition:{text:other,decision:'opposite'},pairFeedback:{kind:'opposite',heardSound:words[1-side].ipa}});
   if(correct.status==='matched'&&wrong.status==='matched'){expect(correct.score).toBeGreaterThan(wrong.score+20);expect(correct.score).toBeLessThanOrEqual(plan.profile.unit==='tone'||plan.profile.id.startsWith('ja-mora')||plan.profile.id==='yue-vowels:v1'?60:85);}
   expect(pairHybridScore(plan,evidence(target,'xx'),unresolved,quality)).toBe(unresolved);
   expect(pairHybridScore(plan,evidence(target,plan.profile.language),unresolved,{...quality,status:'silent'})).toBe(unresolved);
  });
 }
 const plan=assessmentPlan('landr','lr-start',0,0,false);if(plan.mode!=='contrast')throw Error('fixture');
 it('retains actual different words without guessing which phoneme was wrong',()=>{
  const r=pairHybridScore(plan,evidence('banana','en-US'),unresolved,quality);
  expect(r).toMatchObject({status:'matched',recognition:{text:'banana',decision:'other'},pairFeedback:{kind:'different',targetSound:'laɪt',soundMeasured:false}});
  if(r.status==='matched'){expect(r.score).toBeLessThanOrEqual(25);expect(r.pairFeedback?.heardSound).toBeUndefined();}
 });
 it('accepts only explicitly authored English homophones and retains the spelling',()=>{
  const right=assessmentPlan('landr','lr-start',0,1,false);if(right.mode!=='contrast')throw Error('fixture');
  expect(pairWordDecision(right,evidence('write','en-US'))).toMatchObject({decision:'target'});
  expect(pairWordDecision(right,evidence('white','en-US'))).toMatchObject({decision:'other'});
  expect(pairWordDecision(plan,evidence('write','en-US'))).toMatchObject({decision:'opposite'});
 });
 it('retains conflicting acoustic and lexical observations, capped and explicitly uncertain',()=>{
  const acoustic:ScoreResult={status:'matched',score:95,contrast:plan.calibrationKey,model:'local-reference-dtw:v2',unit:'phone',targetDistance:.1,competitorDistance:.8,referenceVoice:'fixture',scope:'word',closestWord:'light',
   focus:{version:'pair-focus-dtw:v1',region:'initial',targetDistance:.1,competitorDistance:.8,separation:.7,frames:9},breakdown:{wordMatch:90,pairDistinction:95,speechMs:400,referenceMs:500}};
  const r=pairHybridScore(plan,evidence('height','en-US'),acoustic,quality);
  expect(r).toMatchObject({status:'matched',score:57,recognition:{text:'height',decision:'unknown'},pairFeedback:{conflict:true}});
 });
 it('does not invent a target-sound score from word identity, or turn partial Apple results into final',()=>{
  const r=pairHybridScore(plan,{...evidence('light','en-US'),final:false,completed:true},unresolved,quality);
  expect(r).toMatchObject({status:'matched',score:79,evidence:'word',recognition:{provisional:true},pairFeedback:{soundMeasured:false}});
 });
 it('retains measured sound details when a standalone kana has no recognized word',()=>{
  const p=assessmentPlan('japanese','ja-dakuten',0,0);if(p.mode!=='contrast')throw Error('fixture');
  const acoustic:ScoreResult={status:'matched',score:97,contrast:p.calibrationKey,model:'local-reference-dtw:v2',unit:'phone',targetDistance:.1,competitorDistance:.6,referenceVoice:'fixture',scope:'word',
   focus:{version:'pair-focus-dtw:v1',region:'initial',targetDistance:.1,competitorDistance:.6,separation:.5,frames:9},breakdown:{wordMatch:90,pairDistinction:95,speechMs:400,referenceMs:500}};
  const r=pairHybridScore(p,undefined,acoustic,quality);
  expect(r).toMatchObject({status:'matched',score:79,evidence:'sound',pairFeedback:{kind:'unconfirmed',heard:'',soundMeasured:true}});
  expect(r).not.toHaveProperty('recognition');
 });
 it('does not let collapsed ASR spelling hide a strongly measured opposite vowel or ending',()=>{
  const acoustic:ScoreResult={status:'matched',score:20,contrast:plan.calibrationKey,model:'local-reference-dtw:v2',unit:'phone',targetDistance:.1,competitorDistance:0,referenceVoice:'fixture',scope:'word',closestWord:'right',
   focus:{version:'pair-focus-dtw:v1',region:'initial',targetDistance:.3,competitorDistance:0,separation:.3,frames:9},breakdown:{wordMatch:94,pairDistinction:2,speechMs:400,referenceMs:500}};
  const r=pairHybridScore(plan,evidence('light','en-US'),acoustic,quality);
  expect(r).toMatchObject({status:'matched',score:22,recognition:{text:'light',decision:'target'},pairFeedback:{conflict:true,soundMeasured:true},breakdown:{wordMatch:100,pairDistinction:2}});
  const rescue=pairHybridScore(plan,evidence('right','en-US'),{...acoustic,score:99,closestWord:'light',targetDistance:0,competitorDistance:.1,
   focus:{...acoustic.focus!,targetDistance:0,competitorDistance:.3},breakdown:{...acoustic.breakdown!,pairDistinction:98}},quality);
  expect(rescue).toMatchObject({status:'matched',score:78,recognition:{text:'right',decision:'opposite'},pairFeedback:{conflict:true,soundMeasured:true}});
 });
 it('rejects stale tokens, malformed numbers, unrelated engines and low-confidence bundled words',()=>{
  for(const e of [{...evidence('light','en-US'),text:'right'}, {...evidence('light','en-US'),engine:'cloud/en-US'},
   {...evidence('light','en-US'),words:[{word:'light',conf:NaN,start:0,end:.4}]},
   {...evidence('light','en-US',.2),engine:'pair-offline-words:v1/en-US'}])expect(pairWordDecision(plan,e).decision).toBe('unknown');
 });
 it('keeps same-sound script drills ungraded and uses pair-specific Japanese cues',()=>{
  expect(assessmentPlan('japanese','ja-script-bridge',0,0).mode).toBe('explore');
  const p=assessmentPlan('japanese','ja-h-b-p',1,0);if(p.mode!=='contrast')throw Error('fixture');
  expect(feedbackFor(p,'ぱ','opposite',false).targetSound).toBe('ba');
  expect(feedbackFor(p,'ぱ','opposite',false).cue.en).toContain('ば');
 });
 it('normalizes scripts/marks for content only, never as measured tones or vowel length',()=>{
  expect(normalizeWords('ビール','ja-JP')).toBe(normalizeWords('びーる','ja-JP'));
  expect(normalizeWords('بَ','ar-SA')).toBe('ب');
  expect(normalizeWords('呢個字係「標」。','zh-HK')).toBe(normalizeWords('呢个字系标','zh-HK'));
  const p=assessmentPlan('cantonese','yue-b-p',0,0,true);if(p.mode!=='contrast')throw Error('fixture');
  const e:HfWordEvidence={engine:'pair-sensevoice-native:v1/zh-HK',text:'呢个字系飘',words:[],final:true,untimed:true};
  expect(pairWordDecision(p,e)).toMatchObject({decision:'opposite',confidence:0});
  expect(pairHybridScore(p,e,unresolved,quality)).toMatchObject({status:'matched',recognition:{text:'呢个字系飘'},pairFeedback:{soundMeasured:false}});
 });
 it('accepts exact final Cantonese untimed text without inventing confidence or sound measurements',()=>{
  const product=products.find(p=>p.id==='cantonese')!,id=product.lessons[0],p=assessmentPlan('cantonese',id,0,0);
  if(p.mode!=='contrast')throw Error('fixture');
  const text=pronunciationText(p.target,p.profile.language),e:HfWordEvidence={engine:'pair-sensevoice-native:v1/zh-HK',text,words:[],final:true,untimed:true};
  expect(pairWordDecision(p,e)).toMatchObject({valid:true,decision:'target',confidence:0});
  const r=pairHybridScore(p,e,unresolved,quality);
  expect(r).toMatchObject({status:'matched',recognition:{text,confidence:0},pairFeedback:{soundMeasured:false}});
  if(r.status==='matched')expect(r.score).toBeLessThanOrEqual(p.profile.unit==='tone'?60:85);
  for(const bad of [{...e,untimed:false},{...e,final:false},{...e,engine:'pair-sensevoice-native:v1/zh-CN'}])expect(pairWordDecision(p,bad).valid).toBe(false);
  expect(pairWordDecision(plan,e).valid).toBe(false);
 });
 it('does not let shared word similarity lift a measured opposite Japanese timing contrast',()=>{
  const p=assessmentPlan('japanese','ja-small-tsu',0,0);if(p.mode!=='contrast')throw Error('fixture');
  const base:ScoreResult={status:'matched',score:42,contrast:p.calibrationKey,model:'local-reference-dtw:v1',unit:'phone',targetDistance:.15,competitorDistance:0,referenceVoice:'fixture',scope:'word',breakdown:{wordMatch:91,pairDistinction:2,speechMs:400,referenceMs:450}};
  const e:HfWordEvidence={engine:'pair-vosk-native:v1/ja-JP',text:'サッカー',words:[{word:'サッカー',conf:.95,start:0,end:.5}],final:true};
  expect(pairHybridScore(p,e,base,quality)).toMatchObject({status:'matched',score:1,recognition:{text:'サッカー',decision:'unknown'},pairFeedback:{conflict:true,soundMeasured:true}});
  expect(pairHybridScore(p,undefined,base,quality)).toMatchObject({status:'matched',score:2,pairFeedback:{heard:'',soundMeasured:true}});
 });
 it('keeps an opposite whole-word comparison low when the consonant mask cannot be measured',()=>{
  const p=assessmentPlan('cantonese','yue-b-p',1,1);if(p.mode!=='contrast')throw Error('fixture');
  const base:ScoreResult={status:'matched',score:42,contrast:p.calibrationKey,model:'local-reference-dtw:v1',unit:'phone',targetDistance:.15,competitorDistance:0,referenceVoice:'fixture',scope:'word',closestWord:'杯',breakdown:{wordMatch:91,pairDistinction:2,speechMs:360,referenceMs:430}};
  const e:HfWordEvidence={engine:'pair-sensevoice-native:v1/zh-HK',text:'背',words:[],final:true,untimed:true};
  expect(pairHybridScore(p,e,base,quality)).toMatchObject({status:'matched',score:1,recognition:{text:'背',decision:'unknown'},pairFeedback:{conflict:true,soundMeasured:false},breakdown:{pairDistinction:0}});
 });
});
