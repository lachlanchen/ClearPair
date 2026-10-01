// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
const bridge = vi.hoisted(() => ({ start:vi.fn(), stop:vi.fn(), cancel:vi.fn(), addListener:vi.fn() }));
vi.mock('./native', () => ({hasNativeAudio:()=>true,nativeAudio:bridge}));
import { Recorder } from './recorder';
function pending<T>() {
  let resolve!: (value:T)=>void, reject!: (error:Error)=>void;
  const promise=new Promise<T>((yes,no)=>{resolve=yes;reject=no;});
  return {promise,resolve,reject};
}
describe('native microphone lifecycle',()=>{
  beforeEach(()=>{
    vi.resetAllMocks();
    bridge.cancel.mockResolvedValue(undefined);
    bridge.start.mockResolvedValue(undefined);
    bridge.stop.mockResolvedValue({base64:btoa('RIFFaudio'),mimeType:'audio/wav'});
    bridge.addListener.mockImplementation(async()=>({remove:vi.fn().mockResolvedValue(undefined)}));
  });
  it('never starts capture after a cancelled listener registration',async()=>{
    const listener=pending<{remove:ReturnType<typeof vi.fn>}>();
    const remove=vi.fn().mockResolvedValue(undefined);
    bridge.addListener.mockReturnValueOnce(listener.promise);
    const recorder=new Recorder();
    const first=recorder.start(vi.fn());
    await recorder.cancel();
    listener.resolve({remove}); await first;
    expect(bridge.start).not.toHaveBeenCalled();
    expect(remove).toHaveBeenCalledOnce();
  });
  it.each(['resolve','reject'] as const)('a stale permission %s cannot cancel a newer take',async(outcome)=>{
    const old=pending<void>();
    bridge.start.mockReturnValueOnce(old.promise);
    const recorder=new Recorder();
    const first=recorder.start(vi.fn()).catch(()=>{});
    await vi.waitFor(()=>expect(bridge.start).toHaveBeenCalledOnce());
    await recorder.cancel();
    await recorder.start(vi.fn());
    const cancellations=bridge.cancel.mock.calls.length;
    if(outcome==='resolve')old.resolve(); else old.reject(new Error('Old permission cancelled'));
    await first;
    expect(bridge.cancel).toHaveBeenCalledTimes(cancellations);
    expect((await recorder.stop()).type).toBe('audio/wav');
    expect(bridge.stop).toHaveBeenCalledOnce();
  });
  it('ignores stale meter events and removes each subscription exactly once',async()=>{
    const removers=[vi.fn().mockResolvedValue(undefined),vi.fn().mockResolvedValue(undefined)];
    const handlers:Array<(event:{rms:number})=>void>=[];
    bridge.addListener.mockImplementation(async(_name,handler)=>{
      handlers.push(handler);return {remove:removers[handlers.length-1]};
    });
    const recorder=new Recorder(), firstMeter=vi.fn(), nextMeter=vi.fn();
    await recorder.start(firstMeter); handlers[0]({rms:.2});
    await recorder.cancel(); await recorder.start(nextMeter);
    handlers[0]({rms:.8}); handlers[1]({rms:.4});
    await recorder.stop();
    expect(firstMeter).toHaveBeenCalledTimes(1);
    expect(nextMeter).toHaveBeenCalledWith(.4);
    for(const remove of removers)expect(remove).toHaveBeenCalledOnce();
  });
  it('releases the subscription after a failed capture and permits retry',async()=>{
    bridge.start.mockRejectedValueOnce(new Error('Permission denied'));
    const recorder=new Recorder();
    await expect(recorder.start(vi.fn())).rejects.toThrow('Permission denied');
    await recorder.start(vi.fn());
    await expect(recorder.stop()).resolves.toBeInstanceOf(Blob);
  });
});
