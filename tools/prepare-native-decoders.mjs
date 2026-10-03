// Reuse one verified project SDK cache. No model/browser/profile duplication.
import{readFile,writeFile,mkdir,rename}from'node:fs/promises';
import{createHash}from'node:crypto';
import{resolve}from'node:path';
const cache=resolve('.runtime/reference-qa/vosk-models');await mkdir(cache,{recursive:true});
const name='sherpa-onnx-static-link-onnxruntime-1.13.8.aar',digest='b22c3fc1b6a45666d28892bb2f7694beeb77a8362d7ebd77c1a5431ec9435471';
const file=resolve(cache,name);let bytes;try{bytes=await readFile(file);}catch(e){if(e.code!=='ENOENT')throw e;}
if(bytes){if(createHash('sha256').update(bytes).digest('hex')!==digest)throw Error('Existing native SDK failed pinned hash');}
else{
 const response=await fetch('https://github.com/k2-fsa/sherpa-onnx/releases/download/v1.13.8/'+name,{signal:AbortSignal.timeout(180000)});
 if(!response.ok)throw Error('Official native SDK download failed');
 bytes=Buffer.from(await response.arrayBuffer());if(bytes.length!==38691998||createHash('sha256').update(bytes).digest('hex')!==digest)throw Error('Downloaded SDK failed pinned hash');
 await writeFile(file+'.verified-part',bytes,{mode:0o600});await rename(file+'.verified-part',file);
}
console.log('Pinned native SenseVoice SDK verified');
