import {describe,it,expect} from 'vitest';
import {acousticReference,referenceDistance} from './reference-features';
import {referenceScore} from './reference-score';
import {assessmentPlan} from './scoring-profiles';
function vowel(freq=140,formant=750,seconds=.7){
 const signal=new Float32Array(Math.round(seconds*16000));
 for(let i=0;i<signal.length;i++){
  const t=i/16000,envelope=Math.min(1,t/.035,(seconds-t)/.04);
  for(let h=1;h<28;h++){
   const gain=Math.exp(-(((h*freq-formant)/220)**2))+.35*Math.exp(-(((h*freq-2000)/300)**2));
   signal[i]+=.035*gain*Math.sin(2*Math.PI*freq*h*t)*envelope;
  }
 }
 return signal;
}
// Explicit synthetic engineering fixtures, NOT native-speaker accuracy evidence.
describe('beta local acoustic practice index',()=>{
 it('is finite and loudness-invariant',()=>{
  const audio=vowel(),a=acousticReference(audio)!,b=acousticReference(audio.map(v=>v*.35))!;
  expect(a.frames.length).toBeGreaterThan(30);expect(a.periodic).toBeGreaterThan(.6);
  expect(referenceDistance(a,b)).toBeLessThan(.02);
 });
 it('rejects silence, DC and too-short input; validates numeric bounds',()=>{
  for(const value of [new Float32Array(16000),new Float32Array(16000).fill(.4),vowel().slice(0,1000)])expect(acousticReference(value)).toBeNull();
  expect(()=>acousticReference(new Float32Array([NaN,...new Array(2000).fill(.1)]))).toThrow();
 });
 it('keeps vowel colour and moderate speed changes distinct',()=>{
  const a=acousticReference(vowel(140,600))!,slow=acousticReference(vowel(140,600,1.0))!,wrong=acousticReference(vowel(140,1200))!;
  expect(referenceDistance(a,slow)).toBeLessThan(referenceDistance(a,wrong));
 });
 it('does not return the same score for opposite targets',()=>{
  const p=assessmentPlan('english','v-i',0,0);if(p.mode!=='contrast')throw Error('plan');
  const a=vowel(140,600),b=vowel(140,1200);
  const good=referenceScore({id:'a',plan:p,samples:a,target:a,competitor:b,voice:'fixture'});
  const wrong=referenceScore({id:'b',plan:p,samples:b,target:a,competitor:b,voice:'fixture'});
  expect(good.status).toBe('matched');expect(wrong.status).toBe('matched');
  if(good.status==='matched'&&wrong.status==='matched'){
   expect(good.targetDistance).toBe(0);expect(wrong.competitorDistance).toBe(0);
   expect(good.score).toBeGreaterThan(90);expect(wrong.score).toBeLessThan(50);
   expect(good.score-wrong.score).toBeGreaterThan(40);expect('probability' in good).toBe(false);
   expect(good.focus?.region).toBe('vowel');expect(good.model).toBe('local-reference-dtw:v2');
   expect(good.breakdown?.pairDistinction).toBeGreaterThan(95);
   expect(wrong.closestWord).toBe(p.competitor.text);
  }
 });
 it('uses the same A/B comparison when the selected side reverses',()=>{
  const p=assessmentPlan('english','v-i',0,0),q=assessmentPlan('english','v-i',0,1);
  if(p.mode!=='contrast'||q.mode!=='contrast')throw Error('plan');
  const a=vowel(140,600),b=vowel(140,1200);
  const first=referenceScore({id:'a',plan:p,samples:a,target:a,competitor:b,voice:'fixture'});
  const reverse=referenceScore({id:'b',plan:q,samples:a,target:b,competitor:a,voice:'fixture'});
  expect(first.status).toBe('matched');expect(reverse.status).toBe('matched');
  if(first.status==='matched'&&reverse.status==='matched'){
   expect(first.focus?.targetDistance).toBe(reverse.focus?.competitorDistance);
   expect(first.closestWord).toBe(reverse.closestWord);
   expect(reverse.score).toBeLessThanOrEqual(45);
  }
 });
 it('does not score a noise burst or identical reference pronunciations',()=>{
  const p=assessmentPlan('english','v-i',0,0);if(p.mode!=='contrast')throw Error('plan');
  const a=vowel(),b=vowel(140,1200);let seed=12345;
  const noise=Float32Array.from({length:12000},()=>{seed=(seed*1664525+1013904223)>>>0;return (seed/2**32-.5)*.2;});
  expect(referenceScore({id:'n',plan:p,samples:noise,target:a,competitor:b,voice:'fixture'}).status).toBe('unscored');
  expect(referenceScore({id:'s',plan:p,samples:a,target:a,competitor:a,voice:'fixture'})).toEqual({status:'unscored',reason:'uncertain'});
 });
 it('locates the word inside a shared carrier rather than grading shared carrier speech',()=>{
  const p=assessmentPlan('english','v-i',0,0,true);if(p.mode!=='contrast')throw Error('plan');
  const a=vowel(140,600,.4),b=vowel(140,1200,.4),prefix=vowel(140,1900,.8),gap=new Float32Array(1600);
  const join=(...parts:Float32Array[])=>{const out=new Float32Array(parts.reduce((n,v)=>n+v.length,0));let at=0;for(const v of parts){out.set(v,at);at+=v.length;}return out;};
  const request={id:'carrier',plan:p,target:join(prefix,gap,a),competitor:join(prefix,gap,b),wordTarget:a,wordCompetitor:b,voice:'fixture'};
  const good=referenceScore({...request,samples:request.target}),wrong=referenceScore({...request,samples:request.competitor});
  expect(good.status).toBe('matched');expect(wrong.status).toBe('matched');
  if(good.status==='matched'&&wrong.status==='matched'){
   expect(good.focus?.region).toBe('vowel');expect(good.breakdown!.speechMs).toBeLessThan(800);
   expect(good.score).toBeGreaterThan(wrong.score+35);expect(wrong.closestWord).toBe(p.competitor.text);
  }
  expect(referenceScore({...request,samples:request.target,wordTarget:undefined})).toEqual({status:'unscored',reason:'reference-unavailable'});
 });
 it('localizes an exact carrier identically even when coarticulation changes which word reference is closest',()=>{
  const p=assessmentPlan('english','v-i',0,0,true),q=assessmentPlan('english','v-i',0,1,true);
  if(p.mode!=='contrast'||q.mode!=='contrast')throw Error('plan');
  const prefix=vowel(140,2000,.7),gap=new Float32Array(1600),a=vowel(140,600,.4),b=vowel(140,1200,.4);
  const join=(word:Float32Array)=>{const out=new Float32Array(prefix.length+gap.length+word.length);out.set(prefix);out.set(word,prefix.length+gap.length);return out;};
  const ca=join(vowel(140,950,.4)),cb=join(b);
  const request={id:'coarticulation',plan:p,samples:ca,target:ca,competitor:cb,wordTarget:a,wordCompetitor:b,voice:'fixture'};
  const first=referenceScore(request),reverse=referenceScore({...request,plan:q,target:cb,competitor:ca,wordTarget:b,wordCompetitor:a});
  expect(first.status).toBe('matched');expect(reverse.status).toBe('matched');
  if(first.status==='matched'&&reverse.status==='matched'){
   expect(first.targetDistance).toBe(0);expect(reverse.competitorDistance).toBe(0);
   expect(first.focus?.targetDistance).toBe(reverse.focus?.competitorDistance);
  }
 });
 it('uses anchored surrounding speech to exclude a similar earlier carrier vowel',()=>{
  const p=assessmentPlan('english','v-i',0,0,true);if(p.mode!=='contrast')throw Error('plan');
  const prefix=vowel(140,650,.7),suffix=vowel(140,1900,.6),gap=new Float32Array(800),a=vowel(140,600,.35),b=vowel(140,1200,.35);
  const join=(word:Float32Array)=>{const parts=[prefix,gap,word,gap,suffix],out=new Float32Array(parts.reduce((s,v)=>s+v.length,0));let at=0;for(const v of parts){out.set(v,at);at+=v.length;}return out;};
  const request={id:'edges',plan:p,target:join(a),competitor:join(b),wordTarget:a,wordCompetitor:b,voice:'fixture',carrierAnchors:{target:{prefix,suffix},competitor:{prefix,suffix}}};
  const good=referenceScore({...request,samples:request.target}),wrong=referenceScore({...request,samples:request.competitor});
  expect(good.status).toBe('matched');expect(wrong.status).toBe('matched');
  if(good.status==='matched'&&wrong.status==='matched'){
   expect(good.targetDistance).toBe(0);expect(wrong.competitorDistance).toBe(0);
   expect(good.breakdown!.speechMs).toBeLessThan(650);
   expect(good.score).toBeGreaterThan(wrong.score+35);
  }
 });
});
