import { chromium } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { mkdir,writeFile } from 'node:fs/promises';
const serial=process.env.CLEARPAIR_ADB_SERIAL||'emulator-5568';
if(!serial.startsWith('emulator-'))throw new Error('This smoke script is emulator-only. Do not operate an owner phone automatically.');
const allowed=['handf','landr','english','chinese','korean','arabic','cantonese'];
const ids=process.argv.find(arg=>arg.startsWith('--apps='))?.slice(7).split(',')||allowed;
if(!ids.length||ids.some(id=>!allowed.includes(id)))throw new Error('Unknown ClearPair app');
const port=9456,results=[];
await mkdir('.runtime/android-qa',{recursive:true});
function adb(...args){const r=spawnSync('adb',['-s',serial,...args],{encoding:'utf8',timeout:30_000});if(r.error)throw r.error;if(r.status!==0&&!(r.status===1&&args[0]==='shell'&&args[1]==='pidof'))throw new Error(r.stderr||r.stdout||`adb ${args.join(' ')} exited ${r.status}`);return r.stdout.trim()}
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function connect(pkg){
  let pid='';for(let i=0;i<30&&!pid;i++){pid=adb('shell','pidof',pkg);if(!pid)await delay(200)}
  if(!/^\d+$/.test(pid))throw new Error('Owned app process did not become ready');
  adb('forward',`tcp:${port}`,`localabstract:webview_devtools_remote_${pid}`);
  let error;
  for(let i=0;i<30;i++){
    try{
      const browser=await chromium.connectOverCDP(`http://127.0.0.1:${port}`,{timeout:2000,noDefaults:true,isWebView:true});
      const page=browser.contexts()[0]?.pages()[0];
      if(!page){await browser.close();throw new Error('No owned WebView page yet')}
      await page.waitForSelector('.tabs');
      return {browser,page,pid};
    }catch(e){error=e;await delay(200)}
  }
  throw error||new Error('WebView did not become ready');
}
for(const id of ids){
  const pkg=`art.lazying.clearpair.${id}`;
  let browser,pid;
  try{
    adb('install','-r',`.runtime/artifacts/clearpair-${id}-0.1.0-debug.apk`);
    adb('shell','pm','grant',pkg,'android.permission.RECORD_AUDIO');
    adb('shell','am','start','-n',`${pkg}/.MainActivity`);
    let connection=await connect(pkg);browser=connection.browser;pid=connection.pid;let page=connection.page;
    const native=await page.evaluate(()=>window.Capacitor?.isNativePlatform()&&window.Capacitor?.isPluginAvailable('ClearPairAudio'));
    if(!native)throw new Error('Native microphone plugin is not registered');
    const viewport=await page.evaluate(()=>({width:innerWidth,height:innerHeight,contentWidth:document.documentElement.scrollWidth,dpr:devicePixelRatio}));
    if(viewport.width>480||viewport.contentWidth>viewport.width)throw new Error('Phone viewport check failed');
    await page.getByRole('button',{name:'Practise',exact:true}).click();
    const button=page.getByRole('button',{name:'Record your voice',exact:true});
    const top=await button.evaluate(el=>el.getBoundingClientRect().top+scrollY);
    for(let attempt=0;attempt<2;attempt++){
      await button.click();await page.getByRole('button',{name:'Finish recording',exact:true}).waitFor();
      await delay(1400);await page.getByRole('button',{name:'Finish recording',exact:true}).click();
      await button.waitFor();await page.getByText('Saved on device',{exact:true}).waitFor();
    }
    const status=await page.locator('.result-area').innerText();
    if(!status.includes('No clear speech detected'))throw new Error('Silent emulator capture did not report no clear speech');
    const after=await button.evaluate(el=>el.getBoundingClientRect().top+scrollY);
    if(Math.abs(top-after)>1)throw new Error('Recording button moved after saving');
    const audio=await page.evaluate(async app=>new Promise((resolve,reject)=>{
      const request=indexedDB.open('clearpair-recordings',1);
      request.onerror=()=>reject(new Error('History database unavailable'));
      request.onsuccess=()=>{
        const database=request.result,tx=database.transaction('takes','readonly'),query=tx.objectStore('takes').getAll();
        query.onsuccess=()=>{
          const items=query.result.filter(t=>t.app===app);
          resolve(items.map(t=>({bytes:t.data.byteLength,header:new TextDecoder().decode(t.data.slice(0,4)),sampleRate:new DataView(t.data).getUint32(24,true),seconds:t.analysis.seconds,status:t.analysis.status})));
        };
        tx.oncomplete=()=>database.close();tx.onerror=()=>{database.close();reject(tx.error)};
      };
    }),id);
    if(audio.length<2||audio.some(t=>t.header!=='RIFF'||t.sampleRate!==16000||t.bytes<=44||t.seconds<.6||t.status!=='silent'))throw new Error('Native PCM/history verification failed');
    await page.getByRole('button',{name:'History',exact:true}).click();await page.locator('.history-item').first().waitFor();
    const count=await page.locator('.history-item').count();
    await page.locator('.history-item').first().getByRole('button').first().click();
    await page.getByText('Ready when you are',{exact:true}).waitFor();
    await page.screenshot({path:`.runtime/android-qa/${id}-history.png`,fullPage:false});
    await page.getByRole('button',{name:'Learn',exact:true}).click();await page.screenshot({path:`.runtime/android-qa/${id}-learn.png`,fullPage:false});
    await browser.close();browser=undefined;adb('shell','am','force-stop',pkg);adb('shell','am','start','-n',`${pkg}/.MainActivity`);
    connection=await connect(pkg);browser=connection.browser;page=connection.page;pid=connection.pid;
    await page.getByRole('button',{name:'History',exact:true}).click();
    await page.locator('.history-item').first().waitFor();
    if(await page.locator('.history-item').count()!==count)throw new Error('History did not survive app process restart');
    results.push({id,viewport,nativePlugin:true,silentCapture:'correctly-unscored',saved:true,historyCount:count,recordings:audio,recordControlStable:true,survivesAppRestart:true,realSpeechAccuracy:'not-tested'});
    console.log(`${id}: repeated native capture, PCM, save/replay, fixed controls and restart persistence passed`);
  }catch(error){results.push({id,error:error.message});console.error(`${id}: ${error.message}`);if(pid)try{await writeFile(`.runtime/android-qa/${id}-failure.log`,adb('logcat','--pid',pid,'-d','-t','120'))}catch{}}
  finally{await browser?.close();try{adb('shell','am','force-stop',pkg)}catch{};try{adb('forward','--remove',`tcp:${port}`)}catch{}}
}
await writeFile('.runtime/android-qa/results.json',JSON.stringify({at:new Date().toISOString(),serial,results},null,2)+'\n');
if(results.some(r=>'error' in r))process.exit(1);
