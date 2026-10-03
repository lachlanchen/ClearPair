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
import type {HfWordEvidence} from '../../src/hf-word-score';
const output=document.getElementById('result')!;
async function run(){
 const rows:unknown[]=[],engine=new HfWordRuntime();
 const emitRow=(row:unknown)=>{
  const index=rows.length;rows.push(row);
  output.textContent=JSON.stringify(rows,null,2);
  // Keep each console write below PIPE_BUF. Apple diagnostic stderr can
  // interleave with long JSON writes; split UTF-8 receipts into atomic chunks.
  const bytes=new TextEncoder().encode(JSON.stringify(row));
  const encoded=btoa(String.fromCharCode(...bytes));
  const count=Math.ceil(encoded.length/400);
  for(let part=0;part<count;part++)console.log(`CLEARPAIR_REFERENCE_PART ${index} ${part} ${count} ${encoded.slice(part*400,(part+1)*400)} END`);
 };
 // A native Apple decoder can work on older iOS even when WASM is disabled.
 const wordSupported=Capacitor.getPlatform()==='ios'?'native-offline-requested':true;
 const reference=async(text:string,language:string)=>{
  const a=await nativeAudio.reference({id:crypto.randomUUID(),text,language});
  const p=await decodeRecording(new Blob([Uint8Array.from(atob(a.base64),c=>c.charCodeAt(0))],{type:a.mimeType}));
  return {samples:resamplePCM(p.samples,p.rate),voice:a.voice};
 };
 const native=(word:HfWordEvidence|undefined)=>!!word&&word.final===true&&/^(apple-on-device-words|hf-vosk-native):v1\//.test(word.engine);
 console.log('CLEARPAIR_REFERENCE_BEGIN 47 H&F offline saved-PCM regressions only');
 try{
  for(const lesson of ['hf-en','hf-zh','hf-final'])for(const [pair,words] of lessonById(lesson).pairs.entries()){
   try{
   const first=assessmentPlan('handf',lesson,pair,0);if(first.mode!=='contrast')throw Error('plan');
   const a=await reference(first.spokenPrompt,first.profile.language),b=await reference(pronunciationText(first.competitor,first.profile.language),first.profile.language);
   for(const side of [0,1] as const){
   const p=assessmentPlan('handf',lesson,pair,side);if(p.mode!=='contrast')throw Error('plan');
   const target=side===0?a:b,competitor=side===0?b:a;
   const assess=async(samples:Float32Array)=>{
    const quality=analyze(samples,16000);
    if(!['clear','quiet'].includes(quality.status))return {score:{status:'unscored' as const,reason:'poor-signal' as const}};
    const word=lesson==='hf-final'?undefined:await engine.recognize(p.profile.language,samples,new URL('./',location.href).href);
    const acoustic=referenceScore({id:'native-qa',plan:p,samples,target:target.samples,competitor:competitor.samples,voice:target.voice});
    return {word,...(!word?{diagnostic:engine.lastError,nativeDiagnostic:engine.nativeError}:{}),score:hfHybridScore(p,word,acoustic,quality)};
   };
   const correct=await assess(target.samples),wrong=await assess(competitor.samples),quiet=await assess(target.samples.map(v=>v*.08));
   const passed=correct.score.status==='matched'&&wrong.score.status==='matched'&&quiet.score.status==='matched'&&
    correct.score.score>wrong.score.score+20&&quiet.score.score>wrong.score.score+20&&
    (lesson==='hf-final'||(!!correct.word&&!!wrong.word&&!!quiet.word&&
     (Capacitor.getPlatform()!=='ios'||[correct,wrong,quiet].every(r=>native(r.word)))));
   const row={lesson,pair,side,words:words.map(w=>w.text),correct,wrong,quiet,passed};
   emitRow(row);
   }
   }catch(error){emitRow({lesson,pair,passed:false,unavailable:String(error)});}
  }
  const p=assessmentPlan('handf','hf-en',0,0);if(p.mode!=='contrast')throw Error('plan');
  const a=await reference(p.spokenPrompt,p.profile.language),repeat=await engine.recognize('en-US',a.samples,new URL('./',location.href).href);
  emitRow({lesson:'repeat-after-language-switch',pair:0,wordSupported,passed:wordSupported?!!repeat:!repeat,recognition:repeat});
  const f=await reference('fat','en-US');
  for(let cycle=0;cycle<12;cycle++){
   if(cycle===4)engine.cancel();if(cycle===8)engine.dispose();
   const side=cycle%2?1:0,plan=assessmentPlan('handf','hf-en',0,side);if(plan.mode!=='contrast')throw Error('plan');
   const target=side?f:a,other=side?a:f;
   const word=await engine.recognize('en-US',target.samples,new URL('./',location.href).href);
   const acoustic=referenceScore({id:'repeat-'+cycle,plan,samples:target.samples,target:target.samples,competitor:other.samples,voice:target.voice});
   const score=hfHybridScore(plan,word,acoustic,analyze(target.samples,16000));
   const row={lesson:'repeated-hat-fat-cycle',pair:cycle,side,recognition:word,score,
    passed:!!word&&(Capacitor.getPlatform()!=='ios'||native(word))&&score.status==='matched'&&score.score>=65};
   emitRow(row);
  }
  const silent=new Float32Array(6400),silentQuality=analyze(silent,16000);
  emitRow({lesson:'silence-control',passed:!['clear','quiet'].includes(silentQuality.status),quality:silentQuality.status});
  const other=await reference('banana','en-US'),words=await engine.recognize('en-US',other.samples,new URL('./',location.href).href);
  const sound=referenceScore({id:'unrelated',plan:p,samples:other.samples,target:a.samples,competitor:(await reference('fat','en-US')).samples,voice:a.voice});
  const score=hfHybridScore(p,words,sound,analyze(other.samples,16000));
  emitRow({lesson:'unrelated-word-control',passed:score.status==='unscored'||score.score<=45,recognition:words,score});
  const receipt={scope:'H & F native offline word-model/FFT plumbing and quiet/repeat regression; synthetic references, NOT human grade accuracy',wordSupported,results:rows};
  (window as unknown as {referenceQA:unknown}).referenceQA=receipt;
  output.textContent=JSON.stringify(receipt,null,2);output.dataset.complete=String(rows.length);
  console.log('CLEARPAIR_REFERENCE_DONE '+rows.length);
 }finally{engine.dispose();}
}
run().catch(error=>{output.textContent=String(error);console.log('CLEARPAIR_REFERENCE_ERROR '+String(error));});
