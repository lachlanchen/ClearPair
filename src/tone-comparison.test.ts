import {describe,it,expect} from 'vitest';
import {compareTone} from './tone-comparison';
import type {AcousticReference} from './reference-features';
const fixture=(shape:(n:number)=>number|null):AcousticReference=>{
 const pitch=Array.from({length:40},(_,i)=>shape(i/39));
 return {pitch,frames:pitch.map(()=>Array(12).fill(0)),spectra:pitch.map(()=>Array(32).fill(0)),energy:pitch.map(()=>.1),seconds:.4,periodic:pitch.filter(p=>p!==null).length/40};
};
describe('relative tone-shape evidence, not absolute register',()=>{
 it('separates rising and falling shapes, independently of pitch offset',()=>{
  const a=fixture(x=>6*x-3),b=fixture(x=>3-6*x);
  const r=compareTone(fixture(x=>6*x+5),a,b)!;
  expect(r.targetDistance).toBeLessThan(.01);expect(r.competitorDistance).toBeGreaterThan(3);
  expect(r.heard).toHaveLength(21);expect(r.frames).toBe(40);
 });
 it('keeps symmetric target/partner distances when the selected side changes',()=>{
  const a=fixture(x=>6*x-3),b=fixture(x=>3-6*x);
  const first=compareTone(a,a,b)!,reverse=compareTone(a,b,a)!;
  expect(first.targetDistance).toBe(reverse.competitorDistance);
  expect(first.competitorDistance).toBe(reverse.targetDistance);
 });
 it('does not pretend centered flat high/mid/low tones are distinguishable',()=>{
  expect(compareTone(fixture(()=>0),fixture(()=>5),fixture(()=>-5))).toBeNull();
 });
 it('can compare level tones against their own surrounding carrier, not another speaker absolute pitch',()=>{
  const target=fixture(()=>3),other=fixture(()=>-2);
  const r=compareTone(fixture(()=>3),target,other,true)!;
  expect(r.baseline).toBe('carrier-median');expect(r.targetDistance).toBe(0);expect(r.competitorDistance).toBe(5);
  expect(compareTone(other,target,other,true)!.competitorDistance).toBe(0);
  expect(compareTone(target,target,target,true)).toBeNull();
 });
 it('rejects insufficient voicing, long gaps and non-finite pitch',()=>{
  const a=fixture(x=>6*x-3),b=fixture(x=>3-6*x);
  for(const take of [fixture(()=>null),fixture(x=>x>.2&&x<.8?null:x),fixture(()=>NaN),{...a,periodic:.1}])expect(compareTone(take,a,b)).toBeNull();
 });
});
