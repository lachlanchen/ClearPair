import {describe,it,expect,vi,beforeEach} from 'vitest';
const mock=vi.hoisted(()=>({reference:vi.fn(),recognize:vi.fn(),cancel:vi.fn(),dispose:vi.fn()}));
vi.mock('./native',()=>({hasNativeAudio:()=>true}));
vi.mock('./reference-runtime',()=>({ReferenceRuntime:class{assess=mock.reference;cancel=vi.fn();dispose=vi.fn();}}));
vi.mock('./pair-word-runtime',()=>({PairWordRuntime:class{recognize=mock.recognize;cancel=mock.cancel;dispose=mock.dispose;}}));
vi.mock('./pcm',()=>({decodeRecording:async()=>({samples:new Float32Array(6400).fill(.05),rate:16000}),resamplePCM:(s:Float32Array)=>s}));
vi.mock('./analysis',()=>({analyze:()=>({seconds:.4,rms:.05,peak:.1,clipped:0,voicedSeconds:.3,waveform:[],pitch:[],status:'clear'})}));
import {LocalScorer} from './local-score';
const word=(text:string,language:string)=>({engine:`apple-on-device-words:v1/${language}`,text,words:[{word:text,conf:0,start:0,end:.3}],final:true});
beforeEach(()=>{vi.clearAllMocks();mock.reference.mockResolvedValue({status:'unscored',reason:'sound-unresolved'});mock.recognize.mockResolvedValue(word('light','en-US'));});
describe.skipIf(!__PAIR_WORD_MODELS__)('pair runtime enabled integration',()=>{
 it.each([['landr','lr-start','light','en-US'],['english','v-i','sheep','en-US'],['chinese','z-zh','早','zh-CN']] as const)('identifies %s captured speech BEFORE device references; no detached buffer',async(app,lesson,text,language)=>{
  const e=new LocalScorer();mock.recognize.mockResolvedValue(word(text,language));
  mock.reference.mockImplementation(async(_plan,samples:Float32Array)=>{structuredClone(samples,{transfer:[samples.buffer]});return {status:'unscored',reason:'unaligned'};});
  try{
   const r=await e.assess(app,lesson,0,0,false,new Blob());
   expect(mock.recognize.mock.invocationCallOrder[0]).toBeLessThan(mock.reference.mock.invocationCallOrder[0]);
   expect(mock.recognize.mock.calls[0][1].length).toBe(6400);expect(r).toMatchObject({status:'matched',recognition:{text,decision:'target'}});
  }finally{e.dispose();}
 });
 it('supports 24 repeated takes, immediate cancel, dispose/reopen, then different targets without stale words',async()=>{
  const e=new LocalScorer();try{
   for(let i=0;i<24;i++){
    const side=i%2?1:0,text=side?'right':'light';mock.recognize.mockResolvedValue(word(text,'en-US'));
    const r=await e.assess('landr','lr-start',0,side,false,new Blob());
    expect(r).toMatchObject({status:'matched',score:85,recognition:{text,decision:'target'}});
    if(i===6)e.cancel();if(i===12)e.dispose();
   }
   expect(mock.recognize).toHaveBeenCalledTimes(24);
  }finally{e.dispose();}
 });
 it('ignores a delayed decoder after cancellation and starts clean on the next take',async()=>{
  let finish!:(value:unknown)=>void;mock.recognize.mockImplementationOnce(()=>new Promise(r=>finish=r));
  const e=new LocalScorer(),pending=e.assess('landr','lr-start',0,0,false,new Blob());
  await vi.waitFor(()=>expect(mock.recognize).toHaveBeenCalled());e.cancel();finish(word('right','en-US'));
  expect(await pending).toEqual({status:'unscored',reason:'cancelled'});
  mock.recognize.mockResolvedValue(word('light','en-US'));
  expect(await e.assess('landr','lr-start',0,0,false,new Blob())).toMatchObject({status:'matched',recognition:{text:'light'}});e.dispose();
 });
 it('preserves an unavailable decoder diagnostic instead of calling captured speech empty',async()=>{
  mock.recognize.mockResolvedValue(undefined);const e=new LocalScorer();
  expect(await e.assess('landr','lr-start',0,0,false,new Blob())).toMatchObject({status:'unscored',diagnostics:{signal:'clear',speechMs:300,wordState:'unavailable'}});e.dispose();
 });
});
