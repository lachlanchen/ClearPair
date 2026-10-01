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
  const p=assessmentPlan('handf','hf-en',0,0);if(p.mode!=='contrast')throw Error('plan');
  const a=vowel(140,600),b=vowel(140,1200);
  const good=referenceScore({id:'a',plan:p,samples:a,target:a,competitor:b,voice:'fixture'});
  const wrong=referenceScore({id:'b',plan:p,samples:b,target:a,competitor:b,voice:'fixture'});
  expect(good.status).toBe('matched');expect(wrong.status).toBe('matched');
  if(good.status==='matched'&&wrong.status==='matched'){
   expect(good.score).toBeGreaterThan(90);expect(wrong.score).toBeLessThan(50);
   expect(good.score-wrong.score).toBeGreaterThan(40);expect('probability' in good).toBe(false);
  }
 });
 it('does not score a noise burst or identical reference pronunciations',()=>{
  const p=assessmentPlan('handf','hf-en',0,0);if(p.mode!=='contrast')throw Error('plan');
  const a=vowel(),b=vowel(140,1200);let seed=12345;
  const noise=Float32Array.from({length:12000},()=>{seed=(seed*1664525+1013904223)>>>0;return (seed/2**32-.5)*.2;});
  expect(referenceScore({id:'n',plan:p,samples:noise,target:a,competitor:b,voice:'fixture'}).status).toBe('unscored');
  expect(referenceScore({id:'s',plan:p,samples:a,target:a,competitor:a,voice:'fixture'})).toEqual({status:'unscored',reason:'uncertain'});
 });
});
