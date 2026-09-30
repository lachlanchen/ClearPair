import { mkdir, writeFile, copyFile } from 'node:fs/promises';
import sharp from 'sharp';

// One full-bleed family; no tiny wordmarks, pre-rounded iOS corners or baked shadows.
export const iconThemes = {
  handf: ['#00A77B', '#006B64', '#D9FF55', 'hf'],
  landr: ['#9657FF', '#5922D5', '#FFBADD', 'lr'],
  english: ['#2682FF', '#194AE0', '#B9F6FF', 'æ'],
  chinese: ['#FF713B', '#EB3838', '#FFE889', '声'],
  korean: ['#FB4794', '#BA257C', '#FFD5EC', '한'],
  arabic: ['#00B9C5', '#007B9D', '#C5FFAD', 'ب'],
  cantonese: ['#FFBE18', '#FF7A16', '#FFF8D0', '粵'],
};

export function iconSvg(app, variant = 'full') {
  const theme = iconThemes[app];
  if (!theme) throw new Error('Unknown icon');
  const [bright, deep, highlight, mark] = theme;
  const paired = app === 'handf' || app === 'landr';
  const symbol = paired
    ? `<g font-family="DejaVu Sans,sans-serif" font-weight="900" font-size="183"><text x="19" y="176" fill="white">${mark[0]}</text><text x="122" y="229" fill="${highlight}">${mark[1]}</text></g>`
    : `<text x="128" y="${app === 'arabic' ? 173 : app === 'english' ? 204 : 200}" text-anchor="middle" font-family="${app === 'arabic' ? 'DejaVu Sans' : app === 'english' ? 'DejaVu Sans' : 'Noto Sans CJK HK'},sans-serif" font-size="${app === 'arabic' ? 217 : app === 'english' ? 221 : 196}" font-weight="900" fill="white">${mark}</text>`;
  // Android: 108dp layers, recognisable art inside the central 66dp circle.
  // PWA maskable: all essential details inside the 80%-diameter safe circle.
  const scale = variant === 'adaptive' ? 0.59 : variant === 'maskable' ? 0.77 : 1;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 256 256"><defs><linearGradient id="paint" x2=".8" y2="1"><stop stop-color="${bright}"/><stop offset="1" stop-color="${deep}"/></linearGradient></defs>${variant === 'adaptive' ? '' : `<path fill="url(#paint)" d="M0 0h256v256H0z"/><path d="M-40 225Q150 120 280 170V280H-40Z" fill="${highlight}" opacity=".12"/>`}<g transform="translate(128 128) scale(${scale}) translate(-128 -128)">${symbol}</g></svg>`;
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
