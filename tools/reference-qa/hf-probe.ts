import {nativeAudio} from '../../src/native';
import {decodeRecording,resamplePCM} from '../../src/pcm';
import {assessmentPlan} from '../../src/scoring-profiles';
import {lessonById} from '../../src/curriculum';
import {pronunciationText} from '../../src/pronunciation-text';
import {referenceScore} from '../../src/reference-score';
import {acousticReference,locateReference,referenceSlice} from '../../src/reference-features';
import {fricativeSegment} from '../../src/hf-score';
import {ReferenceRuntime} from '../../src/reference-runtime';
const output=document.getElementById('result')!;
async function run(){
 const results:unknown[]=[];
 for(const id of ['hf-en','hf-zh','hf-final']){
  const lesson=lessonById(id);
  for(let pair=0;pair<lesson.pairs.length;pair++){
   const plan=assessmentPlan('handf',id,pair,0);if(plan.mode!=='contrast')throw Error('plan');
   const reference=async(text:string)=>{
    const data=await nativeAudio.reference({id:crypto.randomUUID(),text,language:lesson.language});
    const pcm=await decodeRecording(new Blob([Uint8Array.from(atob(data.base64),c=>c.charCodeAt(0))],{type:data.mimeType}));
    return {samples:resamplePCM(pcm.samples,pcm.rate),voice:data.voice};
   };
   try{
    const a=await reference(plan.spokenPrompt),b=await reference(pronunciationText(plan.competitor,lesson.language));
    const correct=referenceScore({id:'a',plan,samples:a.samples,target:a.samples,competitor:b.samples,voice:a.voice});
    const wrong=referenceScore({id:'b',plan,samples:b.samples,target:a.samples,competitor:b.samples,voice:a.voice});
    const reverse=assessmentPlan('handf',id,pair,1);if(reverse.mode!=='contrast')throw Error('reverse');
    const other=referenceScore({id:'c',plan:reverse,samples:b.samples,target:b.samples,competitor:a.samples,voice:a.voice});
    let sentence:unknown;
    if(pair===0){
     const sp=assessmentPlan('handf',id,pair,0,true);if(sp.mode!=='contrast')throw Error('sentence');
     const sa=await reference(sp.spokenPrompt),sb=await reference(pronunciationText(sp.competitor,lesson.language,true));
     const score=(samples:Float32Array)=>referenceScore({id:'sentence',plan:sp,samples,target:sa.samples,competitor:sb.samples,voice:sa.voice,
      wordTarget:a.samples,wordCompetitor:b.samples});
     const correct=score(sa.samples),wrong=score(sb.samples);
     const engine=new ReferenceRuntime(()=>new Worker('./reference-score.worker.js',{type:'module'}));
     const pipeline=await engine.assess(sp,sa.samples.slice());engine.dispose();
     const passed=correct.status==='matched'&&wrong.status==='matched'&&
      pipeline.status==='matched'&&correct.score>wrong.score+20&&!!pipeline.hf;
     const diagnostic=(samples:Float32Array)=>{
      const take=acousticReference(samples)!,target=acousticReference(a.samples)!,competitor=acousticReference(b.samples)!;
      const prompt=sp.spokenPrompt.replace(/[^\p{Letter}]/gu,''),position=prompt.indexOf(sp.target.text);
      const earliest=id==='hf-zh'&&position>=0?Math.floor(take.frames.length*Math.max(0,position/prompt.length-.3)):0;
      const matches=[locateReference(take,target,earliest),locateReference(take,competitor,earliest)];
      return {frames:take.frames.length,earliest,matches,acoustic:{take,target,competitor},segments:matches.map(m=>{
       if(!m)return null;const s=referenceSlice(take,Math.max(0,m.from-2),Math.min(take.frames.length,m.to+2)),f=fricativeSegment(s,id==='hf-final');
       return {from:f?.from,to:f?.to,energy:s.energy.map(v=>Math.round(v*10000)/10000),voiced:s.pitch.map((v,i)=>v!==null?i:-1).filter(i=>i>=0)};
      })};
     };
     sentence={correct,wrong,pipeline,passed,...(!passed?{diagnostics:[diagnostic(sa.samples),diagnostic(sb.samples)]}:{})};
    }
    const diagnostic=(samples:Float32Array)=>{const s=acousticReference(samples)!;return {n:s.frames.length,
     voiced:s.pitch.map((v,i)=>v!==null?i:-1).filter(i=>i>=0),energy:s.energy.map(v=>Math.round(v*10000)/10000),segment:fricativeSegment(s,id==='hf-final')};};
    const row={lesson:id,pair,words:lesson.pairs[pair].map(w=>w.text),correct,wrong,other,
     ...(sentence?{sentence}:{}),
     ...(correct.status!=='matched'?{diagnostics:[diagnostic(a.samples),diagnostic(b.samples)]}:{}),
     passed:correct.status==='matched'&&wrong.status==='matched'&&other.status==='matched'&&
      correct.score>wrong.score+30&&other.score>75&&!!correct.hf};
    results.push(row);console.log('CLEARPAIR_REFERENCE_ROW '+JSON.stringify(row));
   }catch(error){const row={lesson:id,pair,error:String(error),passed:false};results.push(row);console.log('CLEARPAIR_REFERENCE_ROW '+JSON.stringify(row));}
   output.textContent=JSON.stringify(results,null,2);
  }
 }
 const receipt={scope:'H & F native silent references and segmented FFT comparison; engineering validation',results};
 (window as unknown as {referenceQA:unknown}).referenceQA=receipt;
 console.log('CLEARPAIR_REFERENCE_DONE '+results.length);
}
run().catch(error=>{output.textContent=String(error);console.log('CLEARPAIR_REFERENCE_ERROR '+String(error));});
