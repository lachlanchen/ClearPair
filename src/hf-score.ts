import {referenceDistance,referenceSlice,locateReference,type AcousticReference} from './reference-features';

export interface HFDetails {
  version:'hf-segment-fft:v1';
  target:'h'|'f'|'v';
  heard:'h'|'f'|'v'|'uncertain';
  position:'initial'|'final';
  sound:number;
  word:number;
  timing:number;
  segmentMs:number;
  targetDistance:number;
  competitorDistance:number;
  margin:number;
  cue:'good'|'lip-friction'|'gentle-breath'|'back-friction'|'keep-ending'|'add-voice'|'uncertain';
}
interface Segment {shape:number[];relative:number[];energy:number;duration:number;voicing:number;from:number;to:number}
const average=(rows:number[][])=>rows[0].map((_,i)=>rows.reduce((s,row)=>s+row[i],0)/rows.length);
const mean=(values:number[])=>values.reduce((s,v)=>s+v,0)/Math.max(1,values.length);
const clamp=(value:number)=>Math.max(0,Math.min(1,value));
export function fricativeSegment(a:AcousticReference,final:boolean):Segment|null {
 const n=a.frames.length,peak=Math.max(...a.energy);
 let vowel=-1;
 // Require a stable vowel nucleus. A fricative alone or a click cannot count.
 for(let i=0;i<n-4;i++){
  // Breathy /ɪ/ and some synthesized Mandarin vowels have intermittent YIN
  // pitch. Locate the sustained vowel-energy rise, backed by periodic evidence
  // nearby, instead of waiting for a perfectly periodic run or a nasal coda.
  const levels=a.energy.slice(i,i+3);
  if(levels.filter(e=>e>peak*.6).length>=2&&a.pitch.slice(i,i+8).some(p=>p!==null)){vowel=i;break;}
 }
 if(vowel<0)return null;
 let from:number,to:number;
 if(final){
  let last=vowel;
  for(let i=vowel;i<n;i++)if(a.pitch[i]!==null&&a.energy[i]>peak*.2)last=i;
  // Keep partially voiced /v/: use both the last periodic transition and the
  // final 30% of the word, never demand completely voiceless final /f/ or /v/.
  from=Math.max(vowel+4,Math.min(last-3,Math.floor(n*.7)));to=n;
 }else{
  // H can be tens of dB quieter than its vowel. Retain its weak onset instead
  // of discarding it with a percentage-of-vowel-peak gate.
  from=a.energy.findIndex(e=>e>Math.max(.0005,peak*.003));
  to=vowel;
 }
 if(from<0||to-from<2)return null;
 const vowelEnd=Math.min(n,vowel+Math.max(5,Math.floor(n*.25)));
 const vowelShape=average(a.spectra.slice(vowel,vowelEnd));
 const shape=average(a.spectra.slice(from,to));
 return {shape,relative:shape.map((v,i)=>v-vowelShape[i]),
  energy:Math.log(Math.max(1e-8,mean(a.energy.slice(from,to)))/Math.max(1e-8,mean(a.energy.slice(vowel,vowelEnd)))),
  duration:(to-from)/Math.max(1,n),voicing:a.pitch.slice(from,to).filter(p=>p!==null).length/(to-from),from,to};
}
function distance(a:Segment,b:Segment,final:boolean,mandarin=false,sentence=false){
 // Fricative-to-vowel spectral differences cancel much of microphone colour
 // and speaker gain. Absolute shape contributes less; no fixed F/H frequency
 // threshold is used. Final f/v additionally uses partial voicing evidence.
 const shape=Math.sqrt(mean(a.shape.map((v,i)=>Math.min(36,(v-b.shape[i])**2))));
 const relative=Math.sqrt(mean(a.relative.map((v,i)=>Math.min(36,(v-b.relative[i])**2))));
 // Mandarin /x/ carries stronger friction relative to its vowel than /f/.
 // This ratio is gain independent. In a carrier sentence coarticulation can
 // shorten friction substantially; keep duration mainly in the timing item.
 return .55*relative+.25*shape+(mandarin?.5:.12)*Math.min(3,Math.abs(a.energy-b.energy))+
  (sentence?.05:.15)*Math.abs(Math.log(a.duration/b.duration))+(final?.7:.08)*Math.abs(a.voicing-b.voicing);
}
/** Separate the difficult consonant from the shared vowel. Designed reference
 * distances remain inspectable; this is not a trained correctness probability. */
export function hfDetails(take:AcousticReference,target:AcousticReference,competitor:AcousticReference,
 lesson:string,side:0|1,sentence=false,minimumStartFraction=0):HFDetails|null {
 const final=lesson==='hf-final',labels:('h'|'f'|'v')[]=final?['f','v']:['h','f'];
 if(sentence){
  const earliest=Math.floor(take.frames.length*minimumStartFraction);
  const a=locateReference(take,target,earliest),b=locateReference(take,competitor,earliest);
  const match=a&&b?(a.distance<=b.distance?a:b):a??b;
  if(!match||match.distance>1.7)return null;
  // Mandarin's voiced carrier ends immediately before the final fricative.
  // Left padding can import that previous vowel into the consonant segment.
  const padding=lesson==='hf-zh'?0:2;
  take=referenceSlice(take,Math.max(0,match.from-padding),Math.min(take.frames.length,match.to+2));
 }
 const a=fricativeSegment(take,final),t=fricativeSegment(target,final),c=fricativeSegment(competitor,final);
 if(!a||!t||!c)return null;
 const mandarin=lesson==='hf-zh';
 const td=distance(a,t,final,mandarin,sentence),cd=distance(a,c,final,mandarin,sentence),separation=distance(t,c,final,mandarin,sentence);
 if(separation<.12||Math.min(td,cd)>3.5)return null;
 const margin=(cd-td)/Math.max(.25,separation);
 const sound=Math.round(100*clamp(1/(1+Math.exp(-3*Math.max(-4,Math.min(4,margin))))));
 const word=Math.round(100*Math.exp(-Math.min(referenceDistance(take,target),referenceDistance(take,competitor))/1.6));
 const timing=Math.round(100*Math.exp(-Math.abs(Math.log(a.duration/t.duration))));
 const uncertain=Math.abs(margin)<.18;
 const heard=uncertain?'uncertain':margin>=0?labels[side]:labels[1-side];
 const cue=uncertain?'uncertain':margin>=0?'good':final?(side===0?'keep-ending':'add-voice'):
  side===1?'lip-friction':lesson==='hf-zh'?'back-friction':'gentle-breath';
 return {version:'hf-segment-fft:v1',target:labels[side],heard,position:final?'final':'initial',
  sound,word,timing,segmentMs:Math.round((a.to-a.from)*10),targetDistance:td,competitorDistance:cd,margin,cue};
}
