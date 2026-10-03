// Activation is explicit and follows per-language runtime validation. Do not
// package Mandarin weights as a substitute for Cantonese or another language.
import {readFile,copyFile,mkdir,access,rm,rename} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
export const pairManifest=JSON.parse(await readFile('models/pair-words.json','utf8'));
export const pairCandidateLanguages={landr:['en-US'],english:['en-US'],chinese:['zh-CN'],japanese:['ja-JP'],korean:['ko-KR'],arabic:['ar-SA']};
export const pairWordLanguages=Object.fromEntries(Object.entries(pairCandidateLanguages).filter(([app])=>pairManifest.activeApps.includes(app)));
export async function preparePairWordModels(app,destination,nativeIos=false){
 const languages=pairCandidateLanguages[app];
 if(!languages)throw Error('Pair word model not qualified for this app');
 await mkdir(destination,{recursive:true});
 for(const language of languages){
  const model=pairManifest.models.find(m=>m.language===language);if(!model)throw Error('No pinned model for practice language');
  const cache=resolve('.runtime/reference-qa/vosk-models'),zip=resolve(cache,model.name+'.zip'),archive=resolve(cache,model.asset.split('/').at(-1));
  if(model.source!==`https://alphacephei.com/vosk/models/${model.name}.zip`||createHash('sha256').update(await readFile(zip)).digest('hex')!==model.zipSha256)throw Error('Pair model source hash mismatch');
  if(nativeIos){
   const stage=resolve(destination,'hf-native','.stage-'+model.code),out=resolve(destination,'hf-native',model.code);await mkdir(stage,{recursive:true});
   execFileSync('unzip',['-q','-o',zip,'-d',stage]);await access(resolve(stage,model.name,'am/final.mdl'));
   await rm(out,{recursive:true,force:true});await rename(resolve(stage,model.name),out);await rm(stage,{recursive:true,force:true});
   await rm(resolve(destination,model.asset.split('/').at(-1)),{force:true});
  }else{
   const bytes=await readFile(archive);if(bytes.length!==model.bytes||createHash('sha256').update(bytes).digest('hex')!==model.sha256)throw Error('Pair model package hash mismatch');
   await copyFile(archive,resolve(destination,model.asset.split('/').at(-1)));
  }
 }
 await copyFile('models/pair-words.json',resolve(destination,'pair-words.json'));
 await copyFile('models/licenses/Apache-2.0.txt',resolve(destination,'Apache-2.0.txt'));
 await copyFile('models/licenses/HF-native-NOTICE.txt',resolve(destination,'Vosk-native-NOTICE.txt'));
 await copyFile('models/licenses/Pair-native-NOTICE.txt',resolve(destination,'Pair-native-NOTICE.txt'));
}
