import type {Analysis,AppId} from './types';
import {localModels,validatedTask} from './local-models';
import {assessmentPlan,type AssessmentPlan} from './scoring-profiles';
import type {ScoreResult} from './scoring';
import {analyze} from './analysis';
import {decodeRecording,resamplePCM} from './pcm';
import {LocalWorker} from './local-worker';
import {ReferenceRuntime} from './reference-runtime';
import {hasNativeAudio} from './native';
export interface LocalAssessmentRequest {
  id:string;app:AppId;plan:Extract<AssessmentPlan,{mode:'contrast'}>;
  samples:Float32Array;quality:Analysis;base:string;
}
export class LocalScorer {
  private host=new LocalWorker();
  private references=new ReferenceRuntime();
  private generation=0;
  cancel(){this.generation++;this.host.cancel();if(hasNativeAudio())this.references.cancel();}
  dispose(){this.generation++;this.host.dispose();if(hasNativeAudio())this.references.dispose();}
  async assess(app:AppId,lesson:string,pair:number,side:0|1,sentence:boolean,audio:Blob,
    recorded?:{word:string;spokenPrompt:string;calibrationKey?:string}):Promise<ScoreResult>{
    this.cancel();const generation=this.generation;
    const plan=assessmentPlan(app,lesson,pair,side,sentence);
    if(plan.mode==='explore')return {status:'unscored',reason:'ungraded-exercise'};
    if(recorded&&(recorded.word!==plan.target.text||recorded.spokenPrompt!==plan.spokenPrompt||
      recorded.calibrationKey&&recorded.calibrationKey!==plan.calibrationKey))
      return {status:'unscored',reason:'unsupported-contrast'};
    const calibrated=localModels.some(m=>validatedTask(m,plan.calibrationKey));
    if(!calibrated&&!hasNativeAudio())return {status:'unscored',reason:'unvalidated-model'};
    try{
      const pcm=await decodeRecording(audio);
      if(generation!==this.generation)return {status:'unscored',reason:'cancelled'};
      const quality=analyze(pcm.samples,pcm.rate);
      if(!['clear','quiet'].includes(quality.status))return {status:'unscored',reason:'poor-signal'};
      const samples=resamplePCM(pcm.samples,pcm.rate);
      const result=calibrated?await this.host.request({id:crypto.randomUUID(),app,plan,samples,quality,
        base:new URL(import.meta.env.BASE_URL,location.href).href}):await this.references.assess(plan,samples);
      return generation===this.generation?result:{status:'unscored',reason:'cancelled'};
    }catch{
      return {status:'unscored',reason:generation===this.generation?'model-unavailable':'cancelled'};
    }
  }
}
