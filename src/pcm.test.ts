import {describe,it,expect,vi} from 'vitest';
import {decodeWav,decodeRecording,resamplePCM} from './pcm';
import {Blob as NodeBlob} from 'node:buffer';
function wav(values:number[],channels=1,rate=16000){
 const buffer=new ArrayBuffer(44+values.length*2),v=new DataView(buffer);
 const id=(at:number,s:string)=>Array.from(s).forEach((c,i)=>v.setUint8(at+i,c.charCodeAt(0)));
 id(0,'RIFF');v.setUint32(4,buffer.byteLength-8,true);id(8,'WAVE');id(12,'fmt ');
 v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,channels,true);v.setUint32(24,rate,true);
 v.setUint32(28,rate*channels*2,true);v.setUint16(32,channels*2,true);v.setUint16(34,16,true);
 id(36,'data');v.setUint32(40,values.length*2,true);values.forEach((x,i)=>v.setInt16(44+i*2,x,true));return buffer;
}
describe('device PCM and model preprocessing',()=>{
 it('decodes exact signed native WAV amplitudes, not microphone-volume grades',()=>{
  const pcm=decodeWav(wav([0,16384,-16384,32767,-32768]))!;
  expect(pcm.rate).toBe(16000);expect(Array.from(pcm.samples)).toEqual([0,.5,-.5,32767/32768,-1]);
 });
 it('averages stereo safely',()=>{
  expect(Array.from(decodeWav(wav([16384,-16384,32767,32767],2))!.samples)).toEqual([0,32767/32768]);
 });
 it('needs no AudioContext for native recordings',async()=>{
  const ctx=vi.fn();vi.stubGlobal('AudioContext',ctx);
  try{expect((await decodeRecording(new NodeBlob([wav([0,12,-12])]) as unknown as Blob)).samples.length).toBe(3);expect(ctx).not.toHaveBeenCalled();}
  finally{vi.unstubAllGlobals();}
 });
 it('rejects truncated headers, partial frames and malformed channel layouts',()=>{
  const data=wav([1,2]);new DataView(data).setUint32(4,500,true);expect(()=>decodeWav(data)).toThrow('Truncated');
  const odd=wav([1,2,3],2);expect(()=>decodeWav(odd)).toThrow('Unsupported');
  const wrong=wav([1,2]);new DataView(wrong).setUint16(32,4,true);expect(()=>decodeWav(wrong)).toThrow('Unsupported');
  expect(decodeWav(new ArrayBuffer(4))).toBeNull();
 });
 it('resamples independently of microphone amplitude and filters alias frequencies',()=>{
  const sine=(hz:number)=>Float32Array.from({length:48000},(_,i)=>.2*Math.sin(2*Math.PI*hz*i/48000));
  const low=resamplePCM(sine(1000),48000),high=resamplePCM(sine(12000),48000);
  const rms=(x:Float32Array)=>Math.sqrt(x.subarray(100,-100).reduce((s,v)=>s+v*v,0)/(x.length-200));
  expect(low).toHaveLength(16000);expect(rms(low)).toBeCloseTo(.2/Math.sqrt(2),3);
  expect(rms(high)).toBeLessThan(.003);
 });
 it('never normalizes silence into a signal',()=>{
  expect(resamplePCM(new Float32Array(4800),48000).every(v=>v===0)).toBe(true);
  expect(()=>resamplePCM(new Float32Array([NaN]),16000)).toThrow();
 });
});
