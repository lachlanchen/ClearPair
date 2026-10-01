// Private compatibility test with the real exported encoder; no calibration,
// production registry, network audio or human-accuracy claim.
import {build} from 'vite';
import {chromium} from '@playwright/test';
import {createServer} from 'node:http';
import {createReadStream} from 'node:fs';
import {readFile,stat,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {spawnSync} from 'node:child_process';
const variant=process.argv.find(a=>a.startsWith('--variant='))?.slice(10)||'original';
const repetitions=Number(process.argv.find(a=>a.startsWith('--repeat='))?.slice(9)||1);
const receipt=process.argv.find(a=>a.startsWith('--receipt='))?.slice(10);
if(!Number.isSafeInteger(repetitions)||repetitions<1||repetitions>10||receipt&&!/^[a-z0-9-]{1,64}$/.test(receipt))throw Error('Invalid repeat/receipt');
if(!['original','range7','u8','weight-only','fp32','context-weight-only'].includes(variant))throw Error('Unknown bounded quantization variant');
const roots={original:'local-export-english-v1',fp32:'local-export-english-v1',range7:'local-export-english-v2-range7',u8:'local-export-english-v3-u8','weight-only':'local-export-english-v4-weight-only','context-weight-only':'local-export-english-context-v1'};
const root=resolve('.runtime/model-audit/'+roots[variant]),dist=resolve('.runtime/local-runtime-probe');
const report=JSON.parse(await readFile(`${root}/regression.json`,'utf8'));
if(report.approved!==false||report.released!==false)throw Error('Probe must not imply approval');
const artifact=report.artifacts.find(a=>a.file===(variant==='fp32'?'english-fp32.onnx':'english-int8.onnx'));
if(!artifact)throw Error('Missing exact probe artifact');
await build({configFile:false,base:'/',publicDir:false,build:{outDir:dist,emptyOutDir:true,
 rollupOptions:{input:'tools/local-runtime-probe.ts',output:{entryFileNames:'probe.js'}}}});
await writeFile(`${dist}/index.html`,'<!doctype html><title>Private local encoder probe</title><script type="module" src="/probe.js"></script>');
const clip=process.argv.find(a=>a.startsWith('--clip='))?.slice(7);
if(clip&&!/^\d{9}$/.test(clip))throw Error('Invalid bounded development clip');
const reference=spawnSync('/home/lachlan/ProjectsLFS/LocalSTT/.venv/bin/python',['tools/local-runtime-reference.py',`--variant=${variant}`,...(clip?[`--clip=${clip}`]:[])],
 {encoding:'utf8',maxBuffer:10*1024*1024,timeout:60_000});
if(reference.status!==0)throw Error(reference.stderr||'Independent CPU probe failed');
const {samples,frames:expected}=JSON.parse(reference.stdout);
const model={id:`english-${variant}-RESEARCH-NOT-APPROVED`,language:'en-US',asset:'models/'+artifact.file,
 sha256:artifact.sha256,bytes:artifact.bytes,rate:16000,preprocessing:'mono-sinc-zscore:v1',
 input:'input_values',logitsOutput:'logits',featureNames:[],vocabulary:expected[0].length,blank:report.blank,separators:report.separators,
 rights:{redistributionApproved:false,termsUrl:'https://huggingface.co/'+report.model},tasks:[]};
const server=createServer(async(request,response)=>{
 try{
  const path=decodeURIComponent(new URL(request.url,'http://127.0.0.1').pathname);
  const file=path==='/models/'+artifact.file?`${root}/${artifact.file}`:resolve(dist,'.'+(path==='/'?'/index.html':path));
  if(file!==`${root}/${artifact.file}`&&!file.startsWith(dist+sep))throw Error('Unsafe test path');
  const info=await stat(file);if(!info.isFile())throw Error('Not a file');
  const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.wasm':'application/wasm','.onnx':'application/octet-stream'};
  response.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Content-Length':info.size});
  createReadStream(file).pipe(response);
 }catch{response.writeHead(404);response.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=`http://127.0.0.1:${server.address().port}`;
let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.CLEARPAIR_BROWSER||'/usr/bin/google-chrome'});
 const context=await browser.newContext(),external=[],errors=[];
 await context.route('**/*',route=>{
  if(new URL(route.request().url()).origin!==base){external.push(route.request().url());return route.abort();}
  return route.continue();
 });
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base);await page.waitForFunction(()=>typeof window.localProbe==='function');
 const actual=await page.evaluate(({model,samples,repetitions})=>window.localProbe(model,samples,repetitions),{model,samples,repetitions});
 if(actual.frames.length!==expected.length||actual.frames.some(row=>row.length!==model.vocabulary))throw Error('WASM output shape mismatch');
 let maxDifference=0,absolute=0,agreements=0,count=0,maxProbabilityDifference=0,totalVariation=0;
 const argmax=row=>row.indexOf(Math.max(...row));
 for(let t=0;t<expected.length;t++){
  if(argmax(expected[t])===argmax(actual.frames[t]))agreements++;
  for(let v=0;v<model.vocabulary;v++){
   const difference=Math.abs(expected[t][v]-actual.frames[t][v]);
   if(!Number.isFinite(difference))throw Error('Invalid WASM output');
   maxDifference=Math.max(maxDifference,difference);absolute+=difference;count++;
   const pd=Math.abs(Math.exp(expected[t][v])-Math.exp(actual.frames[t][v]));
   maxProbabilityDifference=Math.max(maxProbabilityDifference,pd);totalVariation+=pd/2;
  }
 }
 const compatible=maxDifference<=.03&&agreements/expected.length>=.98&&!external.length&&!errors.length&&
  actual.repetitions===repetitions&&actual.maximumRepeatDifference<=1e-6;
 const evidence={at:new Date().toISOString(),variant,purpose:`Real ${variant==='fp32'?'full-precision':'quantized'} encoder in packaged single-threaded browser WASM worker; ${clip?'adult training-split numerical probe':'synthetic input'}, NOT held-out human accuracy`,
  clip:clip??null,heldOut:false,
  approved:false,released:false,artifact,frames:expected.length,vocabulary:model.vocabulary,
  maxAbsoluteLogProbabilityDifference:maxDifference,meanAbsoluteLogProbabilityDifference:absolute/count,
  frameArgmaxAgreement:agreements/expected.length,verifiedMs:actual.verifiedMs,loadMs:actual.loadMs,inferMs:actual.inferMs,
  repetitions:actual.repetitions,inferenceTrialsMs:actual.inferenceTrialsMs,maximumRepeatDifference:actual.maximumRepeatDifference,
  maxProbabilityDifference,meanTotalVariation:totalVariation/expected.length,
  externalRequests:external,pageErrors:errors,compatible,
  caveat:'This strict numerical gate does not establish human accuracy. Failure is retained, never treated as approval.'};
 const suffix=variant==='fp32'?'-fp32':'';
 await writeFile(`${root}/${receipt||((clip?`browser-wasm-development-${clip}`:'browser-wasm')+suffix)}.json`,JSON.stringify(evidence,null,2)+'\n',receipt?{flag:'wx'}:undefined);
 if(!receipt)await writeFile(`${root}/${clip?`browser-frames-development-${clip}`:'browser-frames-synthetic'}${suffix}.json`,JSON.stringify(actual.frames)+'\n');
 console.log(JSON.stringify(evidence,null,2));
 if(!compatible)throw Error('WASM numerical regression failed; see preserved private evidence');
}finally{await browser?.close();await new Promise(r=>server.close(r));}
