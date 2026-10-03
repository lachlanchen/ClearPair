import {nativeAudio} from '../../src/native';
import {decodeRecording,resamplePCM} from '../../src/pcm';
import {assessmentPlan} from '../../src/scoring-profiles';
import {productById,lessonById} from '../../src/curriculum';
import {pronunciationText} from '../../src/pronunciation-text';
import {referenceScore} from '../../src/reference-score';
import {pairHybridScore} from '../../src/pair-word-score';
import {PairWordRuntime} from '../../src/pair-word-runtime';
import {analyze} from '../../src/analysis';
import {carrierContext} from '../../src/carrier-context';
import type {AppId} from '../../src/types';
declare const CLEARPAIR_QA_COURSE:string;
declare const CLEARPAIR_QA_CAPTURE_REFERENCES:boolean;
declare const CLEARPAIR_QA_USE_FIXTURES:boolean;
declare const CLEARPAIR_QA_REFERENCE_ONLY:boolean;
declare const CLEARPAIR_QA_INCLUDE_SENTENCES:boolean;
const output=document.getElementById('result')!;
async function run(){
 const app=CLEARPAIR_QA_COURSE as AppId,product=productById(app),rows:unknown[]=[],engine=new PairWordRuntime();
 if(!['landr','english','chinese','japanese','korean','arabic','cantonese'].includes(app))throw Error('Unqualified word-model language');
 const emit=(row:unknown)=>{const index=rows.length;rows.push(row);output.textContent=JSON.stringify(rows,null,2);
  const bytes=new TextEncoder().encode(JSON.stringify(row)),encoded=btoa(String.fromCharCode(...bytes)),count=Math.ceil(encoded.length/400);
  for(let part=0;part<count;part++)console.log(`CLEARPAIR_REFERENCE_PART ${index} ${part} ${count} ${encoded.slice(part*400,(part+1)*400)} END`);};
 const references=new Map<string,Promise<{samples:Float32Array;voice:string}>>();
 const fixtures=CLEARPAIR_QA_USE_FIXTURES?await fetch('fixtures.json').then(r=>{if(!r.ok)throw Error('Missing private QA fixtures');return r.json();}):undefined;
 if(fixtures&&(fixtures.app!==app||fixtures.scope!=='Synthetic private QA only; not shipped voices or microphone evidence'))throw Error('Wrong QA fixture scope');
 const synthesize=async(text:string,language:string)=>{
  if(fixtures){
   const f=fixtures.references.find((f:{text:string;language:string})=>f.text===text&&f.language===language);
   if(!f||typeof f.voice!=='string'||typeof f.pcm16Base64!=='string')throw Error('Missing exact QA reference');
   const bytes=Uint8Array.from(atob(f.pcm16Base64),c=>c.charCodeAt(0)),view=new DataView(bytes.buffer);
   if(bytes.length<3200||bytes.length>432000||bytes.length%2)throw Error('Invalid QA PCM fixture');
   return {samples:Float32Array.from({length:bytes.length/2},(_,i)=>view.getInt16(i*2,true)/32767),voice:f.voice};
  }
  const a=await nativeAudio.reference({id:crypto.randomUUID(),text,language});
  const p=await decodeRecording(new Blob([Uint8Array.from(atob(a.base64),c=>c.charCodeAt(0))],{type:a.mimeType}));
  return {samples:resamplePCM(p.samples,p.rate),voice:a.voice};};
 const reference=(text:string,language:string)=>{
  const key=JSON.stringify([text,language]);if(!references.has(key))references.set(key,synthesize(text,language));
  return references.get(key)!;
 };
 const exportFixtures=async()=>{
  const recorded=[];
  for(const [key,pending] of references){
   const [text,language]=JSON.parse(key),{samples,voice}=await pending;
   const bytes=new Uint8Array(samples.length*2),view=new DataView(bytes.buffer);
   samples.forEach((v,i)=>view.setInt16(i*2,Math.max(-32767,Math.min(32767,Math.round(v*32767))),true));
   let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
   recorded.push({text,language,voice,pcm16Base64:btoa(binary)});
  }
  const json=JSON.stringify({app,scope:'Synthetic private QA only; not shipped voices or microphone evidence',references:recorded});
  const bytes=new TextEncoder().encode(json);let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
  const encoded=btoa(binary),count=Math.ceil(encoded.length/400);
  for(let part=0;part<count;part++)console.log(`CLEARPAIR_FIXTURE_PART ${part} ${count} ${encoded.slice(part*400,(part+1)*400)} END`);
 };
 try{
  if(CLEARPAIR_QA_REFERENCE_ONLY){
   for(const lesson of product.lessons)for(const [pair] of lessonById(lesson).pairs.entries())for(const sentence of CLEARPAIR_QA_INCLUDE_SENTENCES?[false,true]:[false])for(const side of [0,1] as const){
    const plan=assessmentPlan(app,lesson,pair,side,sentence);if(plan.mode!=='contrast')continue;
    const {samples,voice}=await reference(plan.spokenPrompt,plan.profile.language);
    if(sentence){
     const context=carrierContext(plan.target,plan.profile.language);if(!context)throw Error('Missing authored carrier');
     for(const text of [context.prefix,context.suffix])if(text)await reference(text,plan.profile.language);
    }
    emit({app,lesson:lesson+(sentence?'-carrier':''),pair,side,text:plan.spokenPrompt,language:plan.profile.language,voice,samples:samples.length,scope:'Synthetic reference capture only; no decoder/scoring qualification',passed:samples.length>=1600});
   }
   await exportFixtures();
   (window as unknown as {referenceQA:unknown}).referenceQA={scope:'Synthetic reference capture only; no decoder/scoring qualification',app,results:rows};
   output.dataset.complete=String(rows.length);console.log('CLEARPAIR_REFERENCE_DONE '+rows.length);return;
  }
  for(const lesson of product.lessons)for(const [pair,words] of lessonById(lesson).pairs.entries())for(const sentence of CLEARPAIR_QA_INCLUDE_SENTENCES?[false,true]:[false]){
   const plan=assessmentPlan(app,lesson,pair,0,sentence);if(plan.mode!=='contrast')continue;
   try{
    const a=await reference(plan.spokenPrompt,plan.profile.language),b=await reference(pronunciationText(plan.competitor,plan.profile.language,sentence),plan.profile.language);
    const wa=sentence?await reference(pronunciationText(plan.target,plan.profile.language),plan.profile.language):undefined;
    const wb=sentence?await reference(pronunciationText(plan.competitor,plan.profile.language),plan.profile.language):undefined;
    const context=async(word:typeof plan.target)=>{
     const parts=carrierContext(word,plan.profile.language);if(!parts)throw Error('Missing authored carrier');
     const prefix=parts.prefix?await reference(parts.prefix,plan.profile.language):undefined,suffix=parts.suffix?await reference(parts.suffix,plan.profile.language):undefined;
     return {...(prefix?{prefix:prefix.samples}:{}),...(suffix?{suffix:suffix.samples}:{})};
    };
    const anchors=sentence?{a:await context(plan.target),b:await context(plan.competitor)}:undefined;
    for(const side of [0,1] as const){
     const p=assessmentPlan(app,lesson,pair,side,sentence);if(p.mode!=='contrast')throw Error('plan');
     const target=side?b:a,other=side?a:b;
     const assess=async(samples:Float32Array)=>{
      const started=performance.now(),quality=analyze(samples,16000),word=await engine.recognize(p.profile.language,samples,new URL('./',location.href).href),wordMs=Math.round(performance.now()-started);
      const acoustic=referenceScore({id:'pair-qa',plan:p,samples,target:target.samples,competitor:other.samples,voice:target.voice,
       ...(sentence?{wordTarget:(side?wb:wa)!.samples,wordCompetitor:(side?wa:wb)!.samples,
        carrierAnchors:{target:(side?anchors!.b:anchors!.a),competitor:(side?anchors!.a:anchors!.b)}}:{})});
      return {word,wordMs,totalMs:Math.round(performance.now()-started),acoustic,score:pairHybridScore(p,word,acoustic,quality),...(!word?{diagnostic:engine.lastError}:{}),quality:quality.status};};
     const correct=await assess(target.samples),wrong=await assess(other.samples),quiet=await assess(target.samples.map(v=>v*.08));
     emit({app,lesson:lesson+(sentence?'-carrier':''),pair,side,words:words.map(w=>w.text),correct,wrong,quiet,
      passed:!!correct.word&&!!wrong.word&&correct.score.status==='matched'&&wrong.score.status==='matched'&&quiet.score.status==='matched'&&correct.score.score>wrong.score.score+20&&quiet.score.score>wrong.score.score+20});
    }
   }catch(error){emit({app,lesson:lesson+(sentence?'-carrier':''),pair,passed:false,error:String(error)});}
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
  if(CLEARPAIR_QA_CAPTURE_REFERENCES)await exportFixtures();
  (window as unknown as {referenceQA:unknown}).referenceQA={scope:'Native saved-PCM/model plumbing with synthetic voices, not human pronunciation accuracy',app,results:rows};
  output.dataset.complete=String(rows.length);console.log('CLEARPAIR_REFERENCE_DONE '+rows.length);
 }finally{engine.dispose();}
}
run().catch(error=>{output.textContent=String(error);output.dataset.error=String(error);console.log('CLEARPAIR_REFERENCE_ERROR '+String(error));});
