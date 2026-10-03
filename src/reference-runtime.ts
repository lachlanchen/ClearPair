import {nativeAudio} from './native';
import {decodeRecording,resamplePCM} from './pcm';
import {pronunciationText} from './pronunciation-text';
import {carrierContext} from './carrier-context';
import type {AssessmentPlan} from './scoring-profiles';
import type {ScoreResult} from './scoring';
type Plan=Extract<AssessmentPlan,{mode:'contrast'}>;
/** At most one synthesis/worker attempt. Cache only synthetic references in RAM,
 * never microphone recordings. No fetch, uploads or cross-app shared storage. */
export class ReferenceRuntime {
 private generation=0;
 private worker?:Worker;
 private abort?:()=>void;
 private cache=new Map<string,{samples:Float32Array;voice:string}>();
 constructor(private create=()=>new Worker(new URL('./reference-score.worker.ts',import.meta.url),{type:'module'})){}
 cancel(){this.generation++;this.abort?.();this.abort=undefined;this.worker?.terminate();this.worker=undefined;
  void nativeAudio.cancelReference().catch(()=>{});}
 dispose(){this.cancel();this.cache.clear();}
 async assess(plan:Plan,samples:Float32Array):Promise<ScoreResult>{
  this.cancel();const generation=this.generation,id=crypto.randomUUID();
  let deadline:ReturnType<typeof setTimeout>|undefined;
  const work=async():Promise<ScoreResult>=>{
   const reference=async(text:string)=>{
    const key=plan.profile.language+'|'+text;
    const cached=this.cache.get(key);if(cached)return cached;
    const audio=await nativeAudio.reference({id,text,language:plan.profile.language}).catch(()=>{throw Error('reference-unavailable');});
    if(generation!==this.generation)throw Error('Cancelled');
    if(audio.base64.length>6_000_000||!audio.voice)throw Error('Invalid reference');
    const pcm=await decodeRecording(new Blob([Uint8Array.from(atob(audio.base64),c=>c.charCodeAt(0))],{type:audio.mimeType}));
    if(generation!==this.generation)throw Error('Cancelled');
    const value={samples:resamplePCM(pcm.samples,pcm.rate),voice:audio.voice};
    if(this.cache.size>=24)this.cache.delete(this.cache.keys().next().value!);
    this.cache.set(key,value);return value;
   };
   const sentence=plan.calibrationKey.includes('/sentence/');
   const a=await reference(plan.spokenPrompt);
   if(generation!==this.generation)return {status:'unscored',reason:'cancelled'};
   const b=await reference(pronunciationText(plan.competitor,plan.profile.language,sentence));
   if(generation!==this.generation)return {status:'unscored',reason:'cancelled'};
   if(a.voice!==b.voice){this.cache.clear();return {status:'unscored',reason:'model-unavailable'};}
   // Every carrier sentence needs independent word references to locate the
   // target. Its common carrier must not dilute an opposite initial/ending.
   const focused=sentence;
   const wa=focused?await reference(pronunciationText(plan.target,plan.profile.language)):a;
   const wb=focused?await reference(pronunciationText(plan.competitor,plan.profile.language)):b;
   if(generation!==this.generation)return {status:'unscored',reason:'cancelled'};
   if([wa.voice,wb.voice].some(v=>v!==a.voice)){this.cache.clear();return {status:'unscored',reason:'model-unavailable'};}
   let carrierAnchors:import('./reference-score').ReferenceRequest['carrierAnchors'];
   if(sentence&&!plan.calibrationKey.startsWith('handf/')){
    const context=async(word:typeof plan.target)=>{
     const parts=carrierContext(word,plan.profile.language);if(!parts)throw Error('reference-unavailable');
     const prefix=parts.prefix?await reference(parts.prefix):undefined,suffix=parts.suffix?await reference(parts.suffix):undefined;
     if([prefix,suffix].some(v=>v&&v.voice!==a.voice)){this.cache.clear();throw Error('Invalid reference voice');}
     return {...(prefix?{prefix:prefix.samples}:{}),...(suffix?{suffix:suffix.samples}:{})};
    };
    carrierAnchors={target:await context(plan.target),competitor:await context(plan.competitor)};
    if(generation!==this.generation)return {status:'unscored',reason:'cancelled'};
   }
   return await new Promise<ScoreResult>(resolve=>{
    const worker=this.create();this.worker=worker;
    const finish=(result:ScoreResult)=>{worker.terminate();if(this.worker===worker)this.worker=undefined;resolve(result);};
    this.abort=()=>finish({status:'unscored',reason:'cancelled'});
    worker.onerror=()=>finish({status:'unscored',reason:'model-unavailable'});
    worker.onmessage=event=>{
     if(event.data?.id!==id)return;
     const result=event.data.result as ScoreResult;
     if(result?.status==='matched'&&result.contrast===plan.calibrationKey&&result.referenceVoice===a.voice&&
       (result.model==='local-reference-dtw:v1'||result.model==='local-reference-dtw:v2')&&Number.isInteger(result.score)&&result.score>=0&&result.score<=100&&
       [result.targetDistance,result.competitorDistance].every(v=>Number.isFinite(v)&&v>=0))finish(result);
     else if(result?.status==='unscored')finish(result);
     else finish({status:'unscored',reason:'invalid-evidence'});
    };
    // Clone reference buffers so cancellation cannot detach cached audio.
    worker.postMessage({id,plan,samples,target:a.samples,competitor:b.samples,voice:a.voice,
     ...(carrierAnchors?{carrierAnchors}:{}),
     ...(focused?{wordTarget:wa.samples,wordCompetitor:wb.samples}:{})},[samples.buffer]);
   });
  };
  try{return await Promise.race([work(),new Promise<ScoreResult>(resolve=>{
   deadline=setTimeout(()=>{this.cancel();resolve({status:'unscored',reason:'model-unavailable'});},30_000);
  })]);}
  catch(error){
   this.worker?.terminate();this.worker=undefined;
   return {status:'unscored',reason:generation!==this.generation?'cancelled':error instanceof Error&&error.message==='reference-unavailable'?'reference-unavailable':'model-unavailable'};
  }
  finally{clearTimeout(deadline);if(generation===this.generation)this.abort=undefined;}
 }
}
