import type {Model,KaldiRecognizer} from 'vosk-browser/dist/model';
import manifest from '../models/hf-words.json';
import type {HfWordEvidence} from './hf-word-score';
import {Capacitor} from '@capacitor/core';
import {nativeAudio} from './native';
type ModelFactory=(url:string,signal?:AbortSignal)=>Promise<Model>;
/** H & F only, exact saved PCM, unrestricted decoder. iOS uses native offline
 * Apple Speech first. No second microphone, cloud fallback or target hints. */
export class HfWordRuntime {
 /** Diagnostic for the private native test helper; never audio/text contents. */
 lastError?:string;
 nativeError?:string;
 private model?:Model;
 private language?:string;
 private loading?:Promise<Model>;
 private loadAbort?:AbortController;
 private generation=0;
 private abort?:()=>void;
 private recognizer?:KaldiRecognizer;
 private nativeId?:string;
 constructor(private create:ModelFactory=async (url,signal)=>{
  // Do not even import/initialize WASM on an unqualified older iOS runtime.
  // Its failure is a compatibility fallback, never a failed microphone take.
  if(Capacitor.getPlatform()==='ios'&&!(await nativeAudio.offlineWordSupport()).supported)
   throw Error('Offline word decoder not qualified for this iOS version');
  const {Model}=await import('vosk-browser');
  if(signal?.aborted)throw Error('Cancelled');
  const model=new Model(url,-2);
  // Pinned vosk-browser 0.0.8 queues terminate behind inference and cannot
  // terminate a failed/incomplete load. Close its OWN dedicated worker as well,
  // so timeout/background/language-switch never leaves an orphan decoder.
  const worker=(model as unknown as {worker:Worker}).worker;
  let closed=false;
  model.terminate=()=>{if(closed)return;closed=true;worker.terminate();};
  return await new Promise<Model>((resolve,reject)=>{
   let done=false;
   const aborted=()=>finish(false);
   const finish=(success:boolean,reason='Offline word model unavailable')=>{if(done)return;done=true;clearTimeout(timer);signal?.removeEventListener('abort',aborted);
    if(success)resolve(model);else{model.terminate();reject(Error(reason));}};
   const timer=setTimeout(()=>finish(false),20_000);
   signal?.addEventListener('abort',aborted,{once:true});
   model.on('load',message=>finish(message.event==='load'&&message.result));
   model.on('error',message=>finish(false,message.event==='error'?message.error:'Offline word model unavailable'));
   worker.addEventListener('error',event=>finish(false,event.message||'Offline decoder worker failed'),{once:true});
  });
 }){}
 cancel(){this.generation++;this.abort?.();this.abort=undefined;this.recognizer?.remove();this.recognizer=undefined;
  const nativeId=this.nativeId;this.nativeId=undefined;
  if(nativeId)void nativeAudio.cancelWords({id:nativeId}).catch(()=>{});
  this.loadAbort?.abort();this.loadAbort=undefined;this.loading=undefined;}
 dispose(){this.cancel();this.model?.terminate();this.model=undefined;this.language=undefined;
  if(Capacitor.getPlatform()==='ios')void nativeAudio.releaseWords().catch(()=>{});
  // A cancelled load may finish later; never retain its model after dispose.
  const pending=this.loading;this.loading=undefined;void pending?.then(m=>m.terminate()).catch(()=>{});}
 async recognize(language:string,samples:Float32Array,base:string):Promise<HfWordEvidence|undefined>{
  this.cancel();this.lastError=undefined;this.nativeError=undefined;
  const pin=manifest.models.find(m=>m.language===language);
  if(!pin||samples.length<1600||samples.length>216000||samples.some(v=>!Number.isFinite(v)||Math.abs(v)>1.01))return undefined;
  let attempt:Promise<Model>|undefined;
  if(Capacitor.getPlatform()==='ios'){
   const token=this.generation,id=crypto.randomUUID();this.nativeId=id;
   let timer:ReturnType<typeof setTimeout>|undefined;
   try{
    const bytes=new Uint8Array(samples.length*2),view=new DataView(bytes.buffer);
    for(let i=0;i<samples.length;i++)view.setInt16(i*2,Math.max(-32767,Math.min(32767,Math.round(samples[i]*32767))),true);
    let binary='';for(let at=0;at<bytes.length;at+=8192)binary+=String.fromCharCode(...bytes.subarray(at,at+8192));
    const native=await Promise.race([nativeAudio.recognizeWords({id,language,pcm16Base64:btoa(binary)}),
     new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(Error('Native offline words timed out')),31_000);})]);
    if(token!==this.generation)return undefined;
    if(![`apple-on-device-words:v1/${language}`,`hf-vosk-native:v1/${language}`].includes(native.engine)||native.final!==true)throw Error('Invalid native word provenance');
    return native;
   }catch(error){
    if(token!==this.generation)return undefined;
    this.nativeError=error instanceof Error?error.message.slice(0,200):'Native offline words unavailable';
    this.lastError=this.nativeError;
    // Older iOS still never initializes the unqualified WASM decoder.
   }finally{
    clearTimeout(timer);if(this.nativeId===id){this.nativeId=undefined;void nativeAudio.cancelWords({id}).catch(()=>{});}
   }
  }
  try{
   if(this.language!==language){this.dispose();this.language=language;}
   // Switching language disposes the old worker; keep only one model in RAM.
   const token=this.generation;
   if(!this.model){
    if(!this.loading){this.loadAbort=new AbortController();this.loading=this.create(new URL(pin.asset,base).href,this.loadAbort.signal);}
    const pending=this.loading;attempt=pending;const model=await pending;
    if(this.loading!==pending||this.language!==language){model.terminate();return undefined;}
    this.model=model;this.loading=undefined;this.loadAbort=undefined;
   }
   if(token!==this.generation)return undefined;
   return await new Promise<HfWordEvidence|undefined>(resolve=>{
    const recognizer=new this.model!.KaldiRecognizer(16000);this.recognizer=recognizer;
    let done=false,finalRequested=false;
    const parts:HfWordEvidence[]=[];
    const finish=(e?:HfWordEvidence)=>{if(done)return;done=true;clearTimeout(timer);recognizer.remove();
     if(this.recognizer===recognizer)this.recognizer=undefined;
     if(this.abort===abort)this.abort=undefined;resolve(e);};
    const abort=()=>finish();this.abort=abort;
    const failed=()=>{finish();if(this.model===model){this.model?.terminate();this.model=undefined;}};
    const timer=setTimeout(failed,15_000);
    const final=()=>{if(!finalRequested){finalRequested=true;recognizer.retrieveFinalResult();}};
    const model=this.model;
    recognizer.on('error',failed);
    recognizer.on('partialresult',()=>final());
    recognizer.on('result',message=>{
     if(done||token!==this.generation||message.event!=='result')return;
     const r=message.result;
     if(r.text)parts.push({engine:manifest.version+'/'+language,text:r.text,words:r.result??[]});
     if(!finalRequested){final();return;}
     finish({engine:manifest.version+'/'+language,text:parts.map(p=>p.text).join(' ').trim(),words:parts.flatMap(p=>p.words)});
    });
    recognizer.setWords(true);
    // Padding gives the decoder its right context without stretching the word.
    // Each take gets a fresh decoder: no text/audio leaks from an earlier pair.
    const padded=new Float32Array(samples.length+13120);padded.set(samples,5120);
    recognizer.acceptWaveformFloat(padded,16000);
   });
  }catch(error){if(this.loading===attempt)this.loading=undefined;
   this.lastError=error instanceof Error?`${error.name}: ${error.message}`.slice(0,200):'Offline decoder failed';return undefined;}
 }
}
