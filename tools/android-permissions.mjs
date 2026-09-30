import { chromium } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
const serial='emulator-5568',pkg='art.lazying.clearpair.english',port=9456;
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function adb(...args){
  const r=spawnSync('adb',['-s',serial,...args],{encoding:'utf8',timeout:30_000});
  if(r.error)throw r.error;
  if(r.status!==0&&!(r.status===1&&args[0]==='shell'&&args[1]==='pidof'))throw new Error(r.stderr||r.stdout||'adb failed');
  return r.stdout.trim();
}
async function permissionButton(id){
  let xml='';
  for(let i=0;i<8;i++){
    adb('shell','uiautomator','dump','/sdcard/clearpair-permission.xml');
    xml=adb('shell','cat','/sdcard/clearpair-permission.xml');
    if(!xml.includes('ClearPair English'))throw new Error('Permission dialog is not for the owned app');
    const node=[...xml.matchAll(/<node\b[^>]*>/g)].map(m=>m[0]).find(tag=>tag.includes(`resource-id="com.android.permissioncontroller:id/${id}"`));
    const bounds=node?.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
    if(bounds){const [,x1,y1,x2,y2]=bounds.map(Number);adb('shell','input','tap',String(Math.floor((x1+x2)/2)),String(Math.floor((y1+y2)/2)));return;}
    await delay(250);
  }
  throw new Error(`Permission action ${id} not found`);
}
let browser;
const result={at:new Date().toISOString(),serial,pkg,realSpeechAccuracy:'not-tested'};
try{
  adb('shell','am','force-stop',pkg);
  adb('shell','pm','revoke',pkg,'android.permission.RECORD_AUDIO');
  adb('shell','pm','clear-permission-flags',pkg,'android.permission.RECORD_AUDIO','user-set','user-fixed');
  adb('shell','am','start','-n',`${pkg}/.MainActivity`);
  let pid='';for(let i=0;i<30&&!pid;i++){pid=adb('shell','pidof',pkg);if(!pid)await delay(200)}
  if(!/^\d+$/.test(pid))throw new Error('Owned app did not launch');
  adb('forward',`tcp:${port}`,`localabstract:webview_devtools_remote_${pid}`);
  for(let i=0;i<30;i++){try{browser=await chromium.connectOverCDP(`http://127.0.0.1:${port}`,{timeout:2000,noDefaults:true,isWebView:true});break}catch(error){if(i===29)throw error;await delay(200)}}
  const page=browser.contexts()[0].pages()[0];
  await page.getByRole('button',{name:'Practise',exact:true}).click();
  const record=page.getByRole('button',{name:'Record your voice',exact:true});
  await record.click();
  await permissionButton('permission_deny_button');
  await page.getByText('Microphone permission is required. Enable it in Android Settings.',{exact:true}).waitFor();
  await record.waitFor();
  result.denialFeedback=true;
  await record.click();
  await permissionButton('permission_allow_foreground_only_button');
  await page.getByRole('button',{name:'Finish recording',exact:true}).waitFor();
  await delay(1200);
  await page.getByRole('button',{name:'Finish recording',exact:true}).click();
  await page.getByText('Saved on device',{exact:true}).waitFor();
  result.grantAfterDenial=true;
  await record.click();
  await page.getByRole('button',{name:'Finish recording',exact:true}).waitFor();
  await delay(1200);
  adb('shell','input','keyevent','3');
  await delay(1000);
  adb('shell','am','start','-n',`${pkg}/.MainActivity`);
  await record.waitFor();
  await page.getByText('Saved on device',{exact:true}).waitFor();
  result.backgroundStopsAndSaves=true;
  await page.screenshot({path:'.runtime/android-qa/english-permission-recovery.png',fullPage:false});
  console.log('Android microphone denial, grant/retry, and background save passed');
}catch(error){result.error=error.message;console.error(error.message);process.exitCode=1;}
finally{
  await browser?.close();
  try{adb('shell','am','force-stop',pkg)}catch{}
  try{adb('forward','--remove',`tcp:${port}`)}catch{}
  await writeFile('.runtime/android-qa/permissions.json',JSON.stringify(result,null,2)+'\n');
}
