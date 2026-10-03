import {describe,it,expect,vi,beforeEach} from 'vitest';
const mock=vi.hoisted(()=>({reference:vi.fn(),recognize:vi.fn(),cancel:vi.fn(),dispose:vi.fn()}));
vi.mock('./native',()=>({hasNativeAudio:()=>true}));
vi.mock('./reference-runtime',()=>({ReferenceRuntime:class{assess=mock.reference;cancel=vi.fn();dispose=vi.fn();}}));
vi.mock('./hf-word-runtime',()=>({HfWordRuntime:class{recognize=mock.recognize;cancel=mock.cancel;dispose=mock.dispose;}}));
vi.mock('./pcm',()=>({decodeRecording:async()=>({samples:new Float32Array(6400).fill(.05),rate:16000}),resamplePCM:(s:Float32Array)=>s}));
vi.mock('./analysis',()=>({analyze:()=>({seconds:.4,rms:.05,peak:.1,clipped:0,voicedSeconds:.3,waveform:[],pitch:[],status:'clear'})}));
import {LocalScorer} from './local-score';
import {Capacitor} from '@capacitor/core';
const word={engine:'fixture',text:'hat',words:[{word:'hat',conf:.95,start:0,end:.3}]};
const match={status:'matched',score:93,contrast:'fixture',model:'local-reference-dtw:v1',unit:'phone',targetDistance:.1,competitorDistance:.5,referenceVoice:'fixture',scope:'word'};
beforeEach(()=>{vi.clearAllMocks();mock.recognize.mockResolvedValue(word);mock.reference.mockResolvedValue(match);});
describe.skipIf(!__HF_WORD_MODELS__)('H & F native enabled integration (run with CLEARPAIR_APP=handf CLEARPAIR_HF_WORDS=1)',()=>{
 it('scores 20 successive iOS takes with native fallback words, including after cancellation and disposal',async()=>{
  const platform=vi.spyOn(Capacitor,'getPlatform').mockReturnValue('ios');
  const e=new LocalScorer();
  try{
   for(let i=0;i<20;i++){
    const word=i%2?'fat':'hat',side=i%2?1:0;
    mock.recognize.mockResolvedValue({engine:'hf-vosk-native:v1/en-US',text:word,words:[{word,conf:.9,start:0,end:.3}],final:true});
    mock.reference.mockResolvedValue({...match,score:72,hf:{version:'hf-segment-fft:v1',target:side?'f':'h',heard:'uncertain',position:'initial',sound:51,word:90,timing:80,segmentMs:40,targetDistance:.5,competitorDistance:.51,margin:.01,cue:'uncertain'}});
    const r=await e.assess('handf','hf-en',0,side,false,new Blob());
    expect(r).toMatchObject({status:'matched',score:85,closestWord:word,recognition:{decision:'target'},evidence:'word'});
    if(i===5)e.cancel();if(i===10)e.dispose();
   }
   expect(mock.recognize).toHaveBeenCalledTimes(20);
  }finally{e.dispose();platform.mockRestore();}
 });
 it('always requests final native word identity on iOS initial H/F, even with a favourable synthetic match',async()=>{
  const platform=vi.spyOn(Capacitor,'getPlatform').mockReturnValue('ios');
  const e=new LocalScorer();
  try{
   mock.recognize.mockResolvedValue({engine:'apple-on-device-words:v1/en-US',text:'fat',words:[{word:'fat',conf:.9,start:0,end:.3}],final:true});
   const r=await e.assess('handf','hf-en',0,0,false,new Blob());
   expect(mock.recognize).toHaveBeenCalledTimes(1);
   expect(r).toMatchObject({status:'matched',closestWord:'fat',recognition:{decision:'opposite'}});
   if(r.status==='matched')expect(r.score).toBeLessThanOrEqual(45);
  }finally{e.dispose();platform.mockRestore();}
 });
 it('preserves the recording buffer when the reference worker transfers its copy',async()=>{
  mock.reference.mockImplementation(async(_plan,pcm:Float32Array)=>{structuredClone(pcm,{transfer:[pcm.buffer]});return {status:'unscored',reason:'unaligned'};});
  const e=new LocalScorer(),r=await e.assess('handf','hf-en',0,0,false,new Blob(['fixture']));
  expect(r.status).toBe('matched');expect(mock.recognize.mock.calls[0][1].length).toBe(6400);e.dispose();
 });
 it('does not load a large model or reinterpret a usable isolated-word score',async()=>{
  const e=new LocalScorer();expect(await e.assess('handf','hf-en',0,0,false,new Blob())).toBe(match);
  expect(mock.recognize).not.toHaveBeenCalled();e.dispose();
 });
 it('rescues a pitch-estimator failure without falsely calling the recording empty',async()=>{
  mock.reference.mockResolvedValue({status:'unscored',reason:'poor-signal'});
  const e=new LocalScorer(),r=await e.assess('handf','hf-en',0,0,false,new Blob());
  expect(r).toMatchObject({status:'matched',model:'local-hf-hybrid:v1',recognition:{decision:'target'}});e.dispose();
 });
 it('does not use the H/F word engine for final F/V or any of the other apps',async()=>{
  mock.reference.mockResolvedValue({status:'unscored',reason:'unaligned'});
  const e=new LocalScorer();await e.assess('handf','hf-final',0,0,false,new Blob());
  await e.assess('english','th-s',0,0,false,new Blob());expect(mock.recognize).not.toHaveBeenCalled();e.dispose();
 });
 it('ignores delayed word evidence after cancellation or a new recording',async()=>{
  mock.reference.mockResolvedValue({status:'unscored',reason:'unaligned'});
  let finish!:(value:unknown)=>void;mock.recognize.mockImplementation(()=>new Promise(r=>finish=r));
  const e=new LocalScorer(),pending=e.assess('handf','hf-en',0,0,false,new Blob());
  await vi.waitFor(()=>expect(mock.recognize).toHaveBeenCalled());e.cancel();finish(word);
  expect(await pending).toEqual({status:'unscored',reason:'cancelled'});e.dispose();
 });
});
