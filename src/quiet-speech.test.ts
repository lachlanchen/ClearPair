import {describe,it,expect} from 'vitest';
import {analyze} from './analysis';
import {framePitch} from './pitch';
import {acousticReference,referenceDistance} from './reference-features';
const voiced=(amplitude:number,seconds=.22)=>Float32Array.from({length:Math.round(16000*seconds)},(_,i)=>{
 const phase=2*Math.PI*190*i/16000;
 return amplitude*(Math.sin(phase)+.45*Math.sin(phase*2)+.25*Math.sin(phase*3));
});
describe('quiet, short capture is not missing speech',()=>{
 it.each([.004,.002])('keeps a voiced short word at gain %s with normal trailing silence',amplitude=>{
  const word=voiced(amplitude),take=new Float32Array(16000);take.set(word,1600);
  const quality=analyze(take,16000);
  expect(quality.status).toBe('quiet');expect(quality.voicedSeconds).toBeGreaterThanOrEqual(.16);
  expect(quality.pitch.some(p=>p!==null)).toBe(true);
  expect(acousticReference(take)).not.toBeNull();
 });
 it('measures periodicity independently of microphone gain',()=>{
  const a=framePitch(voiced(.08,.04),16000),b=framePitch(voiced(.002,.04),16000);
  expect(a).not.toBeNull();expect(b).not.toBeNull();expect(Math.abs(a!-b!)).toBeLessThan(.01);
 });
 it('retains short-word acoustic features under lower gain',()=>{
  const a=acousticReference(voiced(.08))!,b=acousticReference(voiced(.002));
  expect(b).not.toBeNull();expect(referenceDistance(a,b!)).toBeLessThan(.03);
 });
 it('still rejects silence, DC and unmeasurably short taps',()=>{
  for(const input of [new Float32Array(16000),new Float32Array(16000).fill(.01),voiced(.02,.03)]){
   expect(analyze(input,16000).status).toBe('silent');expect(acousticReference(input)).toBeNull();
  }
 });
 it('does not turn quiet broadband noise into pitch evidence',()=>{
  let seed=511;
  const noise=Float32Array.from({length:16000},()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return (seed/2**32-.5)*.008;});
  expect(analyze(noise,16000).pitch.every(p=>p===null)).toBe(true);
 });
});
