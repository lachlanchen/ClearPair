import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {LocalWorker} from './local-worker';
import {assessmentPlan} from './scoring-profiles';
import type {LocalAssessmentRequest} from './local-score';
function request(id='one'):LocalAssessmentRequest{
 const plan=assessmentPlan('handf','hf-en',0,0);if(plan.mode!=='contrast')throw Error('Wrong fixture');
 return {id,app:'handf',plan,samples:new Float32Array(16000),base:'http://localhost/',
  quality:{seconds:1,rms:.1,peak:.3,clipped:0,voicedSeconds:.8,waveform:[],pitch:[],status:'clear'}};
}
function setup(){
 const worker={postMessage:vi.fn(),terminate:vi.fn(),onmessage:null as ((e:{data:unknown})=>void)|null,onerror:null as (()=>void)|null};
 const create=vi.fn(()=>worker as unknown as Worker),host=new LocalWorker(create);
 const reply=(id='one',result:unknown={status:'unscored',reason:'uncertain'})=>worker.onmessage?.({data:{id,result}});
 return {worker,host,create,reply};
}
beforeEach(()=>vi.useFakeTimers());afterEach(()=>vi.useRealTimers());
describe('bounded warm on-device model worker',()=>{
 it('reuses the single completed worker for the next take, then releases it after an idle minute',async()=>{
  const {host,reply,create,worker}=setup();let pending=host.request(request());reply();await pending;
  host.cancel();expect(worker.terminate).not.toHaveBeenCalled();
  vi.advanceTimersByTime(30_000);pending=host.request(request('two'));reply('two');await pending;
  expect(create).toHaveBeenCalledOnce();vi.advanceTimersByTime(59_999);expect(worker.terminate).not.toHaveBeenCalled();
  vi.advanceTimersByTime(1);expect(worker.terminate).toHaveBeenCalledOnce();
 });
 it('immediately terminates in-flight inference when stopped or replaced',async()=>{
  const {host,worker,create,reply}=setup();const old=host.request(request());
  const next=host.request(request('two'));expect(await old).toEqual({status:'unscored',reason:'cancelled'});
  expect(worker.terminate).toHaveBeenCalledOnce();expect(create).toHaveBeenCalledTimes(2);
  reply('one');host.dispose();expect(await next).toEqual({status:'unscored',reason:'cancelled'});
 });
 it.each(['crash','timeout','post-failure'] as const)('releases a %s attempt and permits recovery',async(kind)=>{
  const {host,worker,reply}=setup();
  if(kind==='post-failure')worker.postMessage.mockImplementationOnce(()=>{throw Error('No transferable buffer');});
  const pending=host.request(request());
  if(kind==='crash')worker.onerror?.();if(kind==='timeout')vi.advanceTimersByTime(30_000);
  expect(await pending).toEqual({status:'unscored',reason:'model-unavailable'});expect(worker.terminate).toHaveBeenCalledOnce();
  const next=host.request(request('two'));reply('two');expect(await next).toEqual({status:'unscored',reason:'uncertain'});host.dispose();
 });
 it('rejects malformed/stale grades rather than accepting any worker message',async()=>{
  const {host,reply,worker}=setup();const pending=host.request(request());
  reply('old',{status:'scored',score:58});expect(worker.terminate).not.toHaveBeenCalled();
  reply('one',{status:'scored',score:58,probability:.58,contrast:'other',model:'fixture',unit:'phone'});
  expect(await pending).toEqual({status:'unscored',reason:'invalid-evidence'});expect(worker.terminate).toHaveBeenCalledOnce();
 });
});
