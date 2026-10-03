import {describe,it,expect,vi} from 'vitest';
import type {Model} from 'vosk-browser/dist/model';
import {HfWordRuntime} from './hf-word-runtime';
import {Capacitor} from '@capacitor/core';
const compatibility=vi.hoisted(()=>({support:vi.fn(),model:vi.fn(),native:vi.fn(),cancel:vi.fn().mockResolvedValue(undefined),release:vi.fn().mockResolvedValue(undefined)}));
vi.mock('./native',()=>({nativeAudio:{offlineWordSupport:compatibility.support,recognizeWords:compatibility.native,cancelWords:compatibility.cancel,releaseWords:compatibility.release}}));
vi.mock('vosk-browser',()=>({Model:compatibility.model}));
class FakeModel{
 ready=true;terminate=vi.fn();remove=vi.fn();decoders:FakeDecoder[]=[];
 constructor(public text='hat',public immediate=true){}
 get KaldiRecognizer(){const parent=this;return class extends FakeDecoder{
  constructor(rate:number,grammar?:string){super(parent,rate,grammar);parent.decoders.push(this);}
 };}
}
class FakeDecoder{
 listeners=new Map<string,(value:unknown)=>void>();
 setWords=vi.fn();remove=vi.fn();input?:Float32Array;
 constructor(public parent:FakeModel,public rate:number,public grammar?:string){}
 on(event:string,cb:(value:unknown)=>void){this.listeners.set(event,cb);}
 acceptWaveformFloat(samples:Float32Array){this.input=samples;if(this.parent.immediate)queueMicrotask(()=>this.emit('partialresult',{result:{partial:'not-final'}}));}
 retrieveFinalResult(){queueMicrotask(()=>this.result(this.parent.text));}
 emit(event:string,data:unknown){this.listeners.get(event)?.({event,...data as object});}
 result(text:string){this.emit('result',{result:{text,result:text?[{word:text,conf:.95,start:.32,end:.7}]:[]}});}
}
const samples=()=>new Float32Array(6400).fill(.04);
const cast=(m:FakeModel)=>m as unknown as Model;
describe('H & F offline decoder lifecycle',()=>{
 it('does not initialize WebAssembly on an unqualified older iOS runtime',async()=>{
  const platform=vi.spyOn(Capacitor,'getPlatform').mockReturnValue('ios');
  compatibility.support.mockResolvedValue({supported:false});compatibility.model.mockClear();
  compatibility.native.mockRejectedValue(Error('Offline model unavailable'));
  const engine=new HfWordRuntime();
  try{
   expect(await engine.recognize('en-US',samples(),'capacitor://localhost/')).toBeUndefined();
   expect(compatibility.model).not.toHaveBeenCalled();expect(engine.lastError).toContain('not qualified');
  }finally{engine.dispose();platform.mockRestore();}
 });
 it('uses native saved-PCM words on older iOS without loading WebAssembly',async()=>{
  const platform=vi.spyOn(Capacitor,'getPlatform').mockReturnValue('ios');
  const result={engine:'apple-on-device-words:v1/en-US',text:'hat',words:[{word:'hat',conf:0,start:.32,end:.7}],final:true};
  compatibility.native.mockResolvedValue(result);compatibility.model.mockClear();compatibility.support.mockClear();compatibility.native.mockClear();
  const engine=new HfWordRuntime(),audio=samples();
  try{
   expect(await engine.recognize('en-US',audio,'capacitor://localhost/')).toEqual(result);
   expect(compatibility.model).not.toHaveBeenCalled();expect(compatibility.support).not.toHaveBeenCalled();
   const request=compatibility.native.mock.calls[0][0];
   expect(request.language).toBe('en-US');expect(Object.keys(request).sort()).toEqual(['id','language','pcm16Base64']);
   const raw=Uint8Array.from(atob(request.pcm16Base64),c=>c.charCodeAt(0));
   expect(raw.length).toBe(audio.length*2);expect(new DataView(raw.buffer).getInt16(0,true)/32767).toBeCloseTo(.04,4);
  }finally{engine.dispose();platform.mockRestore();}
 });
 it('accepts the bundled native fallback without treating it as Apple evidence',async()=>{
  const platform=vi.spyOn(Capacitor,'getPlatform').mockReturnValue('ios');
  const result={engine:'hf-vosk-native:v1/en-US',text:'fat',words:[{word:'fat',conf:.88,start:.32,end:.7}],final:true};
  compatibility.native.mockResolvedValue(result);compatibility.model.mockClear();
  const engine=new HfWordRuntime();
  try{expect(await engine.recognize('en-US',samples(),'capacitor://localhost/')).toEqual(result);expect(compatibility.model).not.toHaveBeenCalled();}
  finally{engine.dispose();platform.mockRestore();}
 });
 it('releases the native model cache when the score panel is backgrounded/disposed',()=>{
  const platform=vi.spyOn(Capacitor,'getPlatform').mockReturnValue('ios');compatibility.release.mockClear();
  try{new HfWordRuntime().dispose();expect(compatibility.release).toHaveBeenCalledOnce();}finally{platform.mockRestore();}
 });
 it('ignores an old native final result and cancels by its own request ID',async()=>{
  const platform=vi.spyOn(Capacitor,'getPlatform').mockReturnValue('ios');
  let finish!:(r:unknown)=>void;
  compatibility.native.mockImplementation(()=>new Promise(r=>finish=r));compatibility.cancel.mockClear();
  const engine=new HfWordRuntime();
  try{
   const pending=engine.recognize('en-US',samples(),'capacitor://localhost/');
   const request=compatibility.native.mock.calls.at(-1)![0];engine.cancel();
   expect(compatibility.cancel).toHaveBeenCalledWith({id:request.id});
   finish({engine:'apple-on-device-words:v1/en-US',text:'fat',words:[],final:true});
   expect(await pending).toBeUndefined();
  }finally{engine.dispose();platform.mockRestore();}
 });
 it('uses unrestricted 16k saved audio and a fresh decoder per take',async()=>{
  const model=new FakeModel(),create=vi.fn().mockResolvedValue(cast(model)),engine=new HfWordRuntime(create),audio=samples();
  for(let i=0;i<3;i++)expect((await engine.recognize('en-US',audio,'https://local.invalid/'))?.text).toBe('hat');
  expect(create).toHaveBeenCalledTimes(1);expect(model.decoders).toHaveLength(3);
  for(const d of model.decoders){expect(d.rate).toBe(16000);expect(d.grammar).toBeUndefined();expect(d.setWords).toHaveBeenCalledWith(true);expect(d.remove).toHaveBeenCalledTimes(1);expect(d.input?.length).toBe(audio.length+13120);}
  expect(audio[0]).toBeCloseTo(.04);engine.dispose();expect(model.terminate).toHaveBeenCalledTimes(1);
 });
 it('retains an endpoint result when the subsequent final result is empty',async()=>{
  const model=new FakeModel('',false),engine=new HfWordRuntime(async()=>cast(model));
  const pending=engine.recognize('en-US',samples(),'https://local.invalid/');await Promise.resolve();
  model.decoders[0].result('hat');expect((await pending)?.text).toBe('hat');engine.dispose();
 });
 it('stops a cancelled attempt and ignores its delayed result',async()=>{
  const model=new FakeModel('hat',false),engine=new HfWordRuntime(async()=>cast(model));
  const pending=engine.recognize('en-US',samples(),'https://local.invalid/');await Promise.resolve();
  engine.cancel();expect(await pending).toBeUndefined();model.decoders[0].result('fat');
  model.immediate=true;expect((await engine.recognize('en-US',samples(),'https://local.invalid/'))?.text).toBe('hat');engine.dispose();
 });
 it('releases the old model when switching languages and on disposal',async()=>{
  const en=new FakeModel(),zh=new FakeModel('哈'),create=vi.fn().mockResolvedValueOnce(cast(en)).mockResolvedValueOnce(cast(zh)),engine=new HfWordRuntime(create);
  expect((await engine.recognize('en-US',samples(),'https://local.invalid/'))?.text).toBe('hat');
  expect((await engine.recognize('zh-CN',samples(),'https://local.invalid/'))?.text).toBe('哈');
  expect(en.terminate).toHaveBeenCalledTimes(1);expect(zh.terminate).not.toHaveBeenCalled();engine.dispose();expect(zh.terminate).toHaveBeenCalledTimes(1);
 });
 it('never retains a model which finishes loading after disposal',async()=>{
  let finish!:(m:Model)=>void;const model=new FakeModel(),engine=new HfWordRuntime(()=>new Promise(r=>finish=r));
  const pending=engine.recognize('en-US',samples(),'https://local.invalid/');engine.dispose();finish(cast(model));
  expect(await pending).toBeUndefined();expect(model.decoders).toHaveLength(0);expect(model.terminate).toHaveBeenCalled();
 });
 it('times out instead of leaving scoring spinning forever',async()=>{
  vi.useFakeTimers();try{
   const model=new FakeModel('hat',false),engine=new HfWordRuntime(async()=>cast(model));
   const pending=engine.recognize('en-US',samples(),'https://local.invalid/');await Promise.resolve();
   await vi.advanceTimersByTimeAsync(15_000);expect(await pending).toBeUndefined();expect(model.decoders[0].remove).toHaveBeenCalled();engine.dispose();
  }finally{vi.useRealTimers();}
 });
 it('unavailable/unsupported models fall back without inventing a transcript',async()=>{
  const create=vi.fn().mockRejectedValue(Error('unavailable')),engine=new HfWordRuntime(create);
  expect(await engine.recognize('zh-HK',samples(),'https://local.invalid/')).toBeUndefined();expect(create).not.toHaveBeenCalled();
  expect(await engine.recognize('en-US',samples(),'https://local.invalid/')).toBeUndefined();engine.dispose();
 });
 it('allows retry after a transient model-load failure instead of requiring an app restart',async()=>{
  const model=new FakeModel(),create=vi.fn().mockRejectedValueOnce(Error('temporary')).mockResolvedValueOnce(cast(model)),engine=new HfWordRuntime(create);
  expect(await engine.recognize('en-US',samples(),'https://local.invalid/')).toBeUndefined();
  expect((await engine.recognize('en-US',samples(),'https://local.invalid/'))?.text).toBe('hat');engine.dispose();
 });
 it('aborts an in-progress model load when a new take or backgrounding cancels it',async()=>{
  let signal:AbortSignal|undefined;
  const engine=new HfWordRuntime((_url,s)=>{signal=s;return new Promise((_resolve,reject)=>s?.addEventListener('abort',()=>reject(Error('cancelled'))));});
  const pending=engine.recognize('en-US',samples(),'https://local.invalid/');engine.cancel();
  expect(signal?.aborted).toBe(true);expect(await pending).toBeUndefined();engine.dispose();
 });
});
