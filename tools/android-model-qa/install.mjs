// Observe a single exact QA-install prompt under an already-held Android lease.
// Optional exact-label confirmation is only for this owner-authorized helper.
// Never changes security settings or dismisses another application's dialog.
import {spawn,execFileSync} from 'node:child_process';
import {writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const [serial,path]=process.argv.slice(2),apk=resolve(path||'');
if(!serial||!apk.startsWith(resolve('.runtime/android-model-qa')+'/')||!apk.endsWith('/clearpair-offline-qa.apk'))throw Error('Exact QA APK required');
const child=spawn('adb',['-s',serial,'install','--no-incremental','-r',apk],{stdio:['ignore','pipe','pipe']});
child.stdout.pipe(process.stdout);child.stderr.pipe(process.stderr);
let done=false,code=1,captured=false;
child.on('exit',result=>{done=true;code=result??1;});
const deadline=Date.now()+60_000;
try { while(!done&&Date.now()<deadline){
 if(!captured){
  const top=execFileSync('adb',['-s',serial,'shell','dumpsys','activity','activities'],{encoding:'utf8',timeout:5000});
  if(/ResumedActivity:[^\n]*com\.miui\.permcenter\.install\.AdbInstallActivity/.test(top)){
   const image=execFileSync('adb',['-s',serial,'exec-out','screencap','-p'],{timeout:5000,maxBuffer:8*1024*1024});
   const target=resolve('.runtime/android-model-qa/install-prompt-'+Date.now()+'.png');
   await writeFile(target,image,{flag:'wx'});captured=true;console.log('PROMPT_IMAGE='+target);
   if(process.argv.includes('--continue-exact-prompt')){
    const xmlPath='/data/local/tmp/clearpair-modelqa-install.xml';
    execFileSync('adb',['-s',serial,'shell','uiautomator','dump','--compressed',xmlPath],{timeout:7000,stdio:'pipe'});
    const xml=execFileSync('adb',['-s',serial,'shell','cat',xmlPath],{encoding:'utf8',timeout:2000});
    await writeFile(target+'.xml',xml,{flag:'wx'});
    const controls=xml.match(/<node\b[^>]*>/g)||[];
    const button=controls.find(n=>n.includes('text="继续安装"')&&n.includes('enabled="true"')&&n.includes('package="com.miui.securitycenter"'));
    if(xml.includes('text="ClearPair Offline QA"')&&button){
     const match=button.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
     if(!match)throw Error('No observed bounds');
     const [,x1,y1,x2,y2]=match.map(Number);
     execFileSync('adb',['-s',serial,'shell','input','tap',String(Math.round((x1+x2)/2)),String(Math.round((y1+y2)/2))],{timeout:2000});
     console.log('Confirmed only observed ClearPair Offline QA install control');
    }else console.log('Exact prompt no longer present; no UI input sent. Waiting for installer result.');
   }
  }
 }
 await new Promise(resolve=>setTimeout(resolve,250));
}} finally { if(!done)child.kill('SIGTERM'); }
process.exitCode=code;
