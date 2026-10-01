/** Onset feature definition adapted from this project's sibling L-And-N
 * tools/onset-model/features.py. No classifier weights or training data are reused.
 * Mirror tools/onset-model/features.py when changing this versioned transform. */
import {resamplePCM} from './pcm';

export const ONSET_FEATURE_VERSION='htk-logmel-16k-300ms-40:v1';
export const ONSET_GLOBAL_FEATURE_VERSION='htk-logmel-16k-300ms-40-global:v2';
export type OnsetNormalization='band'|'global';
export const SAMPLE_RATE=16_000;
export const WINDOW_SAMPLES=4_800;
export const LEAD_SAMPLES=640;
export const FRAME_SIZE=400;
export const HOP_SIZE=160;
export const FFT_SIZE=512;
export const MEL_BANDS=40;
export const LOG_FLOOR=1e-5;
export const N_FRAMES=Math.floor((WINDOW_SAMPLES-FRAME_SIZE)/HOP_SIZE)+1;

const hzToMel=(hz:number)=>2595*Math.log10(1+hz/700);
const melToHz=(mel:number)=>700*(10**(mel/2595)-1);
const hann=Float64Array.from({length:FRAME_SIZE},(_,i)=>.5-.5*Math.cos(2*Math.PI*i/FRAME_SIZE));
const points=Float64Array.from({length:MEL_BANDS+2},(_,i)=>melToHz(hzToMel(SAMPLE_RATE/2)*i/(MEL_BANDS+1)));
const bank=Array.from({length:MEL_BANDS},(_,band)=>Float64Array.from({length:FFT_SIZE/2+1},(_,bin)=>{
  const hz=bin*SAMPLE_RATE/FFT_SIZE;
  return Math.max(0,Math.min((hz-points[band])/Math.max(points[band+1]-points[band],1e-9),
    (points[band+2]-hz)/Math.max(points[band+2]-points[band+1],1e-9)));
}));

function validateAudio(samples:ArrayLike<number>){
  if(!samples||!Number.isSafeInteger(samples.length)||samples.length<0)throw Error('Invalid onset PCM shape');
  for(let i=0;i<samples.length;i++)if(!Number.isFinite(samples[i]))throw Error('Invalid onset PCM sample');
}
function validateNormalization(value:unknown):asserts value is OnsetNormalization{
  if(value!=='band'&&value!=='global')throw Error('Unsupported onset normalization');
}

/** In-place radix-2 FFT, with the same unnormalised forward convention as NumPy. */
function fft(real:Float64Array,imag:Float64Array){
  for(let i=1,j=0;i<FFT_SIZE;i++){
    let bit=FFT_SIZE>>1;
    for(;j&bit;bit>>=1)j^=bit;
    j^=bit;
    if(i<j){[real[i],real[j]]=[real[j],real[i]];[imag[i],imag[j]]=[imag[j],imag[i]];}
  }
  for(let length=2;length<=FFT_SIZE;length<<=1){
    const angle=-2*Math.PI/length,wr=Math.cos(angle),wi=Math.sin(angle);
    for(let start=0;start<FFT_SIZE;start+=length){
      let cr=1,ci=0;
      for(let k=0;k<length/2;k++){
        const a=start+k,b=a+length/2,tr=real[b]*cr-imag[b]*ci,ti=real[b]*ci+imag[b]*cr;
        real[b]=real[a]-tr;imag[b]=imag[a]-ti;real[a]+=tr;imag[a]+=ti;
        const next=cr*wr-ci*wi;ci=cr*wi+ci*wr;cr=next;
      }
    }
  }
}

/** [28 time frames][40 mel bands], 16 kHz PCM. Pad/truncate to 300 ms.
 * Keep log energies and means in float64; round only the final matrix to float32.
 * v1 centres each band over time. Explicit global mode (v2) removes one common
 * log-energy offset while retaining average spectral shape across mel bands. */
export function logMelFeatures(samples:ArrayLike<number>,normalization:OnsetNormalization='band'):Float32Array[]{
  validateNormalization(normalization);
  validateAudio(samples);
  const audio=new Float64Array(WINDOW_SAMPLES);
  for(let i=0;i<Math.min(samples.length,WINDOW_SAMPLES);i++)audio[i]=samples[i];
  const real=new Float64Array(FFT_SIZE),imag=new Float64Array(FFT_SIZE),power=new Float64Array(FFT_SIZE/2+1);
  const frames=Array.from({length:N_FRAMES},(_,t)=>{
    real.fill(0);imag.fill(0);
    for(let i=0;i<FRAME_SIZE;i++)real[i]=audio[t*HOP_SIZE+i]*hann[i];
    fft(real,imag);
    for(let b=0;b<power.length;b++)power[b]=real[b]**2+imag[b]**2;
    return Float64Array.from({length:MEL_BANDS},(_,band)=>{
      let energy=0;
      for(let bin=0;bin<power.length;bin++)energy+=power[bin]*bank[band][bin];
      const value=Math.log(energy+LOG_FLOOR);
      if(!Number.isFinite(value))throw Error('Onset spectral energy overflow');
      return value;
    });
  });
  if(normalization==='global'){
    const mean=frames.reduce((sum,frame)=>sum+frame.reduce((s,value)=>s+value,0),0)/(N_FRAMES*MEL_BANDS);
    return frames.map(frame=>Float32Array.from(frame,value=>value-mean));
  }
  const means=Float64Array.from({length:MEL_BANDS},(_,band)=>frames.reduce((sum,frame)=>sum+frame[band],0)/N_FRAMES);
  return frames.map(frame=>Float32Array.from(frame,(value,band)=>value-means[band]));
}

/** Known onset sample at 16 kHz; preserve its 40 ms lead with zero padding. */
export function tokenWindow(audio:ArrayLike<number>,onsetSample:number):Float32Array{
  validateAudio(audio);
  if(!Number.isSafeInteger(onsetSample)||onsetSample<0||onsetSample>audio.length)throw Error('Invalid onset sample');
  const start=onsetSample-LEAD_SAMPLES;
  const window=new Float32Array(WINDOW_SAMPLES);
  for(let source=Math.max(0,start);source<Math.min(audio.length,start+WINDOW_SAMPLES);source++){
    window[source-start]=audio[source];
    if(!Number.isFinite(window[source-start]))throw Error('Onset PCM exceeds float32 range');
  }
  return window;
}

/** Onset is supplied in the original recording's sample coordinates. Resampling
 * uses the app's antialiased sinc path. A short trailing fragment has no evidence. */
export function onsetFeatures(samples:Float32Array,sampleRate:number,onsetSample:number,
  normalization:OnsetNormalization='band'):Float32Array[]|null{
  validateNormalization(normalization);
  if(!Number.isSafeInteger(onsetSample)||onsetSample<0||onsetSample>samples.length)throw Error('Invalid onset sample');
  const audio=resamplePCM(samples,sampleRate);
  const onset=Math.round(onsetSample*SAMPLE_RATE/sampleRate);
  if(audio.length-onset<WINDOW_SAMPLES/2)return null;
  return logMelFeatures(tokenWindow(audio,onset),normalization);
}
