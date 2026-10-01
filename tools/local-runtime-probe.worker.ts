import {createLocalSession,verifiedModelBytes,inferLocal} from '../src/local-inference';
import type {LocalModel} from '../src/local-models';
onmessage=async(event:MessageEvent<{model:LocalModel;samples:Float32Array;base:string;repetitions?:number}>)=>{
 const {model,samples,base,repetitions=1}=event.data;let session:Awaited<ReturnType<typeof createLocalSession>>|undefined;
 let reply:unknown;
 const started=performance.now();
 try{
  if(!Number.isSafeInteger(repetitions)||repetitions<1||repetitions>10)throw Error('Invalid repetition count');
  const bytes=await verifiedModelBytes(model,base),verifiedAt=performance.now();
  session=await createLocalSession(bytes);const loadedAt=performance.now();
  let frames:number[][]|undefined,maximumRepeatDifference=0;
  const inferenceTrialsMs:number[]=[];
  for(let i=0;i<repetitions;i++){
   const before=performance.now(),actual=await inferLocal(session,model,samples);
   inferenceTrialsMs.push(performance.now()-before);
   if(frames){
    if(frames.length!==actual.frames.length)throw Error('Repeated shape changed');
    for(let t=0;t<frames.length;t++)for(let p=0;p<model.vocabulary;p++)
     maximumRepeatDifference=Math.max(maximumRepeatDifference,Math.abs(frames[t][p]-actual.frames[t][p]));
   }else frames=actual.frames;
  }
  reply={frames,verifiedMs:verifiedAt-started,loadMs:loadedAt-verifiedAt,inferMs:inferenceTrialsMs[0],
   inferenceTrialsMs,maximumRepeatDifference,repetitions};
 }catch(error){reply={error:error instanceof Error?error.message:String(error)};}
 finally{
  try{await session?.release();}catch(error){reply={error:error instanceof Error?error.message:String(error)};}
 }
 postMessage(reply);
};
