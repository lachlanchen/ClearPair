// H & F only: reproducible, licensed offline word-model staging. No training
// corpus, recordings, generated voice, or credentials enter a package.
import {readFile,mkdir,copyFile,access,rm,rename} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
export const hfWordModels=[
 {language:'en-US',name:'vosk-model-small-en-us-0.15',zipSha256:'30f26242c4eb449f948e42cb302dd7a686cb29a3423a8367f99ff41780942498'},
 {language:'zh-CN',name:'vosk-model-small-cn-0.22',zipSha256:'3af8b0e7e0f835ae9d414ce5df580237a3cfb08d586c9fbbb0f7ff29ad5b14ba'},
];
export async function prepareHfWordModels(destination,languages=hfWordModels.map(m=>m.language)){
 const manifest=JSON.parse(await readFile('models/hf-words.json','utf8'));
 const cache='.runtime/reference-qa/vosk-models';
 await mkdir(destination,{recursive:true});
 for(const model of hfWordModels.filter(m=>languages.includes(m.language))){
  const pin=manifest.models.find(m=>m.language===model.language);
  if(!pin||pin.source!==`https://alphacephei.com/vosk/models/${model.name}.zip`||pin.zipSha256!==model.zipSha256)
   throw Error('Offline word-model provenance changed');
  const zip=resolve(cache,model.name+'.zip'),folder=resolve(cache,model.name),archive=resolve(cache,pin.asset.split('/').at(-1));
  if(createHash('sha256').update(await readFile(zip)).digest('hex')!==model.zipSha256)throw Error('Word model source hash mismatch');
  try{await access(archive);}catch{
   await access(folder+'/am/final.mdl');
   execFileSync('tar',['--sort=name','--mtime=@0','--owner=0','--group=0','--numeric-owner','-czf',archive,
    '-C',resolve(cache),'--transform',`s/^${model.name}/model/`,model.name]);
  }
  const bytes=await readFile(archive);
  if(createHash('sha256').update(bytes).digest('hex')!==pin.sha256||bytes.length!==pin.bytes)throw Error('Word model package hash mismatch');
  await copyFile(archive,resolve(destination,pin.asset.split('/').at(-1)));
  // AAPT silently gunzips assets ending in .gz and strips their suffix. The
  // opaque .vosk name preserves the exact pinned bytes on Android and iOS.
  // Remove only this stager's superseded generated copies, not source archives.
  await rm(resolve(destination,pin.asset.split('/').at(-1).replace(/\.vosk$/,'.tar.gz')),{force:true});
 }
 await copyFile('models/hf-words.json',resolve(destination,'hf-words.json'));
 await copyFile('models/licenses/Apache-2.0.txt',resolve(destination,'Apache-2.0.txt'));
}
/** Native iOS reads unpacked weights, avoiding WebKit's WASM compatibility
 * dependency. Staged into H/F only, from the same checksum-pinned model zips. */
export async function prepareHfNativeWordModels(destination,languages=hfWordModels.map(m=>m.language)){
 const manifest=JSON.parse(await readFile('models/hf-words.json','utf8'));
 await mkdir(destination,{recursive:true});
 for(const model of hfWordModels.filter(m=>languages.includes(m.language))){
  const zip=resolve('.runtime/reference-qa/vosk-models',model.name+'.zip');
  const pin=manifest.models.find(m=>m.language===model.language);
  if(!pin||pin.zipSha256!==model.zipSha256||createHash('sha256').update(await readFile(zip)).digest('hex')!==model.zipSha256)
   throw Error('Native word-model source hash mismatch');
  const stage=resolve(destination,'hf-native','.stage-'+model.name),out=resolve(destination,'hf-native',model.language==='en-US'?'en':'zh');
  await mkdir(stage,{recursive:true});
  execFileSync('unzip',['-q','-o',zip,'-d',stage]);
  await access(resolve(stage,model.name,'am/final.mdl'));
  await rm(out,{recursive:true,force:true});
  await rename(resolve(stage,model.name),out);
  await rm(stage,{recursive:true,force:true});
  // This iOS stager owns these generated package copies. Keep source archives
  // and all historical builds; do not ship two copies of each model.
  await rm(resolve(destination,pin.asset.split('/').at(-1)),{force:true});
 }
 await copyFile('models/hf-words.json',resolve(destination,'hf-words.json'));
 await copyFile('models/licenses/Apache-2.0.txt',resolve(destination,'Apache-2.0.txt'));
 await copyFile('models/licenses/HF-native-NOTICE.txt',resolve(destination,'HF-native-NOTICE.txt'));
}
if(process.argv[1]&&resolve(process.argv[1])===resolve('tools/hf-word-models.mjs')){
 await prepareHfWordModels(process.argv[2]||'.runtime/public/handf/models');
 console.log('H & F offline models verified and staged.');
}
