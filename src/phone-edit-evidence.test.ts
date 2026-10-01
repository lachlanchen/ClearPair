import {describe,expect,it} from 'vitest';
import {execFileSync} from 'node:child_process';
import {phoneEditFeatures,freePhoneAlignment} from './phone-edit-evidence';

const frames=[[.1,.7,.1,.1],[.3,.1,.5,.1],[.1,.1,.1,.7]].map(r=>r.map(Math.log));
describe('context-aware phone features',()=>{
  it('keeps omission/substitution distinct in unconstrained phone alignment',()=>{
    expect(freePhoneAlignment([1,2,3],[2,3])).toEqual({observed:[null,2,3],distance:1/3});
    expect(freePhoneAlignment([1,2,3],[3,2,3])).toEqual({observed:[3,2,3],distance:1/3});
  });
  it('compares all phones and returns finite features without inventing a grade',()=>{
    const result=phoneEditFeatures(frames,[1,2,3],0,[1,2,3],0);
    expect(Object.values(result).every(Number.isFinite)).toBe(true);
    expect(result.targetVsBestEdit).toBeGreaterThan(0);
    expect(result.greedyMatch).toBe(1);
    expect(result.greedyContextDistance).toBe(0);
    expect(result).not.toHaveProperty('score');
  });
  it('does not reward a wrong target just because its alignment is forced',()=>{
    const good=phoneEditFeatures(frames,[1,2,3],0,[1,2,3],0);
    const bad=phoneEditFeatures(frames,[3,2,3],0,[1,2,3],0);
    expect(bad.targetGivenEdits).toBeLessThan(good.targetGivenEdits);
    expect(bad.greedyMatch).toBe(0);
  });
  it('rejects duplicate inventories, missing targets and nonprobability inputs',()=>{
    expect(()=>phoneEditFeatures(frames,[1,2,3],0,[1,1,2,3],0)).toThrow();
    expect(()=>phoneEditFeatures(frames,[1,2,3],0,[2,3],0)).toThrow();
    expect(()=>phoneEditFeatures([[1,2,3,4]],[1],0,[1,2,3],0)).toThrow();
    expect(()=>phoneEditFeatures(frames,[1,2,3],-1,[1,2,3],0)).toThrow();
  });
  it.skipIf(!process.env.ONSET_PARITY_PYTHON)('matches independent PyTorch edit marginalization',()=>{
    const result=JSON.parse(execFileSync(process.env.ONSET_PARITY_PYTHON!,['-c',`
import json,sys,numpy as np,torch
sys.path.insert(0,'tools')
from ctc_edit_evidence import context_edits
f=np.log(np.array([[.1,.7,.1,.1],[.3,.1,.5,.1],[.1,.1,.1,.7]]))
x=context_edits(f,[1,2,3],0,[1,2,3],0,torch)
total=np.logaddexp.reduce(x);p=x-total
print(json.dumps(dict(targetVsBestEdit=float(x[0]-max(x[1:])),targetGivenEdits=float(np.exp(p[0])),editEntropy=float(-sum(np.exp(p[np.isfinite(p)])*p[np.isfinite(p)]))),allow_nan=False))
`],{encoding:'utf8',timeout:30000}));
    const actual=phoneEditFeatures(frames,[1,2,3],0,[1,2,3],0);
    for(const [key,value] of Object.entries(result))expect(actual[key]).toBeCloseTo(value as number,10);
  });
});
