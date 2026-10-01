import {execFileSync} from 'node:child_process';
import {describe,expect,it} from 'vitest';
import {MEL_BANDS,N_FRAMES,ONSET_FEATURE_VERSION,ONSET_GLOBAL_FEATURE_VERSION} from './onset-features';
import {ONSET_CLASSES,ONSET_MODEL_VERSION,createOnsetNetwork,runOnsetNetwork,validateOnsetModel,type OnsetModel} from './onset-network';

function model():OnsetModel{
  const conv=(inputs:number,outputs:number)=>({weight:Array.from({length:outputs},()=>Array.from({length:inputs},()=>Array(5).fill(0) as number[])),bias:Array<number>(outputs).fill(0)});
  const dense=(inputs:number,outputs:number)=>({weight:Array.from({length:outputs},()=>Array<number>(inputs).fill(0)),bias:Array<number>(outputs).fill(0)});
  return {version:ONSET_MODEL_VERSION,features:ONSET_FEATURE_VERSION,classes:[...ONSET_CLASSES],
    conv1:conv(40,24),conv2:conv(24,24),fc1:dense(48,32),fc2:dense(32,5)};
}
const features=()=>Array.from({length:N_FRAMES},()=>new Float32Array(MEL_BANDS));
function path(){
  const network=model();
  network.conv1.weight[0][0][2]=1;
  network.conv2.weight[0][0][2]=1;
  network.fc1.weight[0][0]=1;
  network.fc1.weight[0][24]=2;
  network.fc2.weight.forEach((row,index)=>row[0]=index-2);
  return network;
}
describe('five-class onset CNN evidence',()=>{
  it('accepts an explicit v2 contract and consumes its matrix without feature-mode inference',()=>{
    const network=path(),input=features();input[0][0]=4;
    const expected=runOnsetNetwork(input,network);
    network.features=ONSET_GLOBAL_FEATURE_VERSION;
    expect(validateOnsetModel(network).features).toBe(ONSET_GLOBAL_FEATURE_VERSION);
    expect(runOnsetNetwork(input,network)).toEqual(expected);
    expect(validateOnsetModel(model()).features).toBe(ONSET_FEATURE_VERSION);
  });
  it('preserves mean-then-max pooling and emits five logits, not a correctness score',()=>{
    const input=features();input[0][0]=4;
    const output=runOnsetNetwork(input,path());
    const pooled=Math.fround(Math.fround(4/28)+8);
    expect(output.classes).toEqual(['F','HH','L','R','OTHER']);
    expect(output.logits).toEqual([-2*pooled,-pooled,0,pooled,2*pooled]);
    expect(output.probabilities.reduce((sum,p)=>sum+p,0)).toBeCloseTo(1,14);
    expect(output).not.toHaveProperty('score');
    expect(output).not.toHaveProperty('correctness');
  });
  it('uses cross-correlation with symmetric zero padding, not a reversed kernel',()=>{
    const input=features();input[27][0]=1;
    const network=path();network.conv1.weight[0][0]=[1,0,0,0,0];
    expect(runOnsetNetwork(input,network).logits).toEqual([0,0,0,0,0]);
    network.conv1.weight[0][0]=[0,0,0,0,1];
    expect(runOnsetNetwork(input,network).logits[4]).toBeGreaterThan(4);
  });
  it('applies both convolution and dense ReLUs',()=>{
    const input=features();input[0][0]=-4;
    expect(runOnsetNetwork(input,path()).logits).toEqual([0,0,0,0,0]);
    const network=path();network.conv2.bias[0]=-10;input[0][0]=1;
    expect(runOnsetNetwork(input,network).logits).toEqual([0,0,0,0,0]);
    network.conv2.bias[0]=0;network.fc1.bias[0]=-10;
    expect(runOnsetNetwork(input,network).logits).toEqual([0,0,0,0,0]);
  });
  it('computes stable softmax even for very large logits',()=>{
    const network=model();network.fc2.bias=[10000,10001,-10000,0,9999];
    const output=runOnsetNetwork(features(),network);
    expect(output.probabilities.every(p=>Number.isFinite(p)&&p>=0&&p<=1)).toBe(true);
    expect(output.probabilities.reduce((sum,p)=>sum+p,0)).toBeCloseTo(1,14);
    expect(output.probabilities[1]/output.probabilities[0]).toBeCloseTo(Math.E,12);
  });
  it('loads an isolated weight snapshot',()=>{
    const network=path(),input=features();input[0][0]=4;
    const infer=createOnsetNetwork(network),expected=infer(input);
    network.conv1.weight[0][0][2]=100;
    expect(infer(input)).toEqual(expected);
    expect(runOnsetNetwork(input,network).logits).not.toEqual(expected.logits);
  });
  it('rejects version, class-order and layer-dimension mismatches',()=>{
    for(const change of [
      (m:OnsetModel)=>{m.version='old' as typeof m.version;},
      (m:OnsetModel)=>{m.features='old' as typeof m.features;},
      (m:OnsetModel)=>{m.classes=['HH','F','L','R','OTHER'];},
      (m:OnsetModel)=>{m.conv1.weight.pop();},
      (m:OnsetModel)=>{m.conv2.weight[0][0].pop();},
      (m:OnsetModel)=>{m.fc1.weight[0].pop();},
      (m:OnsetModel)=>{m.fc2.bias.pop();},
      (m:OnsetModel)=>{delete m.conv1.weight[0][0][0];},
      (m:OnsetModel)=>{m.classes=new Array(5);},
    ]){const network=model();change(network);expect(()=>validateOnsetModel(network)).toThrow();}
  });
  it.each([NaN,Infinity,-Infinity])('rejects nonfinite weights/features %s',value=>{
    const network=model();network.conv1.weight[0][0][0]=value;
    expect(()=>validateOnsetModel(network)).toThrow();
    const input=features();input[1][1]=value;
    expect(()=>runOnsetNetwork(input,model())).toThrow();
  });
  it('rejects malformed feature matrices and arithmetic overflow',()=>{
    expect(()=>runOnsetNetwork([],model())).toThrow();
    const input=features();input[0]=new Float32Array(39);
    expect(()=>runOnsetNetwork(input,model())).toThrow();
    const network=path();network.conv1.weight[0][0][2]=Number.MAX_VALUE;
    const huge=features();huge[0][0]=4;
    expect(()=>runOnsetNetwork(huge,network)).toThrow();
  });
  it.skipIf(!process.env.ONSET_PARITY_PYTHON)('matches independent NumPy inference with every coefficient active',()=>{
    const network=model(),input=features();let index=0;
    const coefficient=()=>Math.sin(++index*.37)*.07;
    for(const layer of [network.conv1,network.conv2]){
      for(const output of layer.weight)for(const kernel of output)for(let k=0;k<5;k++)kernel[k]=coefficient();
      for(let o=0;o<layer.bias.length;o++)layer.bias[o]=coefficient();
    }
    for(const layer of [network.fc1,network.fc2]){
      for(const output of layer.weight)for(let i=0;i<output.length;i++)output[i]=coefficient();
      for(let o=0;o<layer.bias.length;o++)layer.bias[o]=coefficient();
    }
    for(let t=0;t<N_FRAMES;t++)for(let c=0;c<MEL_BANDS;c++)input[t][c]=Math.sin(t*2.1+c*.7)*4;
    const output=execFileSync(process.env.ONSET_PARITY_PYTHON!,['-c',`
import json, sys, numpy as np
data=json.load(sys.stdin); model=data['model']; x=np.array(data['features'],dtype=np.float32)
def conv(x, layer):
    windows=np.lib.stride_tricks.sliding_window_view(np.pad(x.astype(np.float64),((2,2),(0,0))),5,axis=0)
    result=np.einsum('tck,ock->to',windows,np.array(layer['weight']))+np.array(layer['bias'])
    return np.maximum(result.astype(np.float32),0)
def dense(x,layer,relu):
    result=(np.array(layer['weight'])@x.astype(np.float64)+np.array(layer['bias'])).astype(np.float32)
    return np.maximum(result,0) if relu else result
x=conv(conv(x,model['conv1']),model['conv2'])
x=np.concatenate([x.mean(axis=0,dtype=np.float64).astype(np.float32),x.max(axis=0)])
logits=dense(dense(x,model['fc1'],True),model['fc2'],False)
p=np.exp(logits.astype(np.float64)-logits.max()); p/=p.sum()
print(json.dumps({'logits':logits.tolist(),'probabilities':p.tolist()}))
`],{encoding:'utf8',input:JSON.stringify({model:network,features:input.map(row=>Array.from(row))}),timeout:10_000});
    const expected=JSON.parse(output) as {logits:number[];probabilities:number[]};
    const actual=runOnsetNetwork(input,network);
    for(let i=0;i<ONSET_CLASSES.length;i++){
      expect(actual.logits[i]).toBeCloseTo(expected.logits[i],6);
      expect(actual.probabilities[i]).toBeCloseTo(expected.probabilities[i],6);
    }
  });
});
