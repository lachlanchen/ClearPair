import {createLocalSession,verifiedModelBytes,inferLocal} from '../src/local-inference';
import type {LocalModel} from '../src/local-models';
onmessage=async(event:MessageEvent<{model:LocalModel;samples:Float32Array;base:string}>)=>{
 const {model,samples,base}=event.data;let session:Awaited<ReturnType<typeof createLocalSession>>|undefined;
 const started=performance.now();
 try{
  const bytes=await verifiedModelBytes(model,base),verifiedAt=performance.now();
  session=await createLocalSession(bytes);const loadedAt=performance.now();
  const {frames}=await inferLocal(session,model,samples);
  postMessage({frames,verifiedMs:verifiedAt-started,loadMs:loadedAt-verifiedAt,inferMs:performance.now()-loadedAt});
 }catch(error){postMessage({error:error instanceof Error?error.message:String(error)});}
 finally{await session?.release();}
};
