import { spawnSync } from 'node:child_process';
import { mkdir, readFile, copyFile, writeFile,rename } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { selectedRelease } from './release-identity.mjs';

// Provision the private upload key separately. Do not use a debug signing key.
const configFile = process.env.CLEARPAIR_ANDROID_SIGNING;
if (!configFile) throw new Error('Set CLEARPAIR_ANDROID_SIGNING to a private JSON signing configuration.');
const config = JSON.parse(await readFile(configFile, 'utf8'));
const env = { ...process.env, CLEARPAIR_KEYSTORE: config.storeFile,
  CLEARPAIR_STOREPASS: config.storePassword, CLEARPAIR_KEYPASS: config.keyPassword,
  CLEARPAIR_KEYALIAS: config.keyAlias };
const apps = ['handf', 'landr', 'english', 'chinese', 'korean', 'arabic', 'cantonese', 'japanese'];
const selected=process.argv.slice(2);
if(selected.some(app=>!apps.includes(app))||new Set(selected).size!==selected.length)throw Error('Unknown or duplicate app selector');
const init = resolve('tools/android-release.init.gradle');
const {version,build}=selectedRelease(JSON.parse(await readFile('store/release.json','utf8')),selected);
if(version!==JSON.parse(await readFile('package.json','utf8')).version) throw new Error('Version mismatch');
const commit = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim();
if(spawnSync('git',['status','--porcelain'],{encoding:'utf8'}).stdout.trim())throw Error('Commit the validated source/native metadata before signing a release.');
const receiptFile=`.runtime/artifacts/android-release-${version}-${build}.json`;
let receipts=[];
try{receipts=JSON.parse(await readFile(receiptFile,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
if(!Array.isArray(receipts)||receipts.some(r=>!apps.includes(r.app)||r.version!==version||r.build!==build)||new Set(receipts.map(r=>r.app)).size!==receipts.length)
 throw Error('Existing release receipt does not match this family/build');
await mkdir('.runtime/artifacts', { recursive: true });
function run(command, args, cwd) {
  const r = spawnSync(command, args, { cwd, env, stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`${command} failed (${r.status}).`);
}
for (const app of apps.filter(app=>!selected.length||selected.includes(app))) {
  const prior=receipts.find(r=>r.app===app);
  if(prior){
    if(prior.sourceCommit!==commit||prior.sha256!==createHash('sha256').update(await readFile(prior.file)).digest('hex'))
      throw Error(`Preserve the existing ${app} build ${build}; select a new build number for changed source.`);
    console.log(`${app}: existing verified bundle preserved`);continue;
  }
  run(process.execPath, ['tools/native.mjs', app, 'android']);
  const project = `native/apps/${app}/android`;
  run('./gradlew', ['--no-daemon', '--max-workers=2', '-Dorg.gradle.jvmargs=-Xmx2048m',
    '--init-script', init, ':app:bundleRelease'], project);
  const file = `.runtime/artifacts/clearpair-${app}-${version}-${build}.aab`;
  await copyFile(`${project}/app/build/outputs/bundle/release/app-release.aab`, file);
  run('jarsigner', ['-verify', file]);
  receipts.push({ app, packageId: `art.lazying.clearpair.${app}`, version, build,
    sourceCommit: commit || null, file, sha256: createHash('sha256').update(await readFile(file)).digest('hex'),
    uploaded: false });
  await writeFile(receiptFile+'.verified-part', JSON.stringify(receipts, null, 2) + '\n');
  await rename(receiptFile+'.verified-part',receiptFile);
  console.log(`${app}: signed release bundle verified`);
}
