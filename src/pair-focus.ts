import {frameCost, type AcousticReference} from './reference-features';
import type {AssessmentPlan} from './scoring-profiles';

type Plan=Extract<AssessmentPlan,{mode:'contrast'}>;
export type FocusRegion='initial'|'vowel'|'final'|'whole';
export interface PairFocus {
  version:'pair-focus-dtw:v1';
  region:FocusRegion;
  targetDistance:number;
  competitorDistance:number;
  separation:number;
  frames:number;
}

/** Position priors constrain a reference-disagreement mask, not a phoneme
 * boundary. In particular, shared final vowels must not decide initial L/R. */
export function focusRegion(plan:Plan):FocusRegion {
  const lesson=plan.calibrationKey.split('/')[1],id=plan.profile.id;
  // A lesson group is not a segment position: teeth/teethe and wreath/wreathe
  // practise FINAL TH, unlike thin/sin. Use the authored IPA only as a prior;
  // the acoustic disagreement mask still locates the actual contrast region.
  if(id==='en-fricative:v1'){
    const phones=(ipa:string)=>[...ipa.replace(/[ˈˌː.\s]/gu,'')];
    const target=phones(plan.target.ipa),competitor=phones(plan.competitor.ipa);
    const a=target.at(-1),b=competitor.at(-1);
    if(a&&b&&a!==b&&/[θðszfvʃʒ]/u.test(a)&&/[θðszfvʃʒ]/u.test(b))return 'final';
    if(target[0]===competitor[0])return 'whole';
  }
  if(lesson==='lr-end'||lesson==='ko-batchim'||lesson==='yue-p-t'||lesson==='yue-n-ng'||
     ['en-ending:v1','en-nasal:v1'].includes(id))return 'final';
  if(['en-vowel:v1','ko-vowel:v1','ar-syllable-vowel:v1','yue-vowels:v1'].includes(id))return 'vowel';
  if(id==='cmn-final:v1')return ['an-ang','en-eng','in-ing'].includes(lesson)?'final':'vowel';
  if(['en-l-r:v1','en-h-f:v1','cmn-x-f:v1','en-fricative:v1','cmn-initial:v1','ko-three-way-stop:v1',
      'ko-fricative:v1','ko-position:v1','yue-consonants:v1','ja-voicing:v1','ja-h-b-p:v1'].includes(id))return 'initial';
  return 'whole';
}

/** One bounded path, with explicit insertion/deletion cost. The shared path
 * compares both displayed candidates equally; neither target gets to warp away
 * its difficult sound independently. Runs only inside the assessment worker. */
function align(n:number,m:number,cost:(i:number,j:number)=>number):[number,number][]|null {
  if(!n||!m||n>1350||m>2700||n/m>3.5||m/n>3.5)return null;
  const steps=new Uint8Array(n*m).fill(255);
  let previous=new Float64Array(m+1).fill(Infinity);previous[0]=0;
  const band=Math.max(8,Math.ceil(m*.28));
  for(let i=1;i<=n;i++){
    const current=new Float64Array(m+1).fill(Infinity),center=i*m/n;
    for(let j=Math.max(1,Math.floor(center-band));j<=Math.min(m,Math.ceil(center+band));j++){
      const choices=[previous[j-1],previous[j]+.12,current[j-1]+.12];
      const k=choices.indexOf(Math.min(...choices));
      current[j]=choices[k]+cost(i-1,j-1);steps[(i-1)*m+j-1]=k;
    }
    previous=current;
  }
  if(!Number.isFinite(previous[m]))return null;
  const path:[number,number][]=[];let i=n-1,j=m-1;
  while(i>=0&&j>=0){
    path.push([i,j]);const step=steps[i*m+j];
    if(step===255)return null;
    if(step===0){i--;j--;}else if(step===1)i--;else j--;
  }
  return i===-1&&j===-1?path.reverse():null;
}

/** Compare the locally differing part of a minimal pair. A/B are supplied in
 * curriculum order, irrespective of the selected target, making side reversal
 * exactly symmetric. No human accuracy probability is inferred from distance. */
export function focusedPair(take:AcousticReference,a:AcousticReference,b:AcousticReference,
 region:FocusRegion):PairFocus|null {
  const pair=align(a.frames.length,b.frames.length,(i,j)=>frameCost(a.frames[i],b.frames[j]));
  if(!pair)return null;
  const differences=pair.map(([i,j])=>frameCost(a.frames[i],b.frames[j]));
  const smooth=differences.map((_,i)=>{
    const nearby=differences.slice(Math.max(0,i-2),i+3);
    return nearby.reduce((s,v)=>s+v,0)/nearby.length;
  });
  const eligible=pair.map((_,i)=>{
    const p=(i+.5)/pair.length;
    return region==='initial'?p<.5:region==='final'?p>.5:region==='vowel'?p>.12&&p<.88:true;
  });
  const peak=Math.max(0,...smooth.filter((_,i)=>eligible[i]));
  if(peak<.08)return null;
  if(differences.filter((d,i)=>eligible[i]&&d>Math.max(.08,peak*.55)).length<3)return null;
  // Retain a neighbourhood (>=40 ms) rather than a lone noisy FFT frame.
  const salient=smooth.map((d,i)=>eligible[i]&&d>=peak*.55);
  const weights=pair.map((_,i)=>eligible[i]&&salient.slice(Math.max(0,i-2),i+3).some(Boolean)
    ?Math.max(.15,(smooth[i]/peak)**2):0);
  const focusedFrames=weights.filter(w=>w>0).length;
  if(focusedFrames<4)return null;
  // Select one A/B-symmetric alignment before measuring either candidate.
  // Do not average opposing cepstra into an artificial "middle sound": that
  // can erase the very onset needed to align a slower minimal-pair word.
  const path=align(take.frames.length,pair.length,(i,j)=>{
    const [ai,bi]=pair[j];
    return Math.min(frameCost(take.frames[i],a.frames[ai]),frameCost(take.frames[i],b.frames[bi]));
  });
  if(!path)return null;
  let total=0,td=0,cd=0,sep=0;
  const seen=new Set<number>();
  for(const [i,j] of path){
    const w=weights[j];if(!w)continue;
    const [ai,bi]=pair[j];seen.add(i);total+=w;
    td+=w*frameCost(take.frames[i],a.frames[ai]);
    cd+=w*frameCost(take.frames[i],b.frames[bi]);sep+=w*differences[j];
  }
  if(total<=0||seen.size<4||sep/total<.08)return null;
  return {version:'pair-focus-dtw:v1',region,targetDistance:td/total,
    competitorDistance:cd/total,separation:sep/total,frames:seen.size};
}
