import { spawnSync } from "node:child_process";
import { mkdir, writeFile, readFile, cp } from "node:fs/promises";
import sharp from "sharp";
const apps = {
  handf: ["H & F", "h↔f", "#146957", "English & Mandarin h/f"],
  landr: ["L & R", "l↔r", "#7251a5", "English l/r"],
  english: ["English", "ə", "#315eb7", "Vowels, TH and consonant contrasts"],
  chinese: ["Mandarin", "声", "#b35035", "Initials, finals and tones"],
  korean: ["Korean", "한", "#8a4b70", "Hangul and sound contrasts"],
  arabic: ["Arabic Letters", "ب", "#826020", "Dots, joins and sound families"],
};
const appArg = process.argv.find((v) => v.startsWith("--app="))?.slice(6);
if (appArg && !apps[appArg]) throw new Error("Unknown app");
const isNative = process.argv.includes("--native");
for (const [id, [name, mark, color]] of Object.entries(apps).filter(
  ([id]) => !appArg || appArg === id,
)) {
  const publicDir = `.runtime/public/${id}`;
  await mkdir(`${publicDir}/icons`, { recursive: true });
  const icon = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="512" height="512" fill="${color}"/><circle cx="256" cy="256" r="192" fill="none" stroke="#ffffff" stroke-opacity=".28" stroke-width="2"/><text x="256" y="300" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="130" fill="white">${mark}</text><text x="256" y="415" text-anchor="middle" font-family="sans-serif" font-size="24" letter-spacing="7" fill="#ffffff">CLEARPAIR</text></svg>`,
  );
  for (const size of [192, 512, 1024])
    await sharp(icon)
      .resize(size, size)
      .png()
      .toFile(`${publicDir}/icons/icon-${size}.png`);
  try {
    await cp("public/fonts", `${publicDir}/fonts`, { recursive: true });
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  try {
    // Snapshot the manifest before copying; synthesis may still be preparing
    // later clips. Every published key must have an already-complete file.
    const audioManifest=JSON.parse(await readFile('public/audio/manifest.json','utf8'));
    await mkdir(`${publicDir}/audio`,{recursive:true});
    for(const filename of new Set(Object.values(audioManifest))){
      if(typeof filename!=='string'||! /^[a-f0-9]+\.mp3$/.test(filename))throw new Error('Unsafe audio filename');
      await cp(`public/audio/${filename}`,`${publicDir}/audio/${filename}`);
    }
    await writeFile(`${publicDir}/audio/manifest.json`,JSON.stringify(audioManifest));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
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
  await mkdir("dist/site", { recursive: true });
  await writeFile(
    "dist/site/index.html",
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="Practise the sounds and letters you mix up. ClearPair's six focused courses help you learn the difference through contrast."><title>ClearPair · Practise what you mix up</title><style>body{margin:0;background:#f4f3ed;color:#26342f;font:16px/1.6 system-ui}main{max-width:1020px;margin:auto;padding:42px 24px}header{font-weight:600;letter-spacing:-1px;font-size:23px;border-bottom:1px solid #ddd;padding-bottom:25px}header small{font-weight:400;font-size:11px;color:#74806a;margin-left:15px;letter-spacing:1px}h1{font-size:clamp(35px,6vw,64px);font-weight:400;line-height:1.1;letter-spacing:-2px;margin:65px 0 20px}h1 em{font-family:Georgia,serif;color:#146957}p{color:#78836d;max-width:610px;font-size:14px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:18px;margin:38px 0}.card{background:#fffef9;border:1px solid #e2e6d7;border-radius:20px;padding:26px;text-decoration:none;display:block}.mark{font-size:49px;line-height:1.5}.card h2{font-size:20px;font-weight:500;margin:12px 0 6px}.card p{font-size:12px;margin:0}.card span:last-child{display:block;font-size:11px;margin-top:30px}footer{border-top:1px solid #ddd;padding-top:22px;font-size:11px;color:#8a947d}</style></head><body><main><header>ClearPair <small>BY LAZYINGART</small></header><h1>Practise what you mix up.<br><em>Learn the difference.</em></h1><p>Not another general practice app. Focus on the sounds and letters that are easy to confuse—with side-by-side contrasts, listening, recall and private recordings.</p><div class="grid">${Object.entries(
      apps,
    )
      .map(
        ([id, [name, mark, color, desc]]) =>
          `<a class="card" href="/${id}/" style="color:${color}"><div class="mark">${mark}</div><h2>${name.replace("&", "&amp;")}</h2><p>${desc}</p><span>Explore this contrast →</span></a>`,
      )
      .join(
        "",
      )}</div><footer>Development preview · Pronunciation scoring is being validated; recording signal quality is not a pronunciation grade. iOS and Android releases are in development. No account is needed.<br><a href="https://l-and-n.lazying.art/">Also explore L &amp; N</a> · <a href="mailto:support@lazying.art">Contact</a></footer></main></body></html>`,
  );
}
