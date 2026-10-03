import {build} from 'esbuild';
import {execFileSync} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const [input,output,baseline='183cc1a6ba2d6c956ccfe3a393fdb6b9ede2b531']=process.argv.slice(2);
if(!input||!output||!resolve(output).startsWith(resolve('.runtime')+'/')||! /^[a-f0-9]{40}$/.test(baseline))throw Error('Private evidence paths and exact baseline required');
await mkdir(output,{recursive:false});
const data=JSON.parse(await readFile(input,'utf8'));
if(data.officialTestUsed!==false||data.trainedModel!==false)throw Error('Scope mismatch');
const options={entryPoints:['src/reference-score.ts'],bundle:true,platform:'node',format:'esm'};
await build({...options,outfile:output+'/candidate.mjs'});
await build({...options,outfile:output+'/baseline.mjs',plugins:[{name:'pinned-baseline',setup(b){
 b.onLoad({filter:/\/src\/(hf-score|reference-score)\.ts$/},args=>({contents:execFileSync('git',['show',baseline+':src/'+args.path.split('/').at(-1)],{encoding:'utf8'}),loader:'ts'}));
}}]});
const engines={baseline:await import(pathToFileURL(resolve(output+'/baseline.mjs')).href),candidate:await import(pathToFileURL(resolve(output+'/candidate.mjs')).href)};
const result={scope:data.scope,inputSha256:createHash('sha256').update(await readFile(input)).digest('hex'),baseline,results:{}};
for(const [name,engine] of Object.entries(engines)){
 const rows=data.rows.map(r=>{
  const [a,b]=data.pairs[r.pair],target=data.references[a],competitor=data.references[b];
  // A manually specified word pair, no invented learner-error label. Both
  // directions test contrast identification; the actual word is expert-high.
  const plan={mode:'contrast',calibrationKey:'handf/hf-en/'+r.pair+'/0/word/en-h-f:v1',spokenPrompt:a,
   target:{text:a,ipa:'h'},competitor:{text:b,ipa:'f'},profile:{id:'en-h-f:v1',unit:'phone',language:'en-US'}};
  const score=engine.referenceScore({id:r.clip,plan,samples:Float32Array.from(r.samples),target:Float32Array.from(target),competitor:Float32Array.from(competitor),voice:data.referenceVoice});
  return {clip:r.clip,speaker:r.speaker,split:r.split,word:r.word,side:r.side,pair:r.pair,
   status:score.status,reason:score.reason,score:score.score,closest:score.closestWord,heard:score.hf?.heard,margin:score.hf?.margin,
   correct:score.status==='matched'&&score.closestWord===r.word};
 });
 const summary=(rows)=>({examples:rows.length,speakers:new Set(rows.map(r=>r.speaker)).size,identified:rows.filter(r=>r.correct).length,
  wrong:rows.filter(r=>r.closest&&r.closest!==r.word).length,unresolved:rows.filter(r=>!r.closest).length});
 result.results[name]={summary:summary(rows),bySplit:Object.fromEntries(['train','development'].map(split=>[split,summary(rows.filter(r=>r.split===split))])),
  byWord:Object.fromEntries([...new Set(rows.map(r=>r.word))].sort().map(word=>[word,summary(rows.filter(r=>r.word===word))])),rows};
}
await writeFile(output+'/report.json',JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(Object.fromEntries(Object.entries(result.results).map(([k,v])=>[k,{summary:v.summary,bySplit:v.bySplit,byWord:v.byWord}]))));
