// Run only under the workstation's explicit Android UI lease. Installs a distinct
// permission-free helper, never replaces a store app or clears anyone's data.
import {execFileSync} from 'node:child_process';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {chromium} from '@playwright/test';
import {totalPss,ownedRendererPids} from './memory.mjs';

const [serial,apkPath,outputPath]=process.argv.slice(2);
const apk=resolve(apkPath||''),output=resolve(outputPath||'');
const privateRoot=resolve('.runtime/android-model-qa')+'/';
if(!serial||!apk.startsWith(privateRoot)||!apk.endsWith('/clearpair-offline-qa.apk')||
   !output.startsWith(privateRoot))throw Error('Explicit device, built QA APK and private evidence directory required');
const application='art.lazying.clearpair.qa.model';
const native=process.argv.includes('--native');
const adb=(...args)=>execFileSync('adb',['-s',serial,...args],{encoding:'utf8',timeout:30_000,maxBuffer:8*1024*1024});
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
await mkdir(output,{recursive:false});
let port,browser,pid,started=false;
const evidence={startedAt:new Date().toISOString(),serial,apk,application,memory:[],approved:false};
try{
 evidence.previousFocus=adb('shell','dumpsys','activity','activities').split('\n').filter(x=>/mResumedActivity|topResumedActivity/.test(x));
 evidence.webview=adb('shell','dumpsys','webviewupdate');
 if(process.argv.includes('--installed')){
  evidence.install=adb('shell','pm','path',application);
  if(!evidence.install.startsWith('package:'))throw Error('Preinstalled diagnostic missing');
 }else evidence.install=adb('install','--no-incremental','-r',apk);
 const installedPath=adb('shell','pm','path',application).trim().replace(/^package:/,'');
 if(!/^\/data\/app\/[A-Za-z0-9_./=+-]+\/base\.apk$/.test(installedPath))throw Error('Unexpected installed package path');
 evidence.apkSha256=createHash('sha256').update(await readFile(apk)).digest('hex');
 if(adb('shell','sha256sum',installedPath).split(/\s/)[0]!==evidence.apkSha256)throw Error('Installed APK does not match selected artifact');
 // This exact app is ours; stale diagnostic activities must not contaminate the test.
 adb('shell','am','force-stop',application);
 const mode=native?['--ez','native','true',...(process.argv.includes('--xnnpack')?['--ez','xnnpack','true']:[])]:[];
 evidence.launch=adb('shell','am','start','-W','-n',application+'/.ModelActivity',...mode);
 started=true;
 for(let i=0;i<20&&!pid;i++){
  await pause(500);pid=adb('shell','pidof',application).trim();
 }
 if(!/^\d+$/.test(pid||''))throw Error('Single diagnostic process was not found');
 evidence.pid=Number(pid);
 let page;
 if(!native){
 port=adb('forward','tcp:0',`localabstract:webview_devtools_remote_${pid}`).trim();
 if(!/^\d+$/.test(port))throw Error('Invalid allocated DevTools port');
 for(let i=0;i<20&&!browser;i++){
  try{browser=await chromium.connectOverCDP(`http://127.0.0.1:${port}`,{timeout:2000});}
  catch(error){if(i===19)throw error;await pause(500);}
 }
 page=browser.contexts().flatMap(c=>c.pages()).find(p=>p.url()==='https://qa.clearpair.invalid/index.html');
 if(!page)throw Error('Diagnostic WebView URL not found');
 }
 const deadline=Date.now()+110_000;
 while(Date.now()<deadline){
  const memory=adb('shell','dumpsys','meminfo','-s',application);
  const processes=native?'':adb('shell','dumpsys','activity','processes');
  const rendererPids=ownedRendererPids(processes,application);
  const renderers=rendererPids.map(pid=>({pid:Number(pid),pssKiB:totalPss(adb('shell','dumpsys','meminfo','-s',pid))}));
  evidence.memory.push({atMs:Date.now(),appPssKiB:totalPss(memory),renderers});
  if(evidence.memory.length===1)await writeFile(`${output}/first-meminfo.txt`,memory,{flag:'wx'});
  let result;
  if(native){
   const log=adb('logcat','-d','-t','500','--pid='+pid,'-s','ClearPairModelQA');
   const line=log.split('\n').find(line=>line.includes('CLEARPAIR_MODEL_QA_RESULT '));
   if(line)result=JSON.parse(line.split('CLEARPAIR_MODEL_QA_RESULT ')[1]);
  }else result=await page.evaluate(()=>window.qaResult||null);
  if(result){evidence.result=result;break;}
  await pause(1000);
 }
 if(!evidence.result)throw Error('Bounded diagnostic deadline exceeded');
 if(page)await page.screenshot({path:`${output}/webview.png`});
 const known=evidence.memory.filter(m=>m.appPssKiB!==null);
 evidence.peakObservedAppPssKiB=known.length?Math.max(...known.map(m=>m.appPssKiB)):null;
 const combined=evidence.memory.filter(m=>m.appPssKiB!==null&&(native||m.renderers.length>0)&&m.renderers.every(r=>r.pssKiB!==null));
 evidence.peakObservedCombinedPssKiB=combined.length?Math.max(...combined.map(m=>m.appPssKiB+m.renderers.reduce((s,r)=>s+r.pssKiB,0))):null;
 evidence.memoryScope='Sampled host plus explicitly package/caller-attributed isolated renderer PSS; not a continuous allocation peak.';
 await writeFile(`${output}/processes.txt`,adb('shell','dumpsys','activity','processes'),{flag:'wx'});
 await writeFile(`${output}/webview-services.txt`,adb('shell','dumpsys','activity','services','com.google.android.webview'),{flag:'wx'});
 if(!evidence.result.completed||!evidence.result.compatible)throw Error('Device runtime numerical check failed');
}catch(error){evidence.error=String(error);process.exitCode=1;}
finally{
 if(pid){try{await writeFile(`${output}/qa-log.txt`,adb('logcat','-d','-t','1000','--pid='+pid,'-s','ClearPairModelQA'),{flag:'wx'});}catch(error){evidence.logError=String(error);}}
 if(started){try{adb('shell','am','force-stop',application);}catch(error){evidence.stopError=String(error);}}
 if(browser)await browser.close().catch(()=>{});
 if(port){try{adb('forward','--remove','tcp:'+port);}catch(error){evidence.forwardCleanupError=String(error);}}
 evidence.finishedAt=new Date().toISOString();
 await writeFile(`${output}/result.json`,JSON.stringify(evidence,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({output,result:evidence.result,error:evidence.error,peakObservedAppPssKiB:evidence.peakObservedAppPssKiB}));
}
