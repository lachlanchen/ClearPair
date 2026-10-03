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
 it('cannot turn a decoded target hallucination over poor signal into a grade',()=>{
  const noise:ScoreResult={status:'unscored',reason:'poor-signal'};
  expect(pairHybridScore(plan,evidence('light','en-US'),noise,quality)).toBe(noise);
  // Missing references remain different from poor/noisy captured audio.
  expect(pairHybridScore(plan,evidence('light','en-US'),unresolved,quality).status).toBe('matched');
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
 it('retains a strong measured contrast when bundled lexical confidence is low, without confirming its text',()=>{
  const acoustic:ScoreResult={status:'matched',score:99,contrast:plan.calibrationKey,model:'local-reference-dtw:v2',unit:'phone',targetDistance:0,competitorDistance:.3,referenceVoice:'fixture',scope:'word',closestWord:'light',
   focus:{version:'pair-focus-dtw:v1',region:'initial',targetDistance:0,competitorDistance:.6,separation:.6,frames:9},breakdown:{wordMatch:100,pairDistinction:98,speechMs:300,referenceMs:300}};
  const e={...evidence('height','en-US',.5),engine:'pair-vosk-native:v1/en-US'};
  expect(pairHybridScore(plan,e,acoustic,quality)).toMatchObject({status:'matched',score:77,evidence:'sound',recognition:{text:'height',decision:'unknown'},pairFeedback:{kind:'unconfirmed',soundMeasured:true}});
  expect(pairHybridScore(plan,{...e,words:[{...e.words[0],conf:.95}]},acoustic,quality)).toMatchObject({status:'matched',score:59,recognition:{text:'height',decision:'unknown'},pairFeedback:{conflict:true}});
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
 it('keeps a brief, strongly separated Korean stop cue when lexical spelling collapses, but not a weak cue',()=>{
  const p=assessmentPlan('korean','ko-d-tt',1,1);if(p.mode!=='contrast')throw Error('plan');
  const a:Extract<ScoreResult,{status:'matched'}>={status:'matched',score:99,contrast:p.calibrationKey,model:'local-reference-dtw:v2',unit:'phone',
   targetDistance:0,competitorDistance:.18,referenceVoice:'fixture',scope:'word',closestWord:p.target.text,
   focus:{version:'pair-focus-dtw:v1',region:'initial',targetDistance:0,competitorDistance:.45,separation:.45,frames:3},
   breakdown:{wordMatch:100,pairDistinction:98,speechMs:270,referenceMs:270}};
  const e={...evidence(p.competitor.text,'ko-KR'),engine:'pair-vosk-native:v1/ko-KR'};
  expect(pairHybridScore(p,e,a,quality)).toMatchObject({status:'matched',score:78,recognition:{text:p.competitor.text,decision:'opposite'},pairFeedback:{conflict:true,soundMeasured:true}});
  expect(pairHybridScore(p,e,{...a,focus:{...a.focus!,separation:.1}},quality)).toMatchObject({status:'matched',score:0,pairFeedback:{soundMeasured:false}});
  expect(pairHybridScore(plan,evidence(plan.competitor.text,'en-US'),{...a,contrast:plan.calibrationKey,closestWord:plan.target.text},quality)).toMatchObject({status:'matched',score:0,pairFeedback:{soundMeasured:false}});
 });
 it('never mistakes a carrier word for an additional answer',()=>{
  const p=assessmentPlan('chinese','z-c',1,1,true);if(p.mode!=='contrast')throw Error('plan');
  expect(pairWordDecision(p,evidence(p.spokenPrompt,'zh-CN'))).toMatchObject({decision:'target'});
  expect(pairWordDecision(p,evidence(pronunciationText(p.competitor,'zh-CN',true),'zh-CN'))).toMatchObject({decision:'opposite'});
 });
 it('retains capped Mandarin nasal reference disagreement without inventing a final-sound measurement',()=>{
  for(const side of [0,1] as const){
   const p=assessmentPlan('chinese','in-ing',1,side,true);if(p.mode!=='contrast')throw Error('plan');
   const a:Extract<ScoreResult,{status:'matched'}>={status:'matched',score:side?45:90,contrast:p.calibrationKey,model:'local-reference-dtw:v1',unit:'phone',
    targetDistance:side?.055:0,competitorDistance:side?0:.055,referenceVoice:'fixture',scope:'sentence',closestWord:'林',
    breakdown:{wordMatch:100,pairDistinction:side?19:81,speechMs:330,referenceMs:330}};
   const e={...evidence('这个字是零。','zh-CN',.85),engine:'pair-vosk-native:v1/zh-CN'};
   const r=pairHybridScore(p,e,a,quality);
   expect(r).toMatchObject({status:'matched',score:side?31:49,evidence:'word',recognition:{text:e.text},pairFeedback:{conflict:true,soundMeasured:false}});
   expect(r).not.toHaveProperty('focus');expect(r).not.toHaveProperty('tone');
   if(r.status==='matched'){expect(r.breakdown?.pairDistinction).toBe(0);expect(r.score).toBeLessThanOrEqual(59);}
   // A rounded 80/20 reference index can sit just below the stronger named
   // closest-word threshold. It remains provisional, not a measured n/ng.
   const boundary={...a,closestWord:undefined,targetDistance:side?.05195:0,competitorDistance:side?0:.05195,
    breakdown:{...a.breakdown!,pairDistinction:side?20:80}};
   expect(pairHybridScore(p,e,boundary,quality)).toMatchObject({score:side?32:48,pairFeedback:{conflict:true,soundMeasured:false}});
   const identical={...a,targetDistance:0,competitorDistance:0};
   expect(pairHybridScore(p,e,identical,quality)).toMatchObject({status:'matched',score:side?85:0,pairFeedback:{conflict:false,soundMeasured:false}});
   const loose={...a,targetDistance:.4,competitorDistance:.5};
   expect(pairHybridScore(p,e,loose,quality)).toMatchObject({status:'matched',score:side?85:0,pairFeedback:{conflict:false}});
   expect(pairHybridScore(p,{...e,text:'香蕉',words:[{word:'香蕉',conf:.95,start:0,end:.3}]},a,quality))
    .toMatchObject({recognition:{text:'香蕉',decision:'unknown'},pairFeedback:{kind:'unconfirmed',soundMeasured:false}});
  }
 });
 it('retains provisional English ending disagreement when mouth is recognized as mouse, without fabricating TH evidence',()=>{
  for(const side of [0,1] as const){
   const p=assessmentPlan('english','th-s',4,side);if(p.mode!=='contrast')throw Error('plan');
   const a:Extract<ScoreResult,{status:'matched'}>={status:'matched',score:side?43:98,contrast:p.calibrationKey,model:'local-reference-dtw:v1',unit:'phone',
    targetDistance:side?.1301:0,competitorDistance:side?0:.1301,referenceVoice:'fixture',scope:'word',closestWord:'mouth',
    breakdown:{wordMatch:100,pairDistinction:side?3:97,speechMs:480,referenceMs:480}};
   const r=pairHybridScore(p,evidence('mouse','en-US',1),a,quality);
   expect(r).toMatchObject({status:'matched',score:side?22:58,evidence:'word',recognition:{text:'mouse',decision:side?'target':'opposite'},pairFeedback:{conflict:true,soundMeasured:false}});
   expect(r).not.toHaveProperty('focus');
   if(r.status==='matched')expect(r.breakdown?.pairDistinction).toBe(0);
   expect(pairHybridScore(p,evidence('house','en-US',1),a,quality)).toMatchObject({recognition:{text:'house',decision:'unknown'},pairFeedback:{kind:'unconfirmed',soundMeasured:false}});
  }
 });
 it('uses actual answer confidence rather than the weakest shared carrier segment',()=>{
  const p=assessmentPlan('english','v-i',0,0,true);if(p.mode!=='contrast')throw Error('plan');
  const e:HfWordEvidence={engine:'pair-vosk-native:v1/en-US',text:'i said sheep again',final:true,
   words:['i','said','sheep','again'].map((word,i)=>({word,conf:i===1?.3:.9,start:i*.2,end:(i+1)*.2}))};
  expect(pairWordDecision(p,e)).toMatchObject({decision:'target',confidence:.9});
  expect(pairWordDecision(p,{...e,words:e.words.map(w=>({...w,conf:w.word==='sheep'?.3:.9}))})).toMatchObject({decision:'unknown',confidence:.3});
  expect(pairWordDecision(p,{...e,text:'sheep is a different sentence',words:[{word:'sheep is a different sentence',conf:.95,start:0,end:1}]})).toMatchObject({decision:'other'});
 });
 it('keeps accepted homophones and mixed answers inside the authored slot',()=>{
  const p=assessmentPlan('landr','lr-start',0,1,true);if(p.mode!=='contrast')throw Error('plan');
  expect(pairWordDecision(p,evidence('I said write again.','en-US'))).toMatchObject({decision:'target'});
  expect(pairWordDecision(p,evidence('I said light right again.','en-US'))).toMatchObject({decision:'both'});
 });
 it('accepts explicitly authored Japanese carrier orthography without guessing target readings',()=>{
  const p=assessmentPlan('japanese','ja-h-b-p',0,0,true);if(p.mode!=='contrast')throw Error('plan');
  expect(pairWordDecision(p,evidence('もう一度、ハ。','ja-JP'))).toMatchObject({decision:'target'});
  expect(pairWordDecision(p,evidence('もういちど、ぱ。','ja-JP'))).toMatchObject({decision:'opposite'});
  expect(pairWordDecision(p,evidence('もう一度、ワ。','ja-JP'))).toMatchObject({decision:'other'});
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
