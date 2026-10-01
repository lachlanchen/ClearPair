// Builds only a standalone permission-free QA asset package, not any store app.
import {build} from 'vite';
import {readFile,mkdir,writeFile,link,copyFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const output=resolve(process.argv[2]||'');
if(!output.startsWith(resolve('.runtime/android-model-qa')+'/'))throw Error('Private fresh QA directory required');
const root=resolve('.runtime/model-audit/local-export-english-context-v1');
const report=JSON.parse(await readFile(`${root}/regression.json`,'utf8'));
const artifact=report.artifacts.find(a=>a.file==='english-int8.onnx');
if(artifact?.sha256!=='2597d1bb1ac649d77abff5469e8a8c461482c667d34fc905513d8f635006a8b5')throw Error('Unexpected model');
await mkdir(`${output}/assets/www`,{recursive:true});
await copyFile('tools/android-model-qa/NOTICE.txt',`${output}/assets/www/NOTICE.txt`);
await copyFile('/usr/share/common-licenses/Apache-2.0',`${output}/assets/www/APACHE-2.0.txt`);
await build({configFile:false,base:'/',publicDir:false,build:{outDir:`${output}/assets/www`,emptyOutDir:false,
 rollupOptions:{input:'tools/local-runtime-probe.ts',output:{entryFileNames:'probe.js'}}}});
const python='/home/lachlan/ProjectsLFS/LocalSTT/.venv/bin/python';
const reference=spawnSync(python,['tools/local-runtime-reference.py','--variant=context-weight-only','--clip=005600294'],
 {encoding:'utf8',maxBuffer:10*1024*1024,timeout:60000});
if(reference.status!==0)throw Error(reference.stderr||'CPU reference failed');
await writeFile(`${output}/assets/www/reference.json`,reference.stdout,{flag:'wx'});
await mkdir(`${output}/assets/www/models`);
// Hard-link the verified source candidate; don't duplicate a weight cache.
await link(`${root}/${artifact.file}`,`${output}/assets/www/models/${artifact.file}`);
const model={id:'english-context-RESEARCH-NOT-APPROVED',language:'en-US',asset:'models/'+artifact.file,
 sha256:artifact.sha256,bytes:artifact.bytes,rate:16000,preprocessing:'mono-sinc-zscore:v1',
 input:'input_values',logitsOutput:'logits',featureNames:[],vocabulary:46,blank:45,separators:[0],
 rights:{redistributionApproved:false,termsUrl:'https://huggingface.co/'+report.model},tasks:[]};
await writeFile(`${output}/assets/www/model.json`,JSON.stringify(model),{flag:'wx'});
await copyFile('tools/android-model-qa/index.html',`${output}/assets/www/index.html`);
await writeFile(`${output}/manifest.json`,JSON.stringify({artifact,model,scope:'Permission-free Android WebView runtime test; not a microphone or grade test'},null,2)+'\n',{flag:'wx'});
