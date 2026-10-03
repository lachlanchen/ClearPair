// Download once from the model publisher. This prepares private candidates;
// neither changes a shipping pin nor activates an untested model.
import {access,mkdir,readFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
const names={japanese:'vosk-model-small-ja-0.22',korean:'vosk-model-small-ko-0.22',arabic:'vosk-model-ar-mgb2-0.4'};
const app=process.argv[2],name=names[app];if(!name)throw Error('Select japanese, korean or arabic');
const root='.runtime/reference-qa/vosk-models';await mkdir(root,{recursive:true});
const zip=`${root}/${name}.zip`;
try{await access(zip);}catch{
 await new Promise((resolve,reject)=>{const child=spawn('curl',['-fL','--retry','2','--max-time','600',`https://alphacephei.com/vosk/models/${name}.zip`,'-o',zip],{stdio:'inherit'});child.on('exit',code=>code===0?resolve():reject(Error('Model download failed')));});
}
await new Promise((resolve,reject)=>{const child=spawn('unzip',['-tq',zip],{stdio:'inherit'});child.on('exit',code=>code===0?resolve():reject(Error('Invalid model source archive')));});
console.log(JSON.stringify({app,name,source:`https://alphacephei.com/vosk/models/${name}.zip`,zipSha256:createHash('sha256').update(await readFile(zip)).digest('hex')}));
