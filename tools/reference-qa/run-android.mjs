import {execFileSync,spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';
const serial='eca0e924',pkg='art.lazying.clearpair.qa.reference',port=9457;
const stamp=new Date().toISOString().replaceAll(/[:.]/g,'-'),out='.runtime/reference-qa/android-'+stamp;
await mkdir(out,{recursive:true});
const adb=(...args)=>execFileSync('adb',['-s',serial,...args],{encoding:'utf8',timeout:15_000}).trim();
const delay=ms=>new Promise(r=>setTimeout(r,ms));
let browser,install,page;
try{
 let done=false;
 install=spawn('adb',['-s',serial,'install','--no-incremental','-r','native/apps/handf/android/app/build/outputs/apk/debug/app-debug.apk'],{stdio:['ignore','pipe','pipe']});
 install.stdout.pipe(process.stdout);install.stderr.pipe(process.stderr);install.on('exit',()=>{done=true;});
 for(let i=0;i<120&&!done;i++){
  await delay(1000);
  if(i%4!==3)continue;
  const top=adb('shell','dumpsys','activity','activities');
  if(!/ResumedActivity:[^\n]*com\.miui\.permcenter\.install\.AdbInstallActivity/.test(top))continue;
  const file='/data/local/tmp/clearpair-reference-install.xml';
  adb('shell','uiautomator','dump','--compressed',file);
  const xml=adb('shell','cat',file);await writeFile(out+'/install.xml',xml);
  const button=(xml.match(/<node\b[^>]*>/g)||[]).find(n=>n.includes('text="继续安装"')&&n.includes('enabled="true"')&&n.includes('package="com.miui.securitycenter"'));
  if(xml.includes('text="ClearPair Reference QA"')&&button){
   const match=button.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
   if(match){const [,x1,y1,x2,y2]=match.map(Number);adb('shell','input','tap',String(Math.round((x1+x2)/2)),String(Math.round((y1+y2)/2)));}
  }
 }
 if(!done||install.exitCode!==0)throw Error('QA install did not succeed');
 adb('shell','am','start','-n',pkg+'/art.lazying.clearpair.handf.MainActivity');
 let pid='';for(let i=0;i<30&&!pid;i++){try{pid=adb('shell','pidof',pkg);}catch{}await delay(100);}
 if(!/^\d+$/.test(pid))throw Error('No exact QA process');
 adb('forward','tcp:'+port,'localabstract:webview_devtools_remote_'+pid);
 for(let i=0;i<25;i++){
  try{browser=await chromium.connectOverCDP('http://127.0.0.1:'+port,{timeout:1500,noDefaults:true,isWebView:true});break;}catch{await delay(200);}
 }
 page=browser?.contexts()[0]?.pages()[0];if(!page)throw Error('No QA WebView');
 await page.waitForFunction(()=>window.referenceQA,undefined,{timeout:600000});
 const receipt=await page.evaluate(()=>window.referenceQA);
 await writeFile(out+'/result.json',JSON.stringify(receipt,null,2));
 await page.screenshot({path:out+'/result.png'});
 console.log(JSON.stringify(receipt));
}catch(error){
 if(page){
  await writeFile(out+'/failure-text.txt',await page.locator('body').innerText().catch(()=>''));
  await page.screenshot({path:out+'/failure.png'}).catch(()=>{});
 }
 throw error;
}finally{
 if(install?.exitCode===null)install.kill('SIGTERM');
 await browser?.close();try{adb('shell','am','force-stop',pkg);}catch{}
 try{adb('forward','--remove','tcp:'+port);}catch{}
}
