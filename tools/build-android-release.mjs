import { spawnSync } from 'node:child_process';
import { mkdir, readFile, copyFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

// Provision the private upload key separately. Do not use a debug signing key.
const configFile = process.env.CLEARPAIR_ANDROID_SIGNING;
if (!configFile) throw new Error('Set CLEARPAIR_ANDROID_SIGNING to a private JSON signing configuration.');
const config = JSON.parse(await readFile(configFile, 'utf8'));
const env = { ...process.env, CLEARPAIR_KEYSTORE: config.storeFile,
  CLEARPAIR_STOREPASS: config.storePassword, CLEARPAIR_KEYPASS: config.keyPassword,
  CLEARPAIR_KEYALIAS: config.keyAlias };
const apps = ['handf', 'landr', 'english', 'chinese', 'korean', 'arabic', 'cantonese', 'japanese'];
const init = resolve('tools/android-release.init.gradle');
const {version,build}=JSON.parse(await readFile('store/release.json','utf8'));
if(version!==JSON.parse(await readFile('package.json','utf8')).version) throw new Error('Version mismatch');
const commit = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim();
const receipts = [];
await mkdir('.runtime/artifacts', { recursive: true });
function run(command, args, cwd) {
  const r = spawnSync(command, args, { cwd, env, stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`${command} failed (${r.status}).`);
}
for (const app of apps) {
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
  await writeFile(`.runtime/artifacts/android-release-${version}-${build}.json`, JSON.stringify(receipts, null, 2) + '\n');
  console.log(`${app}: signed release bundle verified`);
}
