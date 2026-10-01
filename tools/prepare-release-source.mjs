// Exact existing signing checkout transfer manifest: no secrets, SDKs, caches
// or research weights. Run after native sync and a clean source commit.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
if(process.cwd()!=='/home/lachlan/ProjectsLFS/Pronunciation')throw Error('Wrong source checkout');
if(execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim())throw Error('Dirty source');
const sourceCommit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const release=JSON.parse(fs.readFileSync('store/release.json','utf8'));
const files=new Set(execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean));
for(const app of release.apps){
 const base=`native/apps/${app}/ios/App/App/public`;
 for(const file of fs.readdirSync(base,{recursive:true})){
  const name=path.posix.join(base,file);if(fs.statSync(name).isFile())files.add(name);
 }
}
const names=[...files].sort(),hashes={};
for(const name of names){
 if(name.includes('..')||!/^[A-Za-z0-9/_.@-]+$/.test(name)||name.startsWith('.runtime/'))throw Error('Unsafe source path');
 hashes[name]=crypto.createHash('sha256').update(fs.readFileSync(name)).digest('hex');
}
fs.writeFileSync(`.runtime/store/source-files${release.build}.txt`,names.join('\n')+'\n',{mode:0o600});
fs.writeFileSync(`.runtime/store/source-verification${release.build}.json`,JSON.stringify({sourceCommit,version:release.version,build:release.build,files:hashes},null,2)+'\n',{mode:0o600});
console.log(`Candidate ${release.build}: ${names.length} verified source/assets paths.`);
