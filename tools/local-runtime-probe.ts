import type {LocalModel} from '../src/local-models';
declare global {interface Window {localProbe:(model:LocalModel,samples:number[])=>Promise<unknown>}}
// Research harness only: never imported by application entry points or registries.
window.localProbe=(model,samples)=>new Promise((resolve,reject)=>{
 const worker=new Worker(new URL('./local-runtime-probe.worker.ts',import.meta.url),{type:'module'});
 const timer=setTimeout(()=>{worker.terminate();reject(Error('WASM probe timed out'));},90_000);
 worker.onmessage=event=>{clearTimeout(timer);worker.terminate();
  event.data.error?reject(Error(event.data.error)):resolve(event.data);};
 worker.onerror=event=>{clearTimeout(timer);worker.terminate();reject(Error(event.message));};
 const input=Float32Array.from(samples);
 worker.postMessage({model,samples:input,base:location.origin+'/'},[input.buffer]);
});
