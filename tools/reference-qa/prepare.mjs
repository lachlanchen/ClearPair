import {build} from 'esbuild';
import {mkdir,writeFile,copyFile,readFile,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const out=process.env.CLEARPAIR_QA_OUTPUT??'.runtime/reference-qa/assets';
const selectedLesson=process.env.CLEARPAIR_QA_LESSON??'';
if(selectedLesson&&!/^[a-z0-9-]+$/.test(selectedLesson))throw Error('Invalid diagnostic lesson selector');
if(!/^\.runtime\/reference-qa\/[a-zA-Z0-9/_-]+$/.test(out))throw Error('QA output must be a project-owned runtime path');
await mkdir(out+'/public',{recursive:true});
await mkdir('.runtime/reference-qa/res/values',{recursive:true});
await writeFile('.runtime/reference-qa/res/values/strings.xml','<resources><string name="app_name">ClearPair Reference QA</string><string name="title_activity_main">ClearPair Reference QA</string></resources>');
await build({entryPoints:[process.env.CLEARPAIR_QA_SCOPE==='pair-offline'?'tools/reference-qa/pair-offline-probe.ts':process.env.CLEARPAIR_QA_SCOPE==='hf-offline'?'tools/reference-qa/hf-offline-probe.ts':process.env.CLEARPAIR_QA_SCOPE==='hf'?'tools/reference-qa/hf-probe.ts':'tools/reference-qa/probe.ts'],bundle:true,format:'esm',platform:'browser',define:{CLEARPAIR_ALL_COURSES:JSON.stringify(process.env.CLEARPAIR_QA_SCOPE==='courses'),CLEARPAIR_QA_COURSE:JSON.stringify(process.env.CLEARPAIR_QA_COURSE??''),CLEARPAIR_QA_LESSON:JSON.stringify(selectedLesson),CLEARPAIR_QA_CAPTURE_REFERENCES:JSON.stringify(process.env.CLEARPAIR_QA_CAPTURE_REFERENCES==='1'),CLEARPAIR_QA_USE_FIXTURES:JSON.stringify(!!process.env.CLEARPAIR_QA_FIXTURES),CLEARPAIR_QA_REFERENCE_ONLY:JSON.stringify(process.env.CLEARPAIR_QA_REFERENCE_ONLY==='1'),CLEARPAIR_QA_INCLUDE_SENTENCES:JSON.stringify(process.env.CLEARPAIR_QA_INCLUDE_SENTENCES==='1')},outfile:out+'/public/probe.js'});
if(process.env.CLEARPAIR_QA_FIXTURES){
 const file=process.env.CLEARPAIR_QA_FIXTURES;
 if(!/^\.runtime\/reference-qa\/pair-[a-z]+10\/fixtures\.json$/.test(file))throw Error('Private QA fixture path required');
 const fixtures=JSON.parse(await readFile(file,'utf8'));
 if(fixtures.app!==process.env.CLEARPAIR_QA_COURSE||fixtures.scope!=='Synthetic private QA only; not shipped voices or microphone evidence')throw Error('Wrong fixture scope');
 await copyFile(file,out+'/public/fixtures.json');
}
if(process.env.CLEARPAIR_QA_REFERENCE_ONLY==='1')await rm(out+'/public/models',{recursive:true,force:true});
if(['hf-offline','pair-offline'].includes(process.env.CLEARPAIR_QA_SCOPE)&&process.env.CLEARPAIR_QA_REFERENCE_ONLY!=='1'){
 const {prepareHfWordModels}=await import('../hf-word-models.mjs');
 if(process.env.CLEARPAIR_QA_SCOPE==='hf-offline')await prepareHfWordModels(out+'/public/models');
 if(process.env.CLEARPAIR_QA_SCOPE==='pair-offline'){
  const {preparePairWordModels}=await import('../pair-word-models.mjs');
  await preparePairWordModels(process.env.CLEARPAIR_QA_COURSE,out+'/public/models');
  await preparePairWordModels(process.env.CLEARPAIR_QA_COURSE,out+'/public/models',true);
 }
}
await build({entryPoints:['src/reference-score.worker.ts'],bundle:true,format:'esm',platform:'browser',outfile:out+'/public/reference-score.worker.js'});
await writeFile(out+'/public/index.html','<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><h1>ClearPair Reference QA</h1><pre id="result">Running…</pre><script type="module" src="probe.js"></script></body></html>');
for(const name of ['capacitor.config.json','capacitor.plugins.json'])await copyFile('native/apps/handf/android/app/src/main/assets/'+name,out+'/'+name);
// Only the separate, unsigned iOS QA helper enables console receipts. Never
// change logging/privacy settings in the installed or release application.
const iosConfig=JSON.parse(await readFile('native/apps/handf/ios/App/App/capacitor.config.json','utf8'));
await writeFile('.runtime/reference-qa/ios-capacitor.config.json',JSON.stringify({...iosConfig,loggingBehavior:'debug'},null,2)+'\n');
const hashes={};
for(const name of ['index.html','probe.js','reference-score.worker.js'])
 hashes[name]=createHash('sha256').update(await readFile(out+'/public/'+name)).digest('hex');
await writeFile(out+'/asset-hashes.json',JSON.stringify(hashes,null,2)+'\n');
console.log(out);
