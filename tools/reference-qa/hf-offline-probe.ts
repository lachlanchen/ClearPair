import {nativeAudio} from '../../src/native';
import {decodeRecording,resamplePCM} from '../../src/pcm';
import {assessmentPlan} from '../../src/scoring-profiles';
import {lessonById} from '../../src/curriculum';
import {pronunciationText} from '../../src/pronunciation-text';
import {referenceScore} from '../../src/reference-score';
import {hfHybridScore} from '../../src/hf-word-score';
import {HfWordRuntime} from '../../src/hf-word-runtime';
import {analyze} from '../../src/analysis';
import {Capacitor} from '@capacitor/core';
const output=document.getElementById('result')!;
async function run(){
 const rows:unknown[]=[],engine=new HfWordRuntime();
 const wordSupported=Capacitor.getPlatform()!=='ios'||(await nativeAudio.offlineWordSupport()).supported;
 const reference=async(text:string,language:string)=>{
  const a=await nativeAudio.reference({id:crypto.randomUUID(),text,language});
  const p=await decodeRecording(new Blob([Uint8Array.from(atob(a.base64),c=>c.charCodeAt(0))],{type:a.mimeType}));
  return {samples:resamplePCM(p.samples,p.rate),voice:a.voice};
 };
 console.log('CLEARPAIR_REFERENCE_BEGIN 17 H&F offline worker/native references only');
 try{
  for(const lesson of ['hf-en','hf-zh','hf-final'])for(const [pair,words] of lessonById(lesson).pairs.entries()){
   try{
   const p=assessmentPlan('handf',lesson,pair,0);if(p.mode!=='contrast')throw Error('plan');
   const a=await reference(p.spokenPrompt,p.profile.language),b=await reference(pronunciationText(p.competitor,p.profile.language),p.profile.language);
   const assess=async(samples:Float32Array)=>{
    const word=lesson==='hf-final'?undefined:await engine.recognize(p.profile.language,samples,new URL('./',location.href).href);
    const acoustic=referenceScore({id:'native-qa',plan:p,samples,target:a.samples,competitor:b.samples,voice:a.voice});
    return {word,...(!word?{diagnostic:engine.lastError}:{}),score:hfHybridScore(p,word,acoustic,analyze(samples,16000))};
   };
   const correct=await assess(a.samples),wrong=await assess(b.samples),quiet=await assess(a.samples.map(v=>v*.08));
   const passed=correct.score.status==='matched'&&wrong.score.status==='matched'&&quiet.score.status==='matched'&&
    correct.score.score>wrong.score.score+20&&quiet.score.score>wrong.score.score+20&&
    (lesson==='hf-final'||(wordSupported?!!correct.word&&!!wrong.word&&!!quiet.word:!correct.word&&!wrong.word&&!quiet.word));
   const row={lesson,pair,words:words.map(w=>w.text),correct,wrong,quiet,passed};
   rows.push(row);output.textContent=JSON.stringify(rows,null,2);console.log('CLEARPAIR_REFERENCE_ROW '+JSON.stringify(row));
   }catch(error){const row={lesson,pair,passed:false,unavailable:String(error)};rows.push(row);console.log('CLEARPAIR_REFERENCE_ROW '+JSON.stringify(row));}
  }
  const p=assessmentPlan('handf','hf-en',0,0);if(p.mode!=='contrast')throw Error('plan');
  const a=await reference(p.spokenPrompt,p.profile.language),repeat=await engine.recognize('en-US',a.samples,new URL('./',location.href).href);
  const row={lesson:'repeat-after-language-switch',pair:0,wordSupported,passed:wordSupported?!!repeat:!repeat,recognition:repeat};rows.push(row);console.log('CLEARPAIR_REFERENCE_ROW '+JSON.stringify(row));
  const receipt={scope:'H & F native offline word-model/FFT plumbing and quiet/repeat regression; synthetic references, NOT human grade accuracy',wordSupported,results:rows};
  (window as unknown as {referenceQA:unknown}).referenceQA=receipt;console.log('CLEARPAIR_REFERENCE_DONE '+rows.length);
 }finally{engine.dispose();}
}
run().catch(error=>{output.textContent=String(error);console.log('CLEARPAIR_REFERENCE_ERROR '+String(error));});
