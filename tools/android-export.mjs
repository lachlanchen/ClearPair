import { chromium } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
const serial='emulator-5568',pkg='art.lazying.clearpair.english',port=9456;
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function bytes(...args){const r=spawnSync('adb',['-s',serial,...args],{timeout:30_000});if(r.error)throw r.error;if(r.status!==0&&!(r.status===1&&args[0]==='shell'&&args[1]==='pidof'))throw new Error(String(r.stderr)||'adb failed');return r.stdout;}
const adb=(...args)=>String(bytes(...args)).trim();
let browser;
const result={at:new Date().toISOString(),serial,pkg,sentToRecipient:false};
try{
  adb('install','-r','.runtime/artifacts/clearpair-english-0.1.0-debug.apk');
  adb('shell','am','start','-n',`${pkg}/.MainActivity`);
  let pid='';for(let i=0;i<30&&!pid;i++){pid=adb('shell','pidof',pkg);if(!pid)await delay(200)}
  if(!/^\d+$/.test(pid))throw new Error('Owned app did not launch');
  adb('forward',`tcp:${port}`,`localabstract:webview_devtools_remote_${pid}`);
  for(let i=0;i<30;i++){try{browser=await chromium.connectOverCDP(`http://127.0.0.1:${port}`,{timeout:2000,noDefaults:true,isWebView:true});break}catch(error){if(i===29)throw error;await delay(200)}}
  const page=browser.contexts()[0].pages()[0];
  await page.getByRole('button',{name:'History',exact:true}).click();
  await page.locator('.history-item').first().waitFor();
  const original=await page.evaluate(async()=>{
    const audio=await new Promise((resolve,reject)=>{
      const request=indexedDB.open('clearpair-recordings',1);
      request.onerror=()=>reject(request.error);
      request.onsuccess=()=>{
        const db=request.result,tx=db.transaction('takes','readonly'),q=tx.objectStore('takes').getAll();
        q.onsuccess=()=>resolve(q.result.filter(t=>t.app==='english').sort((a,b)=>b.createdAt-a.createdAt||b.id.localeCompare(a.id))[0].data);
        tx.oncomplete=()=>db.close();tx.onerror=()=>{db.close();reject(tx.error)};
      };
    });
    const hash=await crypto.subtle.digest('SHA-256',audio);
    return {bytes:audio.byteLength,sha256:[...new Uint8Array(hash)].map(n=>n.toString(16).padStart(2,'0')).join('')};
  });
  await page.locator('.history-item').first().getByRole('button',{name:/^Export /}).click();
  let chooser=false;
  for(let i=0;i<40;i++){
    const windows=adb('shell','dumpsys','window');
    chooser=windows.split('\n').some(line=>/mCurrentFocus.*(?:ChooserActivity|ResolverActivity)/.test(line));
    if(chooser)break;
    await delay(250);
  }
  if(!chooser)throw new Error('Native Android share sheet did not open');
  const name=adb('shell','run-as',pkg,'ls','-t','cache/clearpair-exports').split('\n')[0];
  if(!/^clearpair-export-[A-Za-z0-9._-]+\.wav$/.test(name))throw new Error('Unsafe or missing export filename');
  const exported=bytes('exec-out','run-as',pkg,'cat',`cache/clearpair-exports/${name}`);
  if(exported.length!==original.bytes||createHash('sha256').update(exported).digest('hex')!==original.sha256)throw new Error('Export is not byte-identical to the saved recording');
  result.nativeShareSheet=true;result.byteIdentical=true;result.bytes=exported.length;
  // Window focus changes before the chooser's entrance animation has drawn.
  await delay(1000);
  await writeFile('.runtime/android-qa/english-share-sheet.png',bytes('exec-out','screencap','-p'));
  adb('shell','input','keyevent','4');
  await page.getByRole('button',{name:'Practise',exact:true}).click();
  for(let attempt=0;attempt<3;attempt++){
    await page.getByRole('button',{name:'Hear the pair',exact:true}).click();
    await page.getByText('Playing',{exact:true}).waitFor();
    await page.getByText('Ready when you are',{exact:true}).waitFor();
  }
  await page.getByRole('button',{name:'Loop pair',exact:true}).click();
  await page.getByText('Repeating until you stop',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Stop',exact:true}).click();
  await page.getByText('Ready when you are',{exact:true}).waitFor();
  result.repeatedPairPlayback=true;result.loopStop=true;result.audibility='not-tested-no-audio-emulator';
  console.log('Native share sheet, byte-identical export, repeated pair playback and loop Stop passed; nothing sent.');
}catch(error){result.error=error.message;console.error(error.message);process.exitCode=1;}
finally{
  await browser?.close();
  try{adb('shell','am','force-stop',pkg)}catch{}
  try{adb('forward','--remove',`tcp:${port}`)}catch{}
  await writeFile('.runtime/android-qa/export.json',JSON.stringify(result,null,2)+'\n');
}
