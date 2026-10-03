import {cp,mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
/** Copy only small authored adapter sources; models and SDKs are never copied.
 * A fixed per-app manifest is stable under Xcode's package-graph cache, unlike
 * environment-dependent manifest evaluation. */
export async function prepareIosAudioPackage(app){
 if(!['handf','landr','english','chinese','korean','arabic','cantonese','japanese'].includes(app))throw Error('Unknown iOS audio app');
 if(app==='cantonese'){
  await mkdir('native/audio-yue/ios',{recursive:true});
  await cp('native/audio/ios/Sources','native/audio-yue/ios/Sources',{recursive:true});
 }
 const file=`native/apps/${app}/ios/App/CapApp-SPM/Package.swift`,text=await readFile(file,'utf8');
 const pattern=/\.package\(name: "ClearpairAudio", path: "\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/audio(?:-yue)?"\)/g;
 if([...text.matchAll(pattern)].length!==1)throw Error('Unexpected native audio package reference');
 await writeFile(file,text.replace(pattern,`.package(name: "ClearpairAudio", path: "../../../../../audio${app==='cantonese'?'-yue':''}")`));
}
if(process.argv[1]&&resolve(process.argv[1])===resolve('tools/ios-audio-package.mjs'))await prepareIosAudioPackage(process.argv[2]);
