import {describe,expect,it,vi} from 'vitest';
import {LocalScorer} from './local-score';
import {localModels,validatedTask,type LocalModel} from './local-models';
import {assessmentPlan} from './scoring-profiles';
import {products,lessonById} from './curriculum';
import type {Calibration} from './scoring';
// Deliberately artificial contract fixtures, not human validation/model artifacts.
function fixture():LocalModel{
 const plan=assessmentPlan('handf','hf-en',0,0);if(plan.mode!=='contrast')throw Error('Missing fixture plan');
 const c:Calibration={model:'fixture',profile:plan.profile.id,language:'en-US',unit:'phone',app:'handf',contrasts:[plan.calibrationKey],
  validation:{approved:true,reportSha256:'a'.repeat(64),heldOutSpeakers:30,correctExamples:100,confusedExamples:100},
  intercept:0,weights:{llr:1},knots:[[0,0],[1,1]],gates:{coverage:.8,contentConfidence:.8,maxOOD:.1,minFrames:3,maxEntropy:.8}};
 const gate={intercept:0,weights:{listedPerFrame:1}};
 return {id:'fixture',language:'en-US',asset:'models/fixture.onnx',sha256:'b'.repeat(64),bytes:10,rate:16000,
  preprocessing:'mono-sinc-zscore:v1',input:'pcm',logitsOutput:'logits',featureNames:[],vocabulary:3,blank:0,separators:[],
  rights:{redistributionApproved:true,termsUrl:'https://example.com/license'},
  tasks:[{calibrationKey:plan.calibrationKey,calibration:c,gates:{coverage:gate,contentConfidence:gate,outOfDistribution:gate},
    lattice:{blank:0,inventory:[1,2],prefix:[],suffix:[],target:[[1]],confusions:{f:[[2]]},insertions:false}}]};
}
describe('local-only scoring release boundary',()=>{
 it('does not enable unsupported numeric scores just because models were researched',()=>expect(localModels).toEqual([]));
 it('never opens a network backend or worker without a validated packaged model',async()=>{
  const fetch=vi.fn(),worker=vi.fn();vi.stubGlobal('fetch',fetch);vi.stubGlobal('Worker',worker);
  try{const result=await new LocalScorer().assess('handf','hf-en',0,0,false,new Blob(['audio']));
   expect(result).toEqual({status:'unscored',reason:'unvalidated-model'});expect(fetch).not.toHaveBeenCalled();expect(worker).not.toHaveBeenCalled();}
  finally{vi.unstubAllGlobals();}
 });
 it('preserves the explicit non-graded controls, including same-sound kana',async()=>{
  expect(await new LocalScorer().assess('japanese','ja-script-bridge',0,0,false,new Blob())).toEqual({status:'unscored',reason:'ungraded-exercise'});
 });
 it('does not reinterpret a saved recording after a future curriculum change',async()=>{
  const plan=assessmentPlan('handf','hf-en',0,0);if(plan.mode!=='contrast')throw Error('Fixture');
  const engine=new LocalScorer(),audio=new Blob();
  for(const identity of [
   {word:'other',spokenPrompt:plan.spokenPrompt,calibrationKey:plan.calibrationKey},
   {word:plan.target.text,spokenPrompt:'another sentence',calibrationKey:plan.calibrationKey},
   {word:plan.target.text,spokenPrompt:plan.spokenPrompt,calibrationKey:'obsolete'}]){
   expect(await engine.assess('handf','hf-en',0,0,false,audio,identity)).toEqual({status:'unscored',reason:'unsupported-contrast'});
  }
 });
 it('requires local hashes, distribution rights and human-validated exact task calibration',()=>{
  const m=fixture(),key=m.tasks[0].calibrationKey;expect(validatedTask(m,key)).toBe(m.tasks[0]);
  for(const alter of [(x:LocalModel)=>x.asset='https://example.com/model.onnx',
    (x:LocalModel)=>x.asset='models/../private.onnx',(x:LocalModel)=>x.sha256='wrong',
    (x:LocalModel)=>x.rights.redistributionApproved=false,(x:LocalModel)=>x.tasks[0].calibration.validation.approved=false,
    (x:LocalModel)=>x.tasks[0].calibration.validation.heldOutSpeakers=NaN,
    (x:LocalModel)=>x.tasks[0].calibration.language='zh-CN',
    (x:LocalModel)=>x.tasks[0].gates.contentConfidence.weights={}]){
   const bad=structuredClone(m);alter(bad);expect(validatedTask(bad,key)).toBeUndefined();
  }
 });
 it('routes all eight apps without giving a stale selected card authority over a recording',()=>{
  for(const p of products)for(const lesson of p.lessons)for(const [pair] of lessonById(lesson).pairs.entries()){
   const plan=assessmentPlan(p.id,lesson,pair,0,false);
   if(plan.mode==='contrast')expect(plan.calibrationKey).toMatch(new RegExp(`^${p.id}/${lesson}/${pair}/0/word/`));
  }
 });
});
