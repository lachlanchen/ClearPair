import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import type {Analysis} from './types';
import type {PCM} from './pcm';
import type {ScoreResult} from './scoring';

const mocks=vi.hoisted(()=>({decode:vi.fn(),analyze:vi.fn(),resample:vi.fn(),request:vi.fn(),cancel:vi.fn(),dispose:vi.fn()}));
// Exercise the controller after model preflight. This fixture never enters the
// release registry, downloads a model, or asserts pronunciation accuracy.
vi.mock('./local-models',()=>({localModels:[{id:'fixture'}],validatedTask:()=>({})}));
vi.mock('./pcm',()=>({decodeRecording:mocks.decode,resamplePCM:mocks.resample}));
vi.mock('./analysis',()=>({analyze:mocks.analyze}));
vi.mock('./local-worker',()=>({LocalWorker:class{
  request=mocks.request;cancel=mocks.cancel;dispose=mocks.dispose;
}}));
import {LocalScorer} from './local-score';

const pcm:PCM={samples:new Float32Array([0,.1,-.1]),rate:16000};
const quality:Analysis={seconds:1,rms:.1,peak:.3,clipped:0,voicedSeconds:.8,waveform:[],pitch:[],status:'clear'};
function deferred<T>(){
  let resolve!:(value:T)=>void,reject!:(reason:Error)=>void;
  const promise=new Promise<T>((yes,no)=>{resolve=yes;reject=no;});
  return {promise,resolve,reject};
}
const assess=(scorer:LocalScorer)=>scorer.assess('handf','hf-en',0,0,false,new Blob());
beforeEach(()=>{
  vi.resetAllMocks();
  mocks.decode.mockResolvedValue(pcm);
  mocks.analyze.mockReturnValue(quality);
  mocks.resample.mockReturnValue(pcm.samples);
  mocks.request.mockResolvedValue({status:'unscored',reason:'uncertain'});
});
afterEach(()=>vi.unstubAllGlobals());

describe('local assessment decoding and cancellation',()=>{
  it('settles decoder failure with a result and permits the next take',async()=>{
    const scorer=new LocalScorer();
    mocks.decode.mockRejectedValueOnce(Error('Unsupported recording'));
    await expect(assess(scorer)).resolves.toEqual({status:'unscored',reason:'model-unavailable'});
    expect(mocks.request).not.toHaveBeenCalled();
    await expect(assess(scorer)).resolves.toEqual({status:'unscored',reason:'uncertain'});
    expect(mocks.request).toHaveBeenCalledOnce();
  });
  it.each(['resolve','reject'] as const)('settles a %s after cancellation as cancelled',async(settle)=>{
    const decoding=deferred<PCM>(),scorer=new LocalScorer();
    mocks.decode.mockReturnValueOnce(decoding.promise);
    const result=assess(scorer);
    scorer.cancel();
    if(settle==='resolve')decoding.resolve(pcm);else decoding.reject(Error('Decoder stopped'));
    await expect(result).resolves.toEqual({status:'unscored',reason:'cancelled'});
    expect(mocks.analyze).not.toHaveBeenCalled();
    expect(mocks.request).not.toHaveBeenCalled();
  });
  it('does not let a replaced decode failure reject the previous attempt',async()=>{
    const decoding=deferred<PCM>(),scorer=new LocalScorer();
    mocks.decode.mockReturnValueOnce(decoding.promise);
    const old=assess(scorer),next=assess(scorer);
    await expect(next).resolves.toEqual({status:'unscored',reason:'uncertain'});
    decoding.reject(Error('Old decoder failed'));
    await expect(old).resolves.toEqual({status:'unscored',reason:'cancelled'});
    expect(mocks.request).toHaveBeenCalledOnce();
  });
  it('returns a preparation failure without starting inference',async()=>{
    const scorer=new LocalScorer();
    mocks.resample.mockImplementationOnce(()=>{throw Error('Invalid PCM');});
    await expect(assess(scorer)).resolves.toEqual({status:'unscored',reason:'model-unavailable'});
    expect(mocks.request).not.toHaveBeenCalled();
  });
  it('keeps disposal effective while decoding',async()=>{
    const decoding=deferred<PCM>(),scorer=new LocalScorer();
    mocks.decode.mockReturnValueOnce(decoding.promise);
    const result=assess(scorer);
    scorer.dispose();decoding.resolve(pcm);
    await expect(result).resolves.toEqual({status:'unscored',reason:'cancelled'});
    expect(mocks.dispose).toHaveBeenCalledOnce();
    expect(mocks.request).not.toHaveBeenCalled();
  });
  it('returns only the result belonging to the current generation',async()=>{
    const scoring=deferred<ScoreResult>(),scorer=new LocalScorer();
    mocks.request.mockReturnValueOnce(scoring.promise);
    const result=assess(scorer);
    await vi.waitFor(()=>expect(mocks.request).toHaveBeenCalledOnce());
    scorer.cancel();scoring.resolve({status:'unscored',reason:'uncertain'});
    await expect(result).resolves.toEqual({status:'unscored',reason:'cancelled'});
  });
});
