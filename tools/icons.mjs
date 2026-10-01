import { mkdir, writeFile, copyFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';

// Individually generated lettering art; shared export rules, never font fallbacks.
export const iconThemes = {
  handf: ['#EEF7F2', '#FFFEF3', '#167456', 'hf'],
  landr: ['#F4F0FA', '#FFFBF4', '#70429C', 'lr'],
  english: ['#EEF4FB', '#FFFCF3', '#2859AC', 'æ'],
  chinese: ['#FBF2EC', '#FFFCF3', '#B24327', '声'],
  korean: ['#FBF0F4', '#FFFCF5', '#A92F5B', '한'],
  arabic: ['#EDF8F8', '#FFFCF2', '#08758F', 'ب'],
  cantonese: ['#FCF6E9', '#FFFEF5', '#B35700', '粵'],
};

const artwork = new Map();
for (const app of Object.keys(iconThemes)) {
  const source = readFileSync(resolve(`assets/icons/art-v4/foreground/${app}.png`));
  const full=readFileSync(resolve(`assets/icons/art-v4/${app}.png`));
  const {data,info}=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  if(info.width!==info.height) throw new Error(`Non-square icon artwork: ${app}`);
  let radius=0, transparent=0;
  for(let y=0;y<info.height;y++) for(let x=0;x<info.width;x++) {
    const alpha=data[(y*info.width+x)*4+3];
    if(alpha<8) transparent++;
    if(alpha>8) radius=Math.max(radius,Math.hypot(x-info.width/2,y-info.height/2));
  }
  if(transparent<info.width*info.height*.1 || !radius) throw new Error(`Artwork must have real transparency: ${app}`);
  artwork.set(app,{uri:`data:image/png;base64,${source.toString('base64')}`,fullUri:`data:image/png;base64,${full.toString('base64')}`,radius:radius/info.width});
}

export function iconSvg(app, variant = 'full') {
  const theme = iconThemes[app];
  if (!theme) throw new Error('Unknown icon');
  if(!['full','adaptive','maskable'].includes(variant)) throw new Error('Unknown icon variant');
  const [bright, deep] = theme;
  const art=artwork.get(app);
  if(variant==='full')return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><image href="${art.fullUri}" width="1024" height="1024"/></svg>`;
  // Android: 108dp layers, recognisable art inside the central 66dp circle.
  // PWA maskable: all essential details inside the 80%-diameter safe circle.
  // Measure actual alpha, keeping expressive tails and dots inside safe circles.
  const scale=variant==='adaptive' ? (66/108/2)*.97/art.radius : .4*.97/art.radius;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 256 256"><defs><linearGradient id="paint" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${bright}"/><stop offset="1" stop-color="${deep}"/></linearGradient></defs>${variant === 'adaptive' ? '' : '<path fill="url(#paint)" d="M0 0h256v256H0z"/>'}<g transform="translate(128 128) scale(${scale}) translate(-128 -128)"><image href="${art.uri}" x="0" y="0" width="256" height="256"/></g></svg>`;
}

export async function exportIcons(app, directory) {
  await mkdir(directory, { recursive: true });
  const source = Buffer.from(iconSvg(app));
  for (const size of [48, 180, 192, 512, 1024])
    await sharp(source).resize(size, size).flatten().png().toFile(`${directory}/icon-${size}.png`);
  await sharp(Buffer.from(iconSvg(app, 'maskable'))).resize(512).flatten().png().toFile(`${directory}/maskable-512.png`);
}

export async function exportNativeIcons(app, platform) {
  const directory = `.runtime/public/${app}/icons`;
  await exportIcons(app, directory);
  if (platform === 'ios') {
    await copyFile(`${directory}/icon-1024.png`, `native/apps/${app}/ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png`);
    return;
  }
  const root = `native/apps/${app}/android/app/src/main/res`;
  const foreground = Buffer.from(iconSvg(app, 'adaptive'));
  for (const [density, factor] of Object.entries({ mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 })) {
    await mkdir(`${root}/mipmap-${density}`, { recursive: true });
    for (const name of ['ic_launcher', 'ic_launcher_round'])
      await sharp(Buffer.from(iconSvg(app, 'maskable'))).resize(48 * factor).flatten().png().toFile(`${root}/mipmap-${density}/${name}.png`);
    await sharp(foreground).resize(108 * factor).png().toFile(`${root}/mipmap-${density}/ic_launcher_foreground.png`);
  }
  await writeFile(`${root}/values/ic_launcher_background.xml`, `<?xml version="1.0" encoding="utf-8"?>\n<resources><color name="ic_launcher_background">${iconThemes[app][0]}</color></resources>\n`);
  for (const name of ['ic_launcher', 'ic_launcher_round']) {
    await mkdir(`${root}/mipmap-anydpi-v26`, { recursive: true });
    await writeFile(`${root}/mipmap-anydpi-v26/${name}.xml`, `<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android"><background android:drawable="@color/ic_launcher_background"/><foreground android:drawable="@mipmap/ic_launcher_foreground"/><monochrome android:drawable="@mipmap/ic_launcher_foreground"/></adaptive-icon>\n`);
  }
}
