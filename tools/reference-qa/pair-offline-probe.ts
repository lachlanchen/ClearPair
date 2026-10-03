import {nativeAudio} from '../../src/native';
import {decodeRecording,resamplePCM} from '../../src/pcm';
import {assessmentPlan} from '../../src/scoring-profiles';
import {productById,lessonById} from '../../src/curriculum';
import {pronunciationText} from '../../src/pronunciation-text';
import {referenceScore} from '../../src/reference-score';
import {pairHybridScore} from '../../src/pair-word-score';
import {PairWordRuntime} from '../../src/pair-word-runtime';
import {analyze} from '../../src/analysis';
import type {AppId} from '../../src/types';
declare const CLEARPAIR_QA_COURSE:string;
const output=document.getElementById('result')!;
async function run(){
 const app=CLEARPAIR_QA_COURSE as AppId,product=productById(app),rows:unknown[]=[],engine=new PairWordRuntime();
 if(!['landr','english','chinese','japanese','korean','arabic'].includes(app))throw Error('Unqualified word-model language');
 const emit=(row:unknown)=>{const index=rows.length;rows.push(row);output.textContent=JSON.stringify(rows,null,2);
  const bytes=new TextEncoder().encode(JSON.stringify(row)),encoded=btoa(String.fromCharCode(...bytes)),count=Math.ceil(encoded.length/400);
  for(let part=0;part<count;part++)console.log(`CLEARPAIR_REFERENCE_PART ${index} ${part} ${count} ${encoded.slice(part*400,(part+1)*400)} END`);};
 const reference=async(text:string,language:string)=>{
  const a=await nativeAudio.reference({id:crypto.randomUUID(),text,language});
  const p=await decodeRecording(new Blob([Uint8Array.from(atob(a.base64),c=>c.charCodeAt(0))],{type:a.mimeType}));
  return {samples:resamplePCM(p.samples,p.rate),voice:a.voice};};
 try{
  for(const lesson of product.lessons)for(const [pair,words] of lessonById(lesson).pairs.entries()){
   const plan=assessmentPlan(app,lesson,pair,0);if(plan.mode!=='contrast')continue;
   try{
    const a=await reference(plan.spokenPrompt,plan.profile.language),b=await reference(pronunciationText(plan.competitor,plan.profile.language),plan.profile.language);
    for(const side of [0,1] as const){
     const p=assessmentPlan(app,lesson,pair,side);if(p.mode!=='contrast')throw Error('plan');
     const target=side?b:a,other=side?a:b;
     const assess=async(samples:Float32Array)=>{
      const started=performance.now(),quality=analyze(samples,16000),word=await engine.recognize(p.profile.language,samples,new URL('./',location.href).href),wordMs=Math.round(performance.now()-started);
      const acoustic=referenceScore({id:'pair-qa',plan:p,samples,target:target.samples,competitor:other.samples,voice:target.voice});
      return {word,wordMs,totalMs:Math.round(performance.now()-started),acoustic,score:pairHybridScore(p,word,acoustic,quality),...(!word?{diagnostic:engine.lastError}:{}),quality:quality.status};};
     const correct=await assess(target.samples),wrong=await assess(other.samples),quiet=await assess(target.samples.map(v=>v*.08));
     emit({app,lesson,pair,side,words:words.map(w=>w.text),correct,wrong,quiet,
      passed:!!correct.word&&!!wrong.word&&correct.score.status==='matched'&&wrong.score.status==='matched'&&quiet.score.status==='matched'&&correct.score.score>wrong.score.score+20&&quiet.score.score>wrong.score.score+20});
    }
   }catch(error){emit({app,lesson,pair,passed:false,error:String(error)});}
  }
  const first=product.lessons[0],plan=assessmentPlan(app,first,0,0);if(plan.mode!=='contrast')throw Error('plan');
  const a=await reference(plan.spokenPrompt,plan.profile.language),b=await reference(pronunciationText(plan.competitor,plan.profile.language),plan.profile.language);
  for(let i=0;i<12;i++){
   if(i===4)engine.cancel();if(i===8)engine.dispose();
   const side=i%2?1:0,p=assessmentPlan(app,first,0,side);if(p.mode!=='contrast')throw Error('plan');
   const samples=side?b.samples:a.samples,word=await engine.recognize(plan.profile.language,samples,new URL('./',location.href).href);
   emit({app,lesson:'repeat-cancel-dispose',cycle:i,recognition:word,passed:!!word});
  }
  const silence=await engine.recognize(plan.profile.language,new Float32Array(6400),new URL('./',location.href).href);
  emit({app,lesson:'silence-control',passed:!silence?.text.trim(),recognition:silence});
  (window as unknown as {referenceQA:unknown}).referenceQA={scope:'Native saved-PCM/model plumbing with synthetic voices, not human pronunciation accuracy',app,results:rows};
  output.dataset.complete=String(rows.length);console.log('CLEARPAIR_REFERENCE_DONE '+rows.length);
 }finally{engine.dispose();}
}
run().catch(error=>{output.textContent=String(error);console.log('CLEARPAIR_REFERENCE_ERROR '+String(error));});
