import type {AcousticReference} from './reference-features';

/** Relative pitch-shape evidence only. Centering a single syllable cannot
 * establish a speaker's high/mid/low register, so flat Cantonese registers
 * deliberately do not receive a measured contour contrast. */
export interface ToneComparison {
 version:'relative-tone-shape:v1';
 heard:number[];target:number[];partner:number[];
 targetDistance:number;competitorDistance:number;separation:number;frames:number;
 baseline?:'word-median'|'carrier-median';
}
function contour(a:AcousticReference,preserveCarrierRegister=false):{values:number[];frames:number}|null {
 let voiced=a.pitch.map((p,i)=>({p,i})).filter((v):v is {p:number;i:number}=>v.p!==null&&Number.isFinite(v.p));
 if(voiced.length<10||a.periodic<.35)return null;
 // A carrier edge can retain 10–40 ms of the preceding syllable before a
 // target's unvoiced /s/, /f/ or stop. Do not interpolate its pitch through
 // that consonant or discard the otherwise reliable vowel. Keep the main
 // voiced nucleus only when every disconnected edge fragment is <=40 ms;
 // two substantial nuclei still abstain instead of guessing a tone span.
 const islands:typeof voiced[]=[];
 for(const frame of voiced){
  const last=islands.at(-1);
  if(!last||frame.i-last.at(-1)!.i>8)islands.push([frame]);else last.push(frame);
 }
 if(islands.length>1){
  islands.sort((a,b)=>b.length-a.length);
  if(islands[0].length<10||islands.slice(1).some(v=>v.length>4))return null;
  voiced=islands[0];
 }
 // Exclude unreliable edge frames; interpolate only small internal gaps.
 const first=voiced[0].i,last=voiced.at(-1)!.i;
 if(last-first<9||voiced.length/(last-first+1)<.55)return null;
 const smooth=voiced.map((v,i)=>({...v,p:[voiced[Math.max(0,i-1)].p,v.p,voiced[Math.min(voiced.length-1,i+1)].p].sort((a,b)=>a-b)[1]}));
 const bins:number[]=[];let at=0;
 for(let bin=0;bin<21;bin++){
  const position=first+(last-first)*bin/20;
  while(at+1<smooth.length&&smooth[at+1].i<position)at++;
  const left=smooth[at],right=smooth[Math.min(at+1,smooth.length-1)];
  if(right.i-left.i>8)return null;
  const mix=right.i===left.i?0:(position-left.i)/(right.i-left.i);
  bins.push(Math.max(-12,Math.min(12,left.p+(right.p-left.p)*mix)));
 }
 const center=preserveCarrierRegister?0:[...bins].sort((a,b)=>a-b)[10];
 return {values:bins.map(v=>v-center),frames:voiced.length};
}
const distance=(a:number[],b:number[])=>Math.sqrt(a.reduce((sum,v,i)=>sum+Math.min(64,(v-b[i])**2),0)/a.length);
export function compareTone(take:AcousticReference,target:AcousticReference,partner:AcousticReference,preserveCarrierRegister=false):ToneComparison|null {
 const h=contour(take,preserveCarrierRegister),t=contour(target,preserveCarrierRegister),p=contour(partner,preserveCarrierRegister);
 if(!h||!t||!p)return null;
 const heard=h.values,a=t.values,b=p.values,separation=distance(a,b);
 // Identical or almost-flat centered reference shapes cannot establish tone
 // register. Lexical feedback may still work, but must not masquerade as F0.
 if(separation<.75)return null;
 return {version:'relative-tone-shape:v1',baseline:preserveCarrierRegister?'carrier-median':'word-median',heard,target:a,partner:b,separation,
  targetDistance:distance(heard,a),competitorDistance:distance(heard,b),frames:h.frames};
}
