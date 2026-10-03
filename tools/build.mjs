import { spawnSync } from "node:child_process";
import { mkdir, writeFile, readFile, cp, rm } from "node:fs/promises";
import { exportIcons } from './icons.mjs';
const apps = {
  handf: ["H & F", "h↔f", "#146957", "English & Mandarin h/f"],
  landr: ["L & R", "l↔r", "#7251a5", "English l/r"],
  english: ["English", "ə", "#315eb7", "Vowels, TH and consonant contrasts"],
  chinese: ["Mandarin", "声", "#b35035", "Initials, finals and tones"],
  korean: ["Korean", "한", "#8a4b70", "Hangul and sound contrasts"],
  arabic: ["Arabic Letters", "ب", "#826020", "Dots, joins and sound families"],
  cantonese: ["Cantonese", "粵", "#a64b00", "Jyutping, tones and easily confused sounds"],
  japanese: ["Japanese", "あ", "#b33460", "Confusing kana, furigana and mora contrasts"],
};
const appArg = process.argv.find((v) => v.startsWith("--app="))?.slice(6);
if (appArg && !apps[appArg]) throw new Error("Unknown app");
const isNative = process.argv.includes("--native");
for (const [id, [name, mark, color]] of Object.entries(apps).filter(
  ([id]) => !appArg || appArg === id,
)) {
  const publicDir = `.runtime/public/${id}`;
  await mkdir(`${publicDir}/icons`, { recursive: true });
  // Never retain reference clips from an earlier, unapproved research build.
  // This is generated staging only; original research audio is kept privately.
  await rm(`${publicDir}/audio`, { recursive: true, force: true });
  await exportIcons(id, `${publicDir}/icons`);
  if(id==='handf'&&isNative){
    const {prepareHfWordModels}=await import('./hf-word-models.mjs');
    await prepareHfWordModels(`${publicDir}/models`);
  }else if(id==='handf'){
    // Native and PWA share generated staging; never accidentally publish the
    // large native-only model payload in a later web build.
    await rm(`${publicDir}/models`,{recursive:true,force:true});
  }
  try {
    await cp("public/fonts", `${publicDir}/fonts`, { recursive: true });
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  try {
    // Snapshot the manifest before copying; synthesis may still be preparing
    // later clips. Every published key must have an already-complete file.
    const audioManifest=JSON.parse(await readFile('public/audio/manifest.json','utf8'));
    const rights=JSON.parse(await readFile('public/audio/RIGHTS.json','utf8'));
    if(rights.redistributionApproved!==true || !rights.source || !rights.termsUrl)
      throw new Error('Bundled references require reviewed redistribution rights.');
    await mkdir(`${publicDir}/audio`,{recursive:true});
    for(const filename of new Set(Object.values(audioManifest))){
      if(typeof filename!=='string'||! /^[a-f0-9]+\.mp3$/.test(filename))throw new Error('Unsafe audio filename');
      await cp(`public/audio/${filename}`,`${publicDir}/audio/${filename}`);
    }
    await writeFile(`${publicDir}/audio/manifest.json`,JSON.stringify(audioManifest));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    // A rights-unqualified installation intentionally uses device voices.
    // Publish an explicit empty manifest instead of a recurring HTTP 404.
    await mkdir(`${publicDir}/audio`,{recursive:true});
    await writeFile(`${publicDir}/audio/manifest.json`,'{}');
  }
  const result = spawnSync(
    process.execPath,
    [
      "node_modules/vite/bin/vite.js",
      "build",
      "--outDir",
      isNative ? `dist/native/${id}` : `dist/site/${id}`,
    ],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        CLEARPAIR_APP: id,
        CLEARPAIR_BASE: isNative ? "/" : `/${id}/`,
        CLEARPAIR_PUBLIC: publicDir,
        CLEARPAIR_NATIVE: isNative ? "1" : "0",
        CLEARPAIR_HF_WORDS: id==='handf'&&isNative ? "1" : "0",
      },
    },
  );
  if (result.status !== 0) process.exit(result.status || 1);
  const path = isNative
    ? `dist/native/${id}/index.html`
    : `dist/site/${id}/index.html`;
  const html = await readFile(path, "utf8");
  await writeFile(
    path,
    html.replace(
      "<title>ClearPair · Practise what you mix up</title>",
      `<title>ClearPair ${name.replace("&", "&amp;")} · Practise what you mix up</title>`,
    ),
  );
}
if (!isNative) {
  await mkdir('dist/site', { recursive: true });
  const { homepage } = await import('./site.mjs');
  await writeFile('dist/site/index.html', homepage(apps));
  const {privacyPage,supportPage}=await import('./legal-pages.mjs');
  await writeFile('dist/site/privacy.html',privacyPage());
  await writeFile('dist/site/support.html',supportPage());
}
