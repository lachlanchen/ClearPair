import type {Analysis,AppId} from './types';
import {localModels,validatedTask} from './local-models';
import {assessmentPlan,type AssessmentPlan} from './scoring-profiles';
import type {ScoreResult} from './scoring';
import {analyze} from './analysis';
import {decodeRecording,resamplePCM} from './pcm';
import {LocalWorker} from './local-worker';
import {ReferenceRuntime} from './reference-runtime';
import {hasNativeAudio} from './native';
import {Capacitor} from '@capacitor/core';
import type {HfWordRuntime} from './hf-word-runtime';
import {hfHybridScore,needsHfWordEvidence} from './hf-word-score';
import type {PairWordRuntime} from './pair-word-runtime';
import {pairHybridScore} from './pair-word-score';
export interface LocalAssessmentRequest {
  id:string;app:AppId;plan:Extract<AssessmentPlan,{mode:'contrast'}>;
  samples:Float32Array;quality:Analysis;base:string;
}
export class LocalScorer {
  private host=new LocalWorker();
  private references=new ReferenceRuntime();
  private hfWords?:HfWordRuntime;
  private pairWords?:PairWordRuntime;
  private generation=0;
  cancel(){this.generation++;this.host.cancel();this.hfWords?.cancel();this.pairWords?.cancel();if(hasNativeAudio())this.references.cancel();}
  dispose(){this.generation++;this.host.dispose();this.hfWords?.dispose();this.pairWords?.dispose();if(hasNativeAudio())this.references.dispose();}
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
      let words:import('./hf-word-score').HfWordEvidence|undefined;
      const useHfWords=app==='handf'&&__HF_WORD_MODELS__&&!plan.calibrationKey.includes('/hf-final/');
      const usePairWords=app!=='handf'&&__PAIR_WORD_MODELS__;
      const iosWords=useHfWords&&Capacitor.getPlatform()==='ios';
      const identify=async()=>{
        const Runtime=usePairWords?(await import('./pair-word-runtime')).PairWordRuntime:(await import('./hf-word-runtime')).HfWordRuntime;
        if(generation!==this.generation)return;
        const engine=usePairWords?(this.pairWords??=new Runtime()):(this.hfWords??=new Runtime());
        words=await engine.recognize(plan.profile.language,samples,new URL(import.meta.env.BASE_URL,location.href).href);
      };
      // Like L & N, identify the captured speech FIRST. Reference synthesis
      // changes the shared AVAudioSession; it must not run while Apple words
      // are starting/finishing. Both stages still use this one saved recording.
      if(iosWords||usePairWords)await identify();
      if(generation!==this.generation)return {status:'unscored',reason:'cancelled'};
      const result=calibrated?await this.host.request({id:crypto.randomUUID(),app,plan,samples,quality,
        base:new URL(import.meta.env.BASE_URL,location.href).href}):await this.references.assess(plan,usePairWords||app==='handf'&&__HF_WORD_MODELS__?samples.slice():samples);
      if(generation!==this.generation)return {status:'unscored',reason:'cancelled'};
      // iOS follows L & N: final native word identity first, separate sound
      // evidence second. Android's existing Vosk helper remains a conservative
      // fallback for difficult takes, not a universal pronunciation classifier.
      if(useHfWords&&!iosWords&&needsHfWordEvidence(plan,result))await identify();
      if(generation!==this.generation)return {status:'unscored',reason:'cancelled'};
      const hybrid=usePairWords?pairHybridScore(plan,words,result,quality):hfHybridScore(plan,words,result,quality);
      if((useHfWords||usePairWords)&&(hybrid.status==='matched'&&words!==undefined||hybrid.status==='unscored'&&hybrid.reason!=='cancelled'))
        return {...hybrid,diagnostics:{speechMs:Math.round(quality.voicedSeconds*1000),signal:quality.status,
          acousticState:result.status==='unscored'?result.reason:result.status==='matched'&&result.hf?'measured-sound':'word-comparison',
          wordState:words?.text.trim()?'recognized':words?'empty':'unavailable',
          ...(words?{wordEngine:words.engine,wordText:words.text.slice(0,500),wordFinal:words.final,
            wordProvisional:words.completed===true&&words.final===false}:{}),}};
      return hybrid;
    }catch{
      return {status:'unscored',reason:generation===this.generation?'model-unavailable':'cancelled'};
    }
  }
}
