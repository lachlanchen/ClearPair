import {framePitch} from './pitch';

/** Deterministic, speaker-normalized acoustic comparison for an explicitly
 * labelled beta practice index. This is not a phoneme classifier or an ASR.
 * 25 ms frames / 10 ms hops, pre-emphasis, 32 mel filters, 12 cepstra.
 * Channel normalization is deliberately partial: full CMVN on a single vowel
 * would erase the vowel distinction we are trying to practise. */
export interface AcousticReference {
  frames:number[][];
  pitch:(number|null)[];
  seconds:number;
  periodic:number;
}
const N=512,HOP=160,WIN=400,BANDS=32;
const mel=(hz:number)=>2595*Math.log10(1+hz/700);
const hz=(m:number)=>700*(10**(m/2595)-1);
const points=Array.from({length:BANDS+2},(_,i)=>hz(mel(7600)*i/(BANDS+1)));
const bank=Array.from({length:BANDS},(_,b)=>Array.from({length:N/2+1},(_,i)=>{
 const f=i*16000/N;
 return Math.max(0,Math.min((f-points[b])/(points[b+1]-points[b]),(points[b+2]-f)/(points[b+2]-points[b+1])));
}));
function fft(re:Float64Array,im:Float64Array){
 for(let i=1,j=0;i<N;i++){
  let bit=N>>1;for(;j&bit;bit>>=1)j^=bit;j^=bit;
  if(i<j){[re[i],re[j]]=[re[j],re[i]];[im[i],im[j]]=[im[j],im[i]];}
 }
 for(let length=2;length<=N;length<<=1){
  const wr=Math.cos(-2*Math.PI/length),wi=Math.sin(-2*Math.PI/length);
  for(let start=0;start<N;start+=length){let cr=1,ci=0;
   for(let k=0;k<length/2;k++){
    const a=start+k,b=a+length/2,tr=re[b]*cr-im[b]*ci,ti=re[b]*ci+im[b]*cr;
    re[b]=re[a]-tr;im[b]=im[a]-ti;re[a]+=tr;im[a]+=ti;
    const next=cr*wr-ci*wi;ci=cr*wi+ci*wr;cr=next;
   }
  }
 }
}
export function acousticReference(input:Float32Array):AcousticReference|null{
 if(input.length>216000||input.some(v=>!Number.isFinite(v)||Math.abs(v)>1.01))throw Error('Invalid practice audio');
 if(input.length<1600)return null;
 const energy:number[]=[];
 for(let at=0;at+HOP<=input.length;at+=HOP){
  let sum=0,mean=0;for(let i=at;i<at+HOP;i++)mean+=input[i];mean/=HOP;
  for(let i=at;i<at+HOP;i++)sum+=(input[i]-mean)**2;energy.push(Math.sqrt(sum/HOP));
 }
 const peak=Math.max(...energy);
 if(peak<.003)return null;
 const floor=[...energy].sort((a,b)=>a-b)[Math.floor(energy.length*.1)];
 const threshold=Math.max(.002,Math.min(peak*.12,floor*2.5));
 let first=energy.findIndex(e=>e>threshold),last=energy.length-1;
 while(last>first&&energy[last]<=threshold)last--;
 if(first<0||last-first<9)return null;
 first=Math.max(0,first-3);last=Math.min(energy.length-1,last+3);
 const audio=input.subarray(first*HOP,Math.min(input.length,(last+1)*HOP));
 const re=new Float64Array(N),im=new Float64Array(N),frames:number[][]=[],pitches:(number|null)[]=[];
 for(let at=0;at+WIN<=audio.length;at+=HOP){
  re.fill(0);im.fill(0);
  for(let i=0;i<WIN;i++)re[i]=(audio[at+i]-.97*(audio[at+i-1]??0))*(.54-.46*Math.cos(2*Math.PI*i/(WIN-1)));
  fft(re,im);
  const logs=bank.map(weights=>Math.log(1e-10+weights.reduce((s,w,i)=>s+w*(re[i]**2+im[i]**2),0)));
  const coeffs=Array.from({length:12},(_,c)=>logs.reduce((s,v,b)=>s+v*Math.cos(Math.PI*(c+1)*(b+.5)/BANDS),0)/BANDS);
  frames.push(coeffs);
  // 40 ms gives the pitch estimator enough periods at low speaking pitches.
  pitches.push(framePitch(audio.subarray(at,Math.min(at+640,audio.length)),16000));
 }
 if(frames.length<8)return null;
 const mean=Array.from({length:12},(_,c)=>frames.reduce((s,f)=>s+f[c],0)/frames.length);
 const voiced=pitches.filter((p):p is number=>p!==null),median=[...voiced].sort((a,b)=>a-b)[Math.floor(voiced.length/2)];
 return {frames:frames.map(f=>f.map((v,c)=>v-.25*mean[c])),
  pitch:pitches.map(p=>p&&median?12*Math.log2(p/median):null),seconds:audio.length/16000,
  periodic:voiced.length/pitches.length};
}
function frameCost(a:number[],b:number[]){
 // Lower cepstra retain vowel/spectral envelope; higher coefficients retain
 // frication differences without letting a single noisy high band dominate.
 return Math.sqrt(a.reduce((s,v,i)=>s+Math.min(16,(v-b[i])**2)*(i<6?1:.6),0)/9.6);
}
export function referenceDistance(a:AcousticReference,b:AcousticReference,tone=false,timing=false):number{
 const n=a.frames.length,m=b.frames.length;
 if(!n||!m||n>1350||m>1350)return Infinity;
 let previous=new Float64Array(m+1).fill(Infinity);previous[0]=0;
 let pathLength=new Uint16Array(m+1);
 // A normalized Sakoe-Chiba band bounds time warping and rejects unbounded
 // stretches. Penalties keep deletions/repetitions from matching for free.
 for(let i=1;i<=n;i++){
  const current=new Float64Array(m+1).fill(Infinity),length=new Uint16Array(m+1);
  const center=i*m/n,band=Math.max(8,Math.ceil(m*.28));
  for(let j=Math.max(1,Math.floor(center-band));j<=Math.min(m,Math.ceil(center+band));j++){
   let cost=frameCost(a.frames[i-1],b.frames[j-1]);
   const pa=a.pitch[i-1],pb=b.pitch[j-1];
   if(tone)cost+=pa!==null&&pb!==null?Math.min(1.5,Math.abs(pa-pb)/5)*.65:(pa===pb?0:.25);
   const choices=[previous[j-1],previous[j]+.08,current[j-1]+.08];
   const best=choices.indexOf(Math.min(...choices));
   current[j]=choices[best]+cost;
   length[j]=(best===0?pathLength[j-1]:best===1?pathLength[j]:length[j-1])+1;
  }
  previous=current;pathLength=length;
 }
 const ratio=Math.abs(Math.log(a.seconds/b.seconds));
 return previous[m]/Math.max(1,pathLength[m])+(timing?.3:.08)*Math.min(2,ratio);
}
