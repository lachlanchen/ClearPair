import {nativeAudio} from '../../src/native';
import {decodeRecording,resamplePCM} from '../../src/pcm';
import {assessmentPlan} from '../../src/scoring-profiles';
import {products,lessonById} from '../../src/curriculum';
import {pronunciationText} from '../../src/pronunciation-text';
import {referenceScore} from '../../src/reference-score';
import {ReferenceRuntime} from '../../src/reference-runtime';
const output=document.getElementById('result')!;
async function run(){
 const results:unknown[]=[];
 for(const product of products){
  const lesson=product.lessons.find(id=>assessmentPlan(product.id,id,0,0).mode==='contrast')!;
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
   const silent=referenceScore({id:'silent',plan,samples:new Float32Array(16000),target:a.samples,competitor:b.samples,voice:a.voice});
   const again=await reference(plan.spokenPrompt);
   const repeated=referenceScore({id:'repeat',plan,samples:again.samples,target:a.samples,competitor:b.samples,voice:a.voice});
   const engine=new ReferenceRuntime(()=>new Worker('./reference-score.worker.js',{type:'module'}));
   const pipeline=await engine.assess(plan,a.samples.slice());engine.dispose();
   const row={app:product.id,language:lessonById(lesson).language,correct,wrong,silent,repeated,pipeline,
    passed:correct.status==='matched'&&wrong.status==='matched'&&repeated.status==='matched'&&
     correct.score>wrong.score+20&&silent.status==='unscored'&&pipeline.status==='matched'};
   results.push(row);console.log('CLEARPAIR_REFERENCE_ROW '+JSON.stringify(row));
  }catch(e){const row={app:product.id,error:String(e),passed:false};results.push(row);console.log('CLEARPAIR_REFERENCE_ROW '+JSON.stringify(row));}
  output.textContent=JSON.stringify(results,null,2);
 }
 const receipt={scope:'Native device-voice synthesis and algorithm plumbing, not human pronunciation accuracy',results};
 console.log('CLEARPAIR_REFERENCE_RESULT '+JSON.stringify(receipt));
 (window as unknown as {referenceQA:unknown}).referenceQA=receipt;
}
run().catch(e=>{output.textContent=String(e);console.log('CLEARPAIR_REFERENCE_ERROR '+String(e));});
