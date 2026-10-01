// @vitest-environment jsdom
import {beforeEach,afterEach,expect,it,vi} from 'vitest';
vi.mock('./native',()=>({hasNativeAudio:()=>false,nativeAudio:{}}));
import {Recorder} from './recorder';
function pending<T>(){let resolve!:(value:T)=>void;const promise=new Promise<T>(r=>{resolve=r;});return{promise,resolve};}
let resumes:Array<Promise<void>>,contexts:Array<{close:ReturnType<typeof vi.fn>}>;
let requests:ReturnType<typeof vi.fn>;
class Context {
 close=vi.fn().mockResolvedValue(undefined);
 constructor(){contexts.push(this);}
 resume(){return resumes.shift()??Promise.resolve();}
 createMediaStreamSource(){return{connect:vi.fn()};}
 createAnalyser(){return{fftSize:0,getFloatTimeDomainData:(a:Float32Array)=>a.fill(.2)};}
}
class Media {
 static isTypeSupported(){return true;}
 state='inactive';mimeType='audio/webm';
 ondataavailable?: (e:{data:Blob})=>void;onstop?:()=>void;
 start(){this.state='recording';}
 stop(){this.state='inactive';this.ondataavailable?.({data:new Blob(['take'])});this.onstop?.();}
}
function stream(){const stop=vi.fn();return{getTracks:()=>[{stop}],stop};}
beforeEach(()=>{
 contexts=[];resumes=[];requests=vi.fn();
 Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:requests}});
 vi.stubGlobal('AudioContext',Context);vi.stubGlobal('MediaRecorder',Media);
 vi.stubGlobal('requestAnimationFrame',vi.fn(()=>1));vi.stubGlobal('cancelAnimationFrame',vi.fn());
});
afterEach(()=>vi.unstubAllGlobals());
it('a cancelled permission request stops only its own late stream',async()=>{
 const permission=pending<ReturnType<typeof stream>>(),old=stream(),next=stream();
 requests.mockReturnValueOnce(permission.promise).mockResolvedValueOnce(next);
 const recorder=new Recorder(),first=recorder.start(vi.fn());
 await recorder.cancel();await recorder.start(vi.fn());permission.resolve(old);await first;
 expect(old.stop).toHaveBeenCalled();expect(next.stop).not.toHaveBeenCalled();
 expect((await recorder.stop()).size).toBeGreaterThan(0);
});
it('a stale AudioContext resume cannot close a newer take',async()=>{
 const resume=pending<void>(),old=stream(),next=stream();resumes.push(resume.promise);
 requests.mockResolvedValueOnce(old).mockResolvedValueOnce(next);
 const recorder=new Recorder(),first=recorder.start(vi.fn());
 await vi.waitFor(()=>expect(contexts).toHaveLength(1));
 await recorder.cancel();await recorder.start(vi.fn());resume.resolve();await first;
 expect(contexts[1].close).not.toHaveBeenCalled();expect(next.stop).not.toHaveBeenCalled();
 expect((await recorder.stop()).size).toBeGreaterThan(0);
 expect(contexts[1].close).toHaveBeenCalledOnce();
});
it('rejecting a second start leaves the active meter generation intact',async()=>{
 const take=stream(),meter=vi.fn();requests.mockResolvedValue(take);
 const recorder=new Recorder();await recorder.start(meter);
 await expect(recorder.start(vi.fn())).rejects.toThrow('already active');
 const tick=vi.mocked(requestAnimationFrame).mock.calls[0][0];tick(0);
 expect(meter).toHaveBeenCalledTimes(2);await recorder.cancel();
 tick(0);expect(meter).toHaveBeenCalledTimes(2);
});
