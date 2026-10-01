import {beforeEach,describe,expect,it,vi} from 'vitest';
import type {LocalModel} from './local-models';

const tensors=vi.hoisted(()=>({created:[] as Array<{dispose:ReturnType<typeof vi.fn>}>}));
vi.mock('onnxruntime-web/wasm',()=>({
  env:{wasm:{}},
  Tensor:class {
    dispose=vi.fn();
    constructor(public type:string,public data:Float32Array,public dims:number[]){tensors.created.push(this);}
  },
}));
import {inferLocal} from './local-inference';

const model={input:'audio',logitsOutput:'logits',vocabulary:3,featureNames:[]} as unknown as LocalModel;
const samples=Float32Array.from({length:400},(_,i)=>Math.sin(i)*.1);
const tensor=(data=[1,2,3],dims=[1,1,3])=>({type:'float32',data:Float32Array.from(data),dims,dispose:vi.fn()});
const session=(run:ReturnType<typeof vi.fn>)=>({run}) as unknown as Parameters<typeof inferLocal>[0];
beforeEach(()=>{tensors.created.length=0;});

describe('per-take inference resource lifecycle',()=>{
  it('releases input and every output without changing returned evidence',async()=>{
    const logits=tensor(),unused=tensor();
    const output=await inferLocal(session(vi.fn().mockResolvedValue({logits,unused})),model,samples);
    expect(output.frames[0].map(Math.exp).reduce((a,b)=>a+b,0)).toBeCloseTo(1,12);
    expect(output.frames[0][2]).toBeCloseTo(-.407605964,8);
    expect(output.features).toEqual({});
    for(const resource of [...tensors.created,logits,unused])expect(resource.dispose).toHaveBeenCalledOnce();
  });
  it('releases input when the runtime rejects a take',async()=>{
    await expect(inferLocal(session(vi.fn().mockRejectedValue(Error('Runtime failed'))),model,samples)).rejects.toThrow('Runtime failed');
    expect(tensors.created[0].dispose).toHaveBeenCalledOnce();
  });
  it.each(['shape','values','feature'])('releases all outputs after invalid %s',async(kind)=>{
    const logits=kind==='shape'?tensor([1,2],[1,1,2]):kind==='values'?tensor([1,NaN,3]):tensor();
    const acoustic=tensor([1],[1,1,1]),extra=tensor();
    const task=kind==='feature'?{...model,featureNames:['one','two'],featuresOutput:'acoustic'}:model;
    await expect(inferLocal(session(vi.fn().mockResolvedValue({logits,acoustic,extra})),task,samples)).rejects.toThrow();
    for(const resource of [...tensors.created,logits,acoustic,extra])expect(resource.dispose).toHaveBeenCalledOnce();
  });
  it('copies acoustic features before releasing their tensor',async()=>{
    const logits=tensor(),acoustic=tensor([.7],[1,1,1]);
    acoustic.dispose.mockImplementation(()=>acoustic.data.fill(NaN));
    const output=await inferLocal(session(vi.fn().mockResolvedValue({logits,acoustic})),
      {...model,featureNames:['one'],featuresOutput:'acoustic'},samples);
    expect(output.features.one[0]).toBeCloseTo(.7,6);
    expect(acoustic.dispose).toHaveBeenCalledOnce();
  });
  it('disposes aliased outputs once',async()=>{
    const logits=tensor();
    await inferLocal(session(vi.fn().mockResolvedValue({logits,alias:logits})),model,samples);
    expect(logits.dispose).toHaveBeenCalledOnce();
  });
  it('continues releasing other resources after a release failure',async()=>{
    const logits=tensor(),extra=tensor();
    logits.dispose.mockImplementation(()=>{throw Error('Release failed');});
    await expect(inferLocal(session(vi.fn().mockResolvedValue({logits,extra})),model,samples)).rejects.toThrow('Release failed');
    expect(tensors.created[0].dispose).toHaveBeenCalledOnce();
    expect(extra.dispose).toHaveBeenCalledOnce();
  });
  it('leaves no live tensors across repeated successful takes in a warm session',async()=>{
    const outputs:Array<ReturnType<typeof tensor>>=[];
    const runtime=session(vi.fn().mockImplementation(async()=>{
      const logits=tensor();outputs.push(logits);return {logits};
    }));
    for(let i=0;i<20;i++)await inferLocal(runtime,model,samples);
    expect(tensors.created).toHaveLength(20);
    expect(outputs).toHaveLength(20);
    for(const resource of [...tensors.created,...outputs])expect(resource.dispose).toHaveBeenCalledOnce();
  });
});
