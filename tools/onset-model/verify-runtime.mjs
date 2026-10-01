#!/usr/bin/env node
/** Verify an independently trained onset artifact against its saved Python
 * outputs. This reports numerical/runtime evidence, never pronunciation grades.
 * Usage: node tools/onset-model/verify-runtime.mjs ARTIFACT_DIRECTORY [--repetitions 20]
 */
import {createHash} from 'node:crypto';
import {lstat,mkdir,mkdtemp,open,readFile,writeFile} from 'node:fs/promises';
import {cpus} from 'node:os';
import {dirname,join,resolve} from 'node:path';
import {performance} from 'node:perf_hooks';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {build} from 'esbuild';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const LOGIT_TOLERANCE=1e-4,PROBABILITY_TOLERANCE=1e-4;
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');

async function boundedFile(path,limit){
  const file=await open(path,'r');
  try{
    const stat=await file.stat();
    if(!stat.isFile()||stat.size<1||stat.size>limit)throw Error(`Invalid or oversized artifact: ${path}`);
    // Read only the observed size plus one byte, so a racing writer cannot turn
    // a small stat into an unbounded read or silently change the snapshot size.
    const buffer=Buffer.alloc(stat.size+1);let offset=0;
    while(offset<buffer.length){
      const {bytesRead}=await file.read(buffer,offset,buffer.length-offset,offset);
      if(!bytesRead)break;
      offset+=bytesRead;
    }
    if(offset!==stat.size)throw Error(`Artifact changed during read: ${path}`);
    return buffer.subarray(0,offset);
  }finally{await file.close();}
}
function vector(value,size,name){
  if(!Array.isArray(value)||value.length!==size||value.some(v=>typeof v!=='number'||!Number.isFinite(v)))
    throw Error(`Invalid ${name}`);
  return value;
}
function softmax(logits){
  const max=Math.max(...logits),values=logits.map(value=>Math.exp(value-max));
  const total=values.reduce((sum,value)=>sum+value,0);
  return values.map(value=>value/total);
}
const argmax=values=>values.indexOf(Math.max(...values));
const maximumError=(actual,expected)=>Math.max(...actual.map((value,i)=>Math.abs(value-expected[i])));
function percentile(sorted,fraction){
  const at=(sorted.length-1)*fraction,lo=Math.floor(at),hi=Math.ceil(at);
  return sorted[lo]+(sorted[hi]-sorted[lo])*(at-lo);
}

export async function verifyRuntime(directory,repetitions=20){
  if(!Number.isInteger(repetitions)||repetitions<1||repetitions>50)throw Error('Repetitions must be an integer in 1..50');
  const artifact=resolve(directory),receiptPath=join(artifact,'parity-receipt.json');
  try{await lstat(receiptPath);throw Error(`Refusing to overwrite existing receipt: ${receiptPath}`);}
  catch(error){if(error.code!=='ENOENT')throw error;}
  const modelPath=join(artifact,'model.json'),parityPath=join(artifact,'parity.json');
  const [modelBytes,parityBytes]=await Promise.all([
    boundedFile(modelPath,4*1024*1024),boundedFile(parityPath,8*1024*1024),
  ]);
  const modelSha256=sha256(modelBytes),paritySha256=sha256(parityBytes);
  const model=JSON.parse(modelBytes.toString('utf8')),parity=JSON.parse(parityBytes.toString('utf8'));
  if(!parity||!/^[a-f0-9]{64}$/.test(parity.modelSha256)||parity.modelSha256!==modelSha256)
    throw Error('Parity fixture does not belong to this exact model artifact');
  if(!Array.isArray(parity.examples)||parity.examples.length<1||parity.examples.length>100)
    throw Error('Parity requires 1..100 bounded examples');
  const fixtures=parity.examples.map((example,index)=>{
    if(!example||!Array.isArray(example.features)||example.features.length!==28)throw Error(`Invalid feature frames at example ${index}`);
    const features=example.features.map(row=>Float32Array.from(vector(row,40,`feature bands at example ${index}`)));
    const logits=vector(example.logits,5,`Python logits at example ${index}`);
    const hasProbabilities=example.probabilities!==undefined;
    const probabilities=hasProbabilities?vector(example.probabilities,5,`Python probabilities at example ${index}`):softmax(logits);
    if(probabilities.some(p=>p<0||p>1)||Math.abs(probabilities.reduce((sum,p)=>sum+p,0)-1)>1e-5)
      throw Error(`Invalid probability distribution at example ${index}`);
    return {index,features,logits,probabilities,hasProbabilities};
  });
  const runtimeRoot=join(ROOT,'.runtime','onset-runtime-checks');
  await mkdir(runtimeRoot,{recursive:true});
  const runDirectory=await mkdtemp(join(runtimeRoot,'run-')),bundlePath=join(runDirectory,'onset-network.mjs');
  const bundled=await build({absWorkingDir:ROOT,entryPoints:['src/onset-network.ts'],bundle:true,
    platform:'node',format:'esm',target:'node20',outfile:bundlePath,metafile:true,logLevel:'silent'});
  const sourceSha256={};
  for(const path of Object.keys(bundled.metafile.inputs).sort())sourceSha256[path]=sha256(await readFile(resolve(ROOT,path)));
  const {createOnsetNetwork,ONSET_CLASSES}=await import(pathToFileURL(bundlePath).href);
  const infer=createOnsetNetwork(model);
  const examples=fixtures.map(fixture=>{
    const result=infer(fixture.features);
    const pythonIndex=argmax(fixture.logits),runtimeIndex=argmax(result.logits);
    return {index:fixture.index,maxAbsoluteLogitError:maximumError(result.logits,fixture.logits),
      maxAbsoluteProbabilityError:maximumError(result.probabilities,fixture.probabilities),
      probabilityReference:fixture.hasProbabilities?'saved-python-probabilities':'softmax(saved-python-logits)',
      pythonArgmax:ONSET_CLASSES[pythonIndex],runtimeArgmax:ONSET_CLASSES[runtimeIndex],argmaxMatches:pythonIndex===runtimeIndex,
      pythonLogits:fixture.logits,runtimeLogits:result.logits};
  });
  const maxAbsoluteLogitError=Math.max(...examples.map(row=>row.maxAbsoluteLogitError));
  const maxAbsoluteProbabilityError=Math.max(...examples.map(row=>row.maxAbsoluteProbabilityError));
  const argmaxMatches=examples.filter(row=>row.argmaxMatches).length;
  const passed=maxAbsoluteLogitError<=LOGIT_TOLERANCE&&maxAbsoluteProbabilityError<=PROBABILITY_TOLERANCE&&argmaxMatches===examples.length;

  // Bounded CPU-only Node measurement. Precomputed features exclude audio
  // decoding, log-mel extraction, JSON parsing and one-time model validation.
  const samples=fixtures.slice(0,10),warmupPasses=5,timings=[];
  for(let pass=0;pass<warmupPasses;pass++)for(const sample of samples)infer(sample.features);
  for(let pass=0;pass<repetitions;pass++)for(const sample of samples){
    const start=performance.now();infer(sample.features);timings.push(performance.now()-start);
  }
  timings.sort((a,b)=>a-b);
  const [finalModel,finalParity]=await Promise.all([
    boundedFile(modelPath,4*1024*1024),boundedFile(parityPath,8*1024*1024),
  ]);
  if(sha256(finalModel)!==modelSha256||sha256(finalParity)!==paritySha256)throw Error('Artifact changed during verification');
  const receipt={version:'clearpair-onset-runtime-parity:v1',createdAt:new Date().toISOString(),
    scope:'Saved Python vs current TypeScript numerical parity; Node CPU timing only; not a phone test or pronunciation grade',
    modelSha256,modelBytes:modelBytes.length,paritySha256,parityBytes:parityBytes.length,
    bundleSha256:sha256(await readFile(bundlePath)),sourceSha256,runDirectory,
    tolerances:{absoluteLogits:LOGIT_TOLERANCE,absoluteProbabilities:PROBABILITY_TOLERANCE},
    passed,exampleCount:examples.length,maxAbsoluteLogitError,maxAbsoluteProbabilityError,argmaxMatches,examples,
    benchmark:{environment:'Node CPU, warm CNN only, precomputed features',node:process.version,
      platform:process.platform,architecture:process.arch,cpu:cpus()[0]?.model??null,
      samples:samples.length,warmupPasses,repetitions,measurements:timings.length,
      medianMs:percentile(timings,.5),p95Ms:percentile(timings,.95),minMs:timings[0],maxMs:timings.at(-1)},
    approved:false,released:false};
  await writeFile(receiptPath,JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
  return {receipt,receiptPath};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const args=process.argv.slice(2);
    if(args.length!==1&&!(args.length===3&&args[1]==='--repetitions'))
      throw Error('Usage: node tools/onset-model/verify-runtime.mjs ARTIFACT_DIRECTORY [--repetitions 20]');
    const {receipt,receiptPath}=await verifyRuntime(args[0],args.length===3?Number(args[2]):20);
    console.log(JSON.stringify({receiptPath,passed:receipt.passed,examples:receipt.exampleCount,
      maxAbsoluteLogitError:receipt.maxAbsoluteLogitError,maxAbsoluteProbabilityError:receipt.maxAbsoluteProbabilityError,
      argmaxMatches:receipt.argmaxMatches,benchmark:receipt.benchmark}));
    if(!receipt.passed)process.exitCode=1;
  }catch(error){console.error(error.message);process.exitCode=1;}
}
