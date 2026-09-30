import { describe,it,expect } from 'vitest'
import { comparePronunciations,ctcLogLikelihood,prepareCtc,mergeCtcSeparators } from './ctc'
const logs=(rows:number[][])=>rows.map(row=>row.map(Math.log))
describe('phone CTC likelihood, not word recognition scores',()=>{
  it('sums blank and repeated-frame paths',()=>{expect(Math.exp(ctcLogLikelihood(logs([[.2,.8],[.3,.7]]),[1]))).toBeCloseTo(.8*.7+.2*.7+.8*.3)})
  it('does not collapse repeated target phones without a blank',()=>{expect(ctcLogLikelihood(logs([[.01,.99],[.01,.99]]),[1,1])).toBe(-Infinity)})
  it('allows repeated target phones separated by blank',()=>{expect(Math.exp(ctcLogLikelihood(logs([[.1,.9],[.9,.1],[.1,.9]]),[1,1]))).toBeCloseTo(.9**3)})
  it('prefers acoustic evidence for the actual confused sound',()=>{const result=comparePronunciations(logs([[.05,.9,.05],[.05,.1,.85]]),{target:[[1,1]],confused:[[1,2]],other:[[2,1]]});expect(result.confused).toBeGreaterThan(result.target);expect(result.confused).toBeGreaterThan(result.other)})
  it('does not reward duplicate pronunciation variants',()=>{const frames=logs([[.2,.8]]);const values=comparePronunciations(frames,{one:[[1]],two:[[1],[1]]});expect(values.one).toBeCloseTo(values.two)})
  it('deduplicates mixed variants without changing their prior weights',()=>{const frames=logs([[.1,.8,.1]]);const values=comparePronunciations(frames,{one:[[1],[2]],two:[[1],[1],[2]]});expect(values.one).toBeCloseTo(values.two)})
  it('reuses immutable evidence across candidate comparisons',()=>{const frames=logs([[.2,.8]]);const evaluate=prepareCtc(frames);frames[0][1]=0;expect(evaluate([1])).toBeCloseTo(Math.log(.8));expect(()=>evaluate([2])).toThrow();expect(()=>evaluate([0])).toThrow()})
  it('preserves likelihoods for prepared evaluation',()=>{const frames=logs([[.1,.6,.3],[.3,.2,.5],[.8,.1,.1]]);const evaluate=prepareCtc(frames);for(const labels of [[],[1],[2],[1,2],[1,1]])expect(evaluate(labels)).toBe(ctcLogLikelihood(frames,labels))})
  it('handles empty input and blank-only sequences',()=>{expect(ctcLogLikelihood([],[])).toBe(0);expect(ctcLogLikelihood([],[1])).toBe(-Infinity);expect(ctcLogLikelihood(logs([[.2,.8]]),[])).toBeCloseTo(Math.log(.2))})
  it('rejects unknown labels and malformed logits',()=>{expect(()=>ctcLogLikelihood([[-.1,-1]],[0])).toThrow();expect(()=>ctcLogLikelihood([[1,2]],[1])).toThrow();expect(()=>ctcLogLikelihood([[-.1,-1]],[2])).toThrow()})
  it('preserves delimiter and unknown probability mass in explicit vocabulary projection',()=>{const frames=logs([[.1,.3,.2,.4]]);const projected=mergeCtcSeparators(frames,0,[2]);expect(Math.exp(projected[0][0])).toBeCloseTo(.3);expect(projected[0][2]).toBe(-Infinity);expect(projected[0][3]).toBe(frames[0][3]);expect(projected[0].reduce((s,p)=>s+Math.exp(p),0)).toBeCloseTo(1);expect(frames[0][2]).toBe(Math.log(.2))})
  it('retains a separator between repeated phones as an acoustic boundary',()=>{const projected=mergeCtcSeparators(logs([[0,1,0],[0,0,1],[0,1,0]]),0,[2]);expect(ctcLogLikelihood(projected,[1,1])).toBe(0);expect(ctcLogLikelihood(projected,[1])).toBe(-Infinity)})
  it('refuses malformed separator adapters',()=>{const frames=logs([[.2,.8]]);expect(()=>mergeCtcSeparators(frames,0,[0])).toThrow();expect(()=>mergeCtcSeparators(frames,0,[2])).toThrow();expect(()=>mergeCtcSeparators(frames,0,[1,1])).toThrow()})
})
