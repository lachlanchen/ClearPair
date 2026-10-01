import {MEL_BANDS,N_FRAMES,ONSET_FEATURE_VERSION,ONSET_GLOBAL_FEATURE_VERSION} from './onset-features';

export const ONSET_MODEL_VERSION='clearpair-onset-cnn:v1';
export const ONSET_CLASSES=['F','HH','L','R','OTHER'] as const;
export type OnsetClass=typeof ONSET_CLASSES[number];
interface ConvLayer {weight:number[][][];bias:number[]}
interface DenseLayer {weight:number[][];bias:number[]}
export interface OnsetModel {
  version:typeof ONSET_MODEL_VERSION;
  features:typeof ONSET_FEATURE_VERSION|typeof ONSET_GLOBAL_FEATURE_VERSION;
  classes:readonly OnsetClass[];
  conv1:ConvLayer;conv2:ConvLayer;fc1:DenseLayer;fc2:DenseLayer;
}
/** Acoustic class evidence only. Softmax is conditional on these five classes;
 * it is neither calibrated correctness nor a learned speech/content gate. */
export interface OnsetEvidence {
  classes:readonly OnsetClass[];
  logits:number[];
  probabilities:number[];
}
type Features=readonly ArrayLike<number>[];
function object(value:unknown):Record<string,unknown>{
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid onset model object');
  return value as Record<string,unknown>;
}
function array(value:unknown,length:number):unknown[]{
  if(!Array.isArray(value)||value.length!==length)throw Error('Invalid onset model dimensions');
  return value;
}
function vector(value:unknown,length:number):number[]{
  return Array.from(array(value,length),v=>{
    if(typeof v!=='number'||!Number.isFinite(v))throw Error('Invalid onset model coefficient');
    return v;
  });
}
function convLayer(value:unknown,inputs:number,outputs:number):ConvLayer{
  const layer=object(value);
  return {weight:Array.from(array(layer.weight,outputs),row=>Array.from(array(row,inputs),kernel=>vector(kernel,5))),bias:vector(layer.bias,outputs)};
}
function denseLayer(value:unknown,inputs:number,outputs:number):DenseLayer{
  const layer=object(value);
  return {weight:Array.from(array(layer.weight,outputs),row=>vector(row,inputs)),bias:vector(layer.bias,outputs)};
}

/** Validate and snapshot untrusted numeric JSON so later caller mutation cannot
 * alter a loaded network. Layer layouts are PyTorch [out][in][kernel]/[out][in]. */
export function validateOnsetModel(value:unknown):OnsetModel{
  const model=object(value);
  const classes=array(model.classes,ONSET_CLASSES.length);
  const featureVersion=model.features;
  if(model.version!==ONSET_MODEL_VERSION||
    (featureVersion!==ONSET_FEATURE_VERSION&&featureVersion!==ONSET_GLOBAL_FEATURE_VERSION)||
    ONSET_CLASSES.some((name,i)=>classes[i]!==name))throw Error('Unsupported onset model contract');
  return {version:ONSET_MODEL_VERSION,features:featureVersion,classes:[...ONSET_CLASSES],
    conv1:convLayer(model.conv1,40,24),conv2:convLayer(model.conv2,24,24),
    fc1:denseLayer(model.fc1,48,32),fc2:denseLayer(model.fc2,32,5)};
}
function validateFeatures(features:Features){
  if(!Array.isArray(features)||features.length!==N_FRAMES)throw Error('Invalid onset feature frame count');
  for(const row of features){
    if(!row||row.length!==MEL_BANDS)throw Error('Invalid onset feature band count');
    for(let i=0;i<MEL_BANDS;i++)if(!Number.isFinite(row[i]))throw Error('Invalid onset feature value');
  }
}
function finiteFloat32(value:number):number{
  const result=Math.fround(value);
  if(!Number.isFinite(result))throw Error('Onset network arithmetic overflow');
  return result;
}
function conv1d(input:Features,layer:ConvLayer):Float32Array[]{
  return input.map((_,t)=>Float32Array.from({length:layer.bias.length},(_,o)=>{
    let sum=layer.bias[o];
    for(let c=0;c<input[0].length;c++)for(let k=0;k<5;k++){
      const source=t+k-2;
      if(source>=0&&source<input.length)sum+=input[source][c]*layer.weight[o][c][k];
    }
    return Math.max(0,finiteFloat32(sum));
  }));
}
function dense(input:Float32Array,layer:DenseLayer,relu:boolean):Float32Array{
  return Float32Array.from({length:layer.bias.length},(_,o)=>{
    let sum=layer.bias[o];
    for(let i=0;i<input.length;i++)sum+=input[i]*layer.weight[o][i];
    const value=finiteFloat32(sum);return relu?Math.max(0,value):value;
  });
}
function infer(features:Features,model:OnsetModel):OnsetEvidence{
  validateFeatures(features);
  const hidden=conv1d(conv1d(features,model.conv1),model.conv2);
  const pooled=new Float32Array(48);
  for(let c=0;c<24;c++){
    let sum=0,max=-Infinity;
    for(const frame of hidden){sum+=frame[c];max=Math.max(max,frame[c]);}
    pooled[c]=finiteFloat32(sum/N_FRAMES);pooled[24+c]=max;
  }
  const logits=Array.from(dense(dense(pooled,model.fc1,true),model.fc2,false));
  const max=Math.max(...logits),exp=logits.map(value=>Math.exp(value-max));
  const total=exp.reduce((sum,value)=>sum+value,0);
  return {classes:[...ONSET_CLASSES],logits,probabilities:exp.map(value=>value/total)};
}

/** Compile once per independently trained artifact; there are no default weights.
 * The caller must explicitly extract the feature version named by the model.
 * Inference consumes the supplied matrix without guessing or re-normalising it. */
export function createOnsetNetwork(value:unknown):(features:Features)=>OnsetEvidence{
  const model=validateOnsetModel(value);
  return features=>infer(features,model);
}
export function runOnsetNetwork(features:Features,model:unknown):OnsetEvidence{
  return createOnsetNetwork(model)(features);
}
