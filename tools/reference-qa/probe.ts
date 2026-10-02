import {nativeAudio} from '../../src/native';
import {decodeRecording,resamplePCM} from '../../src/pcm';
import {assessmentPlan} from '../../src/scoring-profiles';
import {products,lessonById} from '../../src/curriculum';
import {pronunciationText} from '../../src/pronunciation-text';
import {referenceScore} from '../../src/reference-score';
import {ReferenceRuntime} from '../../src/reference-runtime';
import {acousticReference,referenceDistance} from '../../src/reference-features';
import {releaseTiming} from './aspiration';
import type {ScoreResult} from '../../src/scoring';
const output=document.getElementById('result')!;
declare const CLEARPAIR_ALL_COURSES:boolean;
declare const CLEARPAIR_QA_COURSE:string;
// Native console bridges truncate long messages. Keep each receipt below that
// limit; the full measured objects remain in the QA page, not app/user storage.
const compact=(score:ScoreResult)=>score.status==='matched'?{
 status:score.status,score:score.score,model:score.model,closestWord:score.closestWord,
 evidence:score.evidence,focusRegion:score.focus?.region,
}:score;
async function run(){
 const results:unknown[]=[];
 const tasks=products.flatMap(product=>{
  const spoken=product.lessons.filter(id=>assessmentPlan(product.id,id,0,0).mode==='contrast');
  return (CLEARPAIR_QA_COURSE?spoken.filter(id=>id===CLEARPAIR_QA_COURSE):CLEARPAIR_ALL_COURSES?spoken:spoken.slice(0,1)).map(lesson=>({product,lesson}));
 });
 console.log('CLEARPAIR_REFERENCE_BEGIN '+tasks.length);
 for(const {product,lesson} of tasks){
  const plan=assessmentPlan(product.id,lesson,0,0);if(plan.mode!=='contrast')throw Error('No plan');
  const reference=async(text:string)=>{
   const data=await nativeAudio.reference({id:crypto.randomUUID(),text,language:plan.profile.language});
   const pcm=await decodeRecording(new Blob([Uint8Array.from(atob(data.base64),c=>c.charCodeAt(0))],{type:data.mimeType}));
   return {samples:resamplePCM(pcm.samples,pcm.rate),voice:data.voice};
  };
  try{
   const a=await reference(plan.spokenPrompt),b=await reference(pronunciationText(plan.competitor,plan.profile.language));
   const correct=referenceScore({id:'correct',plan,samples:a.samples,target:a.samples,competitor:b.samples,voice:a.voice});
   const wrong=referenceScore({id:'wrong',plan,samples:b.samples,target:a.samples,competitor:b.samples,voice:a.voice});
   const reversePlan=assessmentPlan(product.id,lesson,0,1);
   if(reversePlan.mode!=='contrast')throw Error('Missing reverse plan');
   const reverseCorrect=referenceScore({id:'reverse-correct',plan:reversePlan,samples:b.samples,target:b.samples,competitor:a.samples,voice:b.voice});
   const reverseWrong=referenceScore({id:'reverse-wrong',plan:reversePlan,samples:a.samples,target:b.samples,competitor:a.samples,voice:b.voice});
   const silent=referenceScore({id:'silent',plan,samples:new Float32Array(16000),target:a.samples,competitor:b.samples,voice:a.voice});
   const again=await reference(plan.spokenPrompt);
   const repeated=referenceScore({id:'repeat',plan,samples:again.samples,target:a.samples,competitor:b.samples,voice:a.voice});
   const quietSamples=new Float32Array(a.samples.length+16000);
   quietSamples.set(a.samples.map(v=>v*.1),1600);
   const quiet=referenceScore({id:'quiet',plan,samples:quietSamples,target:a.samples,competitor:b.samples,voice:a.voice});
   const engine=new ReferenceRuntime(()=>new Worker('./reference-score.worker.js',{type:'module'}));
   const pipeline=await engine.assess(plan,a.samples.slice());engine.dispose();
   const featuresA=acousticReference(a.samples)!,featuresB=acousticReference(b.samples)!;
   const diagnostic=lesson==='yue-b-p'?{releaseA:releaseTiming(featuresA),releaseB:releaseTiming(featuresB),separation:referenceDistance(featuresA,featuresB),frames:[featuresA.frames.length,featuresB.frames.length]}:undefined;
   const row={app:product.id,lesson,language:lessonById(lesson).language,correct,wrong,reverseCorrect,reverseWrong,silent,repeated,quiet,pipeline,diagnostic,
    passed:correct.status==='matched'&&wrong.status==='matched'&&repeated.status==='matched'&&
     reverseCorrect.status==='matched'&&reverseWrong.status==='matched'&&
     correct.score>wrong.score+20&&reverseCorrect.score>reverseWrong.score+20&&
     repeated.score>wrong.score+20&&silent.status==='unscored'&&pipeline.status==='matched'&&
     pipeline.score>wrong.score+20&&quiet.status==='matched'&&quiet.score>wrong.score+20};
   results.push(row);console.log('CLEARPAIR_REFERENCE_ROW '+JSON.stringify({...row,
    correct:compact(correct),wrong:compact(wrong),reverseCorrect:compact(reverseCorrect),reverseWrong:compact(reverseWrong),
    silent:compact(silent),repeated:compact(repeated),quiet:compact(quiet),pipeline:compact(pipeline)}));
  }catch(e){const row={app:product.id,lesson,error:String(e),passed:false};results.push(row);console.log('CLEARPAIR_REFERENCE_ROW '+JSON.stringify(row));}
  output.textContent=JSON.stringify(results,null,2);
 }
 const receipt={scope:'Native device-voice synthesis and algorithm plumbing, not human pronunciation accuracy',results};
 console.log('CLEARPAIR_REFERENCE_COMPLETE '+JSON.stringify({total:results.length}));
 (window as unknown as {referenceQA:unknown}).referenceQA=receipt;
}
run().catch(e=>{output.textContent=String(e);console.log('CLEARPAIR_REFERENCE_ERROR '+String(e));});
