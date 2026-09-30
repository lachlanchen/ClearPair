import { spawnSync } from 'node:child_process';
import { mkdir,copyFile,writeFile } from 'node:fs/promises';
const apps=['handf','landr','english','chinese','korean','arabic'];
const results=[];
await mkdir('.runtime/artifacts',{recursive:true});
for(const app of apps){
  for(const platform of ['android','ios']){
    const result=spawnSync(process.execPath,['tools/native.mjs',app,platform],{stdio:'inherit'});
    if(result.status!==0)process.exit(result.status||1);
  }
  if(process.argv.includes('--android-build')){
    const result=spawnSync('./gradlew',['--no-daemon','--max-workers=2','-Dorg.gradle.jvmargs=-Xmx2048m',':app:assembleDebug'],{cwd:`native/apps/${app}/android`,stdio:'inherit'});
    if(result.status!==0)process.exit(result.status||1);
    await copyFile(`native/apps/${app}/android/app/build/outputs/apk/debug/app-debug.apk`,`.runtime/artifacts/clearpair-${app}-0.1.0-debug.apk`);
    results.push({app,platform:'android',kind:'debug',build:'passed',deviceTest:'pending',scoringValidation:'pending'});
  }
}
await writeFile('.runtime/artifacts/native-builds.json',JSON.stringify({generatedAt:new Date().toISOString(),results},null,2)+'\n');
