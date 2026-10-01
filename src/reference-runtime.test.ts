import {afterEach,describe,expect,it,vi} from 'vitest';
const native=vi.hoisted(()=>({reference:vi.fn(),cancelReference:vi.fn().mockResolvedValue(undefined)}));
vi.mock('./native',()=>({nativeAudio:native}));
vi.mock('./pcm',()=>({decodeRecording:vi.fn().mockResolvedValue({samples:new Float32Array(3200),rate:16000}),resamplePCM:(s:Float32Array)=>s}));
import {ReferenceRuntime} from './reference-runtime';
import {assessmentPlan} from './scoring-profiles';
const p=assessmentPlan('handf','hf-en',0,0);if(p.mode!=='contrast')throw Error('plan');
const plan=p;
class MockWorker{
 onmessage:((event:MessageEvent)=>void)|null=null;onerror:(()=>void)|null=null;
 terminate=vi.fn();
 postMessage=vi.fn((request:{id:string})=>{queueMicrotask(()=>this.onmessage?.({data:{id:request.id,result:{status:'matched',score:71,contrast:plan.calibrationKey,model:'local-reference-dtw:v1',unit:'phone',targetDistance:.2,competitorDistance:.3,referenceVoice:'test-voice',scope:'word'}}} as MessageEvent));});
}
afterEach(()=>{vi.clearAllMocks();vi.useRealTimers();});
describe('beta reference runtime',()=>{
 it('renders both references, verifies voice identity and caches only generated audio',async()=>{
  native.reference.mockResolvedValue({base64:'YXVkaW8=',mimeType:'audio/wav',voice:'test-voice'});
  const workers:MockWorker[]=[],engine=new ReferenceRuntime(()=>{const w=new MockWorker();workers.push(w);return w as unknown as Worker;});
  expect((await engine.assess(plan,new Float32Array(3200))).status).toBe('matched');
  expect((await engine.assess(plan,new Float32Array(3200))).status).toBe('matched');
  expect(native.reference).toHaveBeenCalledTimes(2);
  expect(native.reference.mock.calls[0][0]).toMatchObject({language:'en-US',text:'hat'});
  expect(native.reference.mock.calls[1][0]).toMatchObject({language:'en-US',text:'fat'});
  expect(workers.every(w=>w.terminate.mock.calls.length===1)).toBe(true);engine.dispose();
 });
 it('provides an actionable offline-voice error without uploading or inventing a score',async()=>{
  native.reference.mockRejectedValue(Error('missing voice'));
  const engine=new ReferenceRuntime(()=>{throw Error('Worker must not start');});
  expect(await engine.assess(plan,new Float32Array(3200))).toEqual({status:'unscored',reason:'reference-unavailable'});engine.dispose();
 });
 it('does not mix reference voices if installed assets change mid-attempt',async()=>{
  native.reference.mockResolvedValueOnce({base64:'YQ==',mimeType:'audio/wav',voice:'first'}).mockResolvedValueOnce({base64:'Yg==',mimeType:'audio/wav',voice:'second'});
  const engine=new ReferenceRuntime(()=>{throw Error('Worker must not start');});
  expect(await engine.assess(plan,new Float32Array(3200))).toEqual({status:'unscored',reason:'model-unavailable'});engine.dispose();
 });
 it('rejects a delayed reference after cancellation',async()=>{
  let resolve!:(v:unknown)=>void;
  native.reference.mockReturnValue(new Promise(r=>{resolve=r;}));
  const create=vi.fn(),engine=new ReferenceRuntime(create),pending=engine.assess(plan,new Float32Array(3200));
  engine.cancel();resolve({base64:'YQ==',mimeType:'audio/wav',voice:'test-voice'});
  expect(await pending).toEqual({status:'unscored',reason:'cancelled'});expect(create).not.toHaveBeenCalled();engine.dispose();
 });
});
