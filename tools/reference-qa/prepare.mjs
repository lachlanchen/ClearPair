import {build} from 'esbuild';
import {mkdir,writeFile,copyFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const out='.runtime/reference-qa/assets';
await mkdir(out+'/public',{recursive:true});
await mkdir('.runtime/reference-qa/res/values',{recursive:true});
await writeFile('.runtime/reference-qa/res/values/strings.xml','<resources><string name="app_name">ClearPair Reference QA</string><string name="title_activity_main">ClearPair Reference QA</string></resources>');
await build({entryPoints:[process.env.CLEARPAIR_QA_SCOPE==='hf'?'tools/reference-qa/hf-probe.ts':'tools/reference-qa/probe.ts'],bundle:true,format:'esm',platform:'browser',define:{CLEARPAIR_ALL_COURSES:JSON.stringify(process.env.CLEARPAIR_QA_SCOPE==='courses'),CLEARPAIR_QA_COURSE:JSON.stringify(process.env.CLEARPAIR_QA_COURSE??'')},outfile:out+'/public/probe.js'});
await build({entryPoints:['src/reference-score.worker.ts'],bundle:true,format:'esm',platform:'browser',outfile:out+'/public/reference-score.worker.js'});
await writeFile(out+'/public/index.html','<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><h1>ClearPair Reference QA</h1><pre id="result">Running…</pre><script type="module" src="probe.js"></script></body></html>');
for(const name of ['capacitor.config.json','capacitor.plugins.json'])await copyFile('native/apps/handf/android/app/src/main/assets/'+name,out+'/'+name);
const hashes={};
for(const name of ['index.html','probe.js','reference-score.worker.js'])
 hashes[name]=createHash('sha256').update(await readFile(out+'/public/'+name)).digest('hex');
await writeFile('.runtime/reference-qa/asset-hashes.json',JSON.stringify(hashes,null,2)+'\n');
console.log(out);
