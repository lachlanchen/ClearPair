// Bounded, pinned educational-data import. Does not fetch/execute remote code.
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const revision='70a0b7ae0c18ceb5cb358274b029cce0234a43bc';
const rows=[
 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん',
 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン',
 'がざでばぱぷっゃゅょ', '安阿日月本語今明水木坂作家来切手',
];
const characters=[...new Set(Array.from(rows.join('')))];
if(characters.length>128)throw Error('Import exceeds reviewed course scope');
await mkdir('assets/japanese',{recursive:true});
const result={source:'KanjiVG',revision,copyright:'Copyright Ulrich Apel and KanjiVG contributors',
 license:'CC-BY-SA-3.0',licenseUrl:'https://creativecommons.org/licenses/by-sa/3.0/',
 modified:'Stroke paths extracted into a JSON map for original UI animation; path shapes/order unchanged.',characters:{}};
for(const character of characters){
 const key=character.codePointAt(0).toString(16).padStart(5,'0');
 const url=`https://raw.githubusercontent.com/KanjiVG/kanjivg/${revision}/kanji/${key}.svg`;
 const response=await fetch(url,{signal:AbortSignal.timeout(20_000)});
 if(!response.ok)throw Error(`No verified stroke source for ${character}: ${response.status}`);
 const source=await response.text();
 if(Buffer.byteLength(source)>200_000||!source.includes('<svg')||/<script\b/i.test(source))throw Error('Unsafe upstream SVG');
 const paths=[...source.matchAll(/<path\b[^>]*>/g)].map(([tag])=>{
  const order=tag.match(/\bid="[^\"]+-s(\d+)"/),d=tag.match(/\bd="([^\"]+)"/);
  return order&&d?{order:Number(order[1]),d:d[1]}:null;
 }).filter(Boolean).sort((a,b)=>a.order-b.order);
 if(!paths.length||paths.length>32||paths.some((p,i)=>p.order!==i+1||!/^[MmLlHhVvCcSsQqTtAaZz0-9.,\s+-]+$/.test(p.d)))throw Error('Unexpected stroke paths/order');
 result.characters[character]={paths:paths.map(p=>p.d),sourceUrl:url,sha256:createHash('sha256').update(source).digest('hex')};
}
const licenseResponse=await fetch(`https://raw.githubusercontent.com/KanjiVG/kanjivg/${revision}/COPYING`,{signal:AbortSignal.timeout(20_000)});
if(!licenseResponse.ok)throw Error('Missing upstream license');
const license=await licenseResponse.text();
if(!/Attribution|ShareAlike|SHARE/i.test(license))throw Error('Unexpected upstream license');
// Do not rewrite a different existing pin without an explicit source update.
try{const prior=JSON.parse(await readFile('assets/japanese/kanjivg.json','utf8'));if(prior.revision!==revision)throw Error('Existing source pin differs');}catch(e){if(e.code!=='ENOENT')throw e;}
await writeFile('assets/japanese/KanjiVG-LICENSE.txt',license.trimEnd()+'\n');
await writeFile('assets/japanese/kanjivg.json',JSON.stringify(result,null,2)+'\n');
console.log(`${characters.length} pinned, attributed stroke diagrams imported`);
