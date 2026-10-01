import {describe,expect,it} from 'vitest';
import {localEvidence} from './local-evidence';
import {scoreContrast} from './scoring';
import type {LocalModel,LocalTask} from './local-models';
import type {Analysis} from './types';

// Artificial posterior contracts; these fixtures are not model qualifications.
const quality:Analysis={seconds:1,rms:.1,peak:.3,clipped:0,voicedSeconds:.8,waveform:[],pitch:[],status:'clear'};
function fixture(target:number[][],prefix:number[]=[],suffix:number[]=[]){
  const gate={intercept:0,weights:{listedPerFrame:1}};
  const task:LocalTask={calibrationKey:'fixture',lattice:{blank:0,inventory:[1,2,3,4],prefix,suffix,target,
    confusions:{other:[[4]]},insertions:false},gates:{coverage:gate,contentConfidence:gate,outOfDistribution:gate},
    calibration:{model:'fixture',profile:'fixture:v1',language:'en-US',contrasts:['fixture'],app:'handf',unit:'phone',
      validation:{approved:false,reportSha256:'',heldOutSpeakers:0,correctExamples:0,confusedExamples:0},
      intercept:0,weights:{llr:1},knots:[[0,0],[1,1]],gates:{coverage:.5,contentConfidence:.5,maxOOD:.5,minFrames:1,maxEntropy:1}}};
  const model:LocalModel={id:'fixture',language:'en-US',asset:'models/fixture.onnx',sha256:'',bytes:0,rate:16000,
    preprocessing:'mono-sinc-zscore:v1',input:'pcm',logitsOutput:'logits',featureNames:['probe'],featuresOutput:'features',
    vocabulary:5,blank:0,separators:[],rights:{redistributionApproved:false,termsUrl:''},tasks:[task]};
  return {model,task};
}
const logs=(rows:number[][])=>rows.map(row=>row.map(Math.log));
describe('accepted-pronunciation acoustic alignment',()=>{
  it('uses an alignable accepted variant when the first variant is impossible',()=>{
    const {model,task}=fixture([[1,1],[1]]);
    const evidence=localEvidence(model,task,logs([[.1,.8,0,0,.1]]),quality,{probe:[23]});
    expect(evidence.targetLogLikelihood).toBeCloseTo(Math.log(.8));
    expect(evidence.alignedFrames).toBe(1);
    expect(evidence.features.probe).toBeCloseTo(23);
  });
  it('marginalizes accepted variants independently of their order or duplicates',()=>{
    // Conditional target probabilities are 1/2 each for [1] and [1,2].
    // Their equal-phone anchor occupancies are (2/3,1/3) and (1/2,1/2),
    // so the accepted union weights the target frames (7/12,5/12).
    // Prefix/suffix frames must not contribute to the acoustic measurement.
    const frames=logs([[0,0,0,1,0],[0,1,0,0,0],[.25,.25,.5,0,0],[0,0,0,1,0]]);
    const variants=[[[1],[1,2]],[[1,2],[1]],[[1],[1],[1,2]],[[1,2],[1,2],[1]]];
    const results=variants.map(target=>{
      const {model,task}=fixture(target,[3],[3]);
      return localEvidence(model,task,frames,quality,{probe:[999,10,34,-999]});
    });
    for(const evidence of results){
      expect(evidence.targetLogLikelihood).toBeCloseTo(0);
      expect(evidence.features.probe).toBeCloseTo(20,12);
      expect(evidence.alignedFrames).toBe(2);
      expect(evidence.features.alignedFraction).toBe(.5);
      expect(evidence.features.alignmentConcentration).toBeCloseTo(results[0].features.alignmentConcentration,12);
    }
  });
  it('still rejects a target when none of its accepted pronunciations can align',()=>{
    const {model,task}=fixture([[1,1],[1,2]]);
    expect(()=>localEvidence(model,task,logs([[.1,.8,0,0,.1]]),quality)).toThrow();
  });
  it('passes a zero-mass confusion through to a finite synthetic calibrated result',()=>{
    const {model,task}=fixture([[1]]);
    task.lattice.confusions={other:[[4,4]]};
    const evidence=localEvidence(model,task,logs([[.1,.8,0,0,.1]]),quality);
    expect(evidence.competitorLogLikelihoods).toEqual([-Infinity]);
    task.calibration.validation={approved:true,reportSha256:'a'.repeat(64),heldOutSpeakers:30,correctExamples:100,confusedExamples:100};
    task.calibration.gates={coverage:.4,contentConfidence:.4,maxOOD:.6,minFrames:1,maxEntropy:1};
    expect(scoreContrast('handf',evidence,task.calibration)).toMatchObject({status:'scored',score:80});
  });
});
