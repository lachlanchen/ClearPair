import {execFileSync,spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';
const serial='eca0e924',pkg='art.lazying.clearpair.qa.reference',port=9457;
const stamp=new Date().toISOString().replaceAll(/[:.]/g,'-'),out='.runtime/reference-qa/android-'+stamp;
await mkdir(out,{recursive:true});
const adb=(...args)=>execFileSync('adb',['-s',serial,...args],{encoding:'utf8',timeout:args.includes('uiautomator')?35_000:15_000}).trim();
const delay=ms=>new Promise(r=>setTimeout(r,ms));
let browser,install,page;
try{
 let done=false;
 install=spawn('adb',['-s',serial,'install','--no-incremental','-r','native/apps/handf/android/app/build/outputs/apk/debug/app-debug.apk'],{stdio:['ignore','pipe','pipe']});
 install.stdout.pipe(process.stdout);install.stderr.pipe(process.stderr);install.on('exit',()=>{done=true;});
 const installDeadline=Date.now()+120_000;
 for(let i=0;Date.now()<installDeadline&&!done;i++){
  await delay(1000);
  if(i%4!==3)continue;
  const top=adb('shell','dumpsys','activity','activities');
  if(!/ResumedActivity:[^\n]*com\.miui\.permcenter\.install\.AdbInstallActivity/.test(top))continue;
  const file='/data/local/tmp/clearpair-reference-install.xml';
  // MIUI's accessibility dumper can transiently stall on its install sheet.
  // Retry within a wall-clock deadline; never click without the exact QA title.
  try{adb('shell','uiautomator','dump','--compressed',file);}catch{continue;}
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
 for(let i=0;i<40&&!page;i++){page=browser?.contexts()[0]?.pages()[0];if(!page)await delay(250);}
 if(!page)throw Error('No QA WebView');
 // Broad unrestricted lexicons and carrier clips need a longer regression
 // suite deadline on older phones. Each individual decoder retains its own
 // short deadline; this does not extend the user's scoring wait.
 await page.waitForFunction(()=>window.referenceQA||document.getElementById('result')?.dataset.error,undefined,{timeout:1800000});
 const error=await page.locator('#result').getAttribute('data-error');
 if(error)throw Error('Native QA failed: '+error);
 const receipt=await page.evaluate(()=>window.referenceQA);
 await writeFile(out+'/result.json',JSON.stringify(receipt,null,2));
 await page.screenshot({path:out+'/result.png'});
 console.log(JSON.stringify({app:receipt.app,scope:receipt.scope,result:out+'/result.json',checks:receipt.results.length,
  passed:receipt.results.filter(r=>r.passed===true).length,failed:receipt.results.filter(r=>r.passed!==true).map(r=>[r.lesson,r.pair??r.cycle,r.side,r.error])}));
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
