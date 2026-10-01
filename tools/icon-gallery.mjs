import sharp from 'sharp';
import {mkdir,copyFile} from 'node:fs/promises';
import {exportIcons,iconThemes} from './icons.mjs';
await mkdir('assets/icons/app-icons',{recursive:true});
await mkdir('assets/icons/review',{recursive:true});
const layers=[];
let i=0;
for(const app of Object.keys(iconThemes)) {
  await exportIcons(app,`assets/icons/app-icons/${app}`);
  await copyFile(`assets/icons/app-icons/${app}/icon-1024.png`,`assets/icons/review/${app}.png`);
  layers.push({input:await sharp(`assets/icons/app-icons/${app}/icon-1024.png`).resize(224).png().toBuffer(),left:24+i*244,top:24});
  i++;
}
await sharp({create:{width:24+i*244,height:272,channels:3,background:'#f7f8fc'}}).composite(layers).png().toFile('docs/assets/seven-icons.png');
await copyFile('docs/assets/seven-icons.png','assets/icons/review/00-family-overview.png');
console.log('Seven individually generated icon sets exported to assets/icons/app-icons.');
