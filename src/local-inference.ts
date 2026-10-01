import * as ort from 'onnxruntime-web/wasm';
import wasmUrl from 'onnxruntime-web/ort-wasm-simd-threaded.wasm?url';
import wasmModuleUrl from 'onnxruntime-web/ort-wasm-simd-threaded.mjs?url';
import { logSumExp } from './scoring';
import type { LocalModel } from './local-models';
// One CPU worker works without SharedArrayBuffer, cross-origin isolation or
// WebGPU. Runtime binaries are bundled, never fetched from a CDN.
ort.env.wasm.numThreads=1;
ort.env.wasm.proxy=false;
ort.env.wasm.wasmPaths={wasm:wasmUrl,mjs:wasmModuleUrl};
export async function verifiedModelBytes(model:LocalModel,base:string):Promise<Uint8Array>{
  if(!/^models\/[a-zA-Z0-9_-]+\.onnx$/.test(model.asset))throw Error('Model must be a packaged local asset');
  const root=new URL(base),url=new URL(model.asset,root);
  if(url.origin!==root.origin||!url.pathname.startsWith(root.pathname))throw Error('Remote inference assets are not allowed');
  const response=await fetch(url,{credentials:'omit',redirect:'error',cache:'force-cache'});
  if(!response.ok)throw Error('Packaged model is missing');
  const bytes=new Uint8Array(await response.arrayBuffer());
  if(bytes.byteLength!==model.bytes)throw Error('Model size mismatch');
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
  if(digest!==model.sha256)throw Error('Model integrity check failed');
  return bytes;
}
export async function createLocalSession(bytes:Uint8Array){
  return ort.InferenceSession.create(bytes,{executionProviders:['wasm'],executionMode:'sequential',graphOptimizationLevel:'all'});
}
export async function inferLocal(session:ort.InferenceSession,model:LocalModel,samples:Float32Array){
  if(samples.length<320||samples.length>216000||samples.some(v=>!Number.isFinite(v)))throw Error('Invalid model input');
  // Match the pinned wav2vec-style preprocessing; never use normalization to
  // turn silence into speech. Quality gating uses the original PCM beforehand.
  const mean=samples.reduce((s,v)=>s+v,0)/samples.length;
  const variance=samples.reduce((s,v)=>s+(v-mean)**2,0)/samples.length;
  const values=Float32Array.from(samples,v=>(v-mean)/Math.sqrt(variance+1e-7));
  const input=new ort.Tensor('float32',values,[1,values.length]);
  // A warm session can score many takes. Release each take's tensors even when
  // run/shape validation fails; only detached JS numbers leave this function.
  let outputs:Record<string,ort.Tensor>={};
  try{
  outputs=await session.run({[model.input]:input});
  const logits=outputs[model.logitsOutput];
  if(!logits||logits.type!=='float32'||logits.dims.length!==3||logits.dims[0]!==1||
    logits.dims[1]<1||logits.dims[1]>1000||logits.dims[2]!==model.vocabulary)throw Error('Invalid phonetic encoder output');
  const data=logits.data as Float32Array;
  const frames=Array.from({length:logits.dims[1]},(_,t)=>{
    const row=Array.from(data.subarray(t*model.vocabulary,(t+1)*model.vocabulary));
    if(row.some(v=>!Number.isFinite(v)))throw Error('Invalid encoder logits');
    const normalization=logSumExp(row);return row.map(v=>v-normalization);
  });
  const features:Record<string,number[]>={};
  if(model.featureNames.length){
    const vector=model.featuresOutput?outputs[model.featuresOutput]:undefined;
    if(!vector||vector.type!=='float32'||vector.dims.length!==3||vector.dims[0]!==1||
      vector.dims[1]!==frames.length||vector.dims[2]!==model.featureNames.length)throw Error('Missing aligned trained acoustic heads');
    model.featureNames.forEach((key,i)=>{
      features[key]=Array.from({length:frames.length},(_,frame)=>{
        const value=Number(vector.data[frame*model.featureNames.length+i]);
        if(!Number.isFinite(value))throw Error('Invalid acoustic feature');return value;
      });
    });
  }
  return {frames,features};
  }finally{
    // Some graphs alias outputs. Dispose each resource once and attempt every
    // release even if one fails; the worker retires a failed inference session.
    let releaseError:unknown;
    for(const tensor of new Set([input,...Object.values(outputs)])){
      try{tensor.dispose();}catch(error){releaseError??=error;}
    }
    if(releaseError)throw releaseError;
  }
}
