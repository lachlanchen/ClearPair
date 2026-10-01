import {execFileSync} from 'node:child_process';
import {describe,expect,it} from 'vitest';
import {FRAME_SIZE,HOP_SIZE,LEAD_SAMPLES,MEL_BANDS,N_FRAMES,SAMPLE_RATE,WINDOW_SAMPLES,
  logMelFeatures,onsetFeatures,tokenWindow,type OnsetNormalization} from './onset-features';
import {resamplePCM} from './pcm';

function fixture(length=WINDOW_SAMPLES){
  return Float32Array.from({length},(_,i)=>{
    const t=i/SAMPLE_RATE;
    return .25*(.4+.6*i/WINDOW_SAMPLES)*Math.sin(2*Math.PI*(180*t+1200*t*t))+.08*Math.cos(2*Math.PI*3100*t);
  });
}
describe('versioned onset features',()=>{
  it('uses exactly 28 periodic-Hann frames and 40 temporally centred bands',()=>{
    expect(FRAME_SIZE).toBe(400);expect(HOP_SIZE).toBe(160);expect(N_FRAMES).toBe(28);
    const features=logMelFeatures(fixture());
    expect(features).toHaveLength(N_FRAMES);
    for(const row of features){expect(row).toHaveLength(MEL_BANDS);expect(row.every(Number.isFinite)).toBe(true);}
    for(let band=0;band<MEL_BANDS;band++){
      const mean=features.reduce((sum,row)=>sum+row[band],0)/N_FRAMES;
      expect(Math.abs(mean)).toBeLessThan(1e-6);
    }
  });
  it('zero pads short windows and truncates after 4800 samples',()=>{
    const short=fixture(611),padded=new Float32Array(WINDOW_SAMPLES);padded.set(short);
    expect(logMelFeatures(short)).toEqual(logMelFeatures(padded));
    const extended=fixture(WINDOW_SAMPLES+200);
    expect(logMelFeatures(extended)).toEqual(logMelFeatures(extended.subarray(0,WINDOW_SAMPLES)));
    for(const row of logMelFeatures(new Float32Array()))for(const value of row)expect(Math.abs(value)).toBeLessThan(1e-12);
  });
  it('preserves the onset lead and pads both recording boundaries',()=>{
    const audio=Float32Array.from({length:5000},(_,i)=>i/5000);
    const early=tokenWindow(audio,100);
    expect(early.slice(0,LEAD_SAMPLES-100)).toEqual(new Float32Array(LEAD_SAMPLES-100));
    expect(early[LEAD_SAMPLES]).toBe(audio[100]);
    const late=tokenWindow(audio,4900);
    expect(late[LEAD_SAMPLES]).toBe(audio[4900]);
    expect(late.slice(LEAD_SAMPLES+100)).toEqual(new Float32Array(WINDOW_SAMPLES-LEAD_SAMPLES-100));
  });
  it('converts original onset coordinates using the app antialias resampler',()=>{
    const audio=fixture(14000),rate=48000,onset=3000;
    const expected=logMelFeatures(tokenWindow(resamplePCM(audio,rate),1000));
    expect(onsetFeatures(audio,rate,onset)).toEqual(expected);
    expect(onsetFeatures(audio,rate,13000)).toBeNull();
    expect(onsetFeatures(audio,rate,onset,'global')).toEqual(logMelFeatures(tokenWindow(resamplePCM(audio,rate),1000),'global'));
  });
  it('keeps band normalization as the unchanged explicit/default v1 contract',()=>{
    expect(logMelFeatures(fixture())).toEqual(logMelFeatures(fixture(),'band'));
    expect(logMelFeatures(fixture(),'global')).not.toEqual(logMelFeatures(fixture()));
  });
  it('retains average spectral shape under global centring',()=>{
    const tone=(hz:number)=>Float32Array.from({length:WINDOW_SAMPLES},(_,i)=>.3*Math.sin(2*Math.PI*hz*i/SAMPLE_RATE));
    const means=(matrix:Float32Array[])=>Array.from({length:MEL_BANDS},(_,b)=>matrix.reduce((sum,row)=>sum+row[b],0)/N_FRAMES);
    const low=means(logMelFeatures(tone(1000),'global')),high=means(logMelFeatures(tone(4000),'global'));
    expect(Math.abs(low.reduce((a,b)=>a+b,0)/MEL_BANDS)).toBeLessThan(1e-6);
    expect(Math.abs(high.reduce((a,b)=>a+b,0)/MEL_BANDS)).toBeLessThan(1e-6);
    expect(high.indexOf(Math.max(...high))).toBeGreaterThan(low.indexOf(Math.max(...low)));
    expect(Math.sqrt(low.reduce((sum,value,i)=>sum+(value-high[i])**2,0)/MEL_BANDS)).toBeGreaterThan(3);
    expect(means(logMelFeatures(tone(1000),'band')).every(value=>Math.abs(value)<1e-6)).toBe(true);
  });
  it('removes a common gain offset when broadband energy is above the fixed log floor',()=>{
    let state=52;
    const audio=Float32Array.from({length:WINDOW_SAMPLES},()=>{
      state=(Math.imul(state,1664525)+1013904223)>>>0;return .2*(2*state/2**32-1);
    });
    const quiet=logMelFeatures(audio,'global'),loud=logMelFeatures(Float32Array.from(audio,v=>v*3),'global');
    const maxError=Math.max(...quiet.flatMap((row,t)=>Array.from(row,(v,b)=>Math.abs(v-loud[t][b]))));
    expect(maxError).toBeLessThan(.001);
  });
  it('rejects unspecified normalization modes instead of guessing the model contract',()=>{
    expect(()=>logMelFeatures(fixture(),'automatic' as OnsetNormalization)).toThrow();
    expect(()=>onsetFeatures(fixture(),16000,0,'automatic' as OnsetNormalization)).toThrow();
  });
  it.each([NaN,Infinity,-Infinity])('rejects nonfinite PCM %s',value=>{
    expect(()=>logMelFeatures([0,value])).toThrow();
    expect(()=>tokenWindow([0,value],0)).toThrow();
  });
  it.each([-1,.5,NaN,Infinity,5001])('rejects an invalid onset %s',onset=>{
    expect(()=>tokenWindow(fixture(5000),onset)).toThrow();
  });
  it('rejects energy overflow and invalid input sample rates',()=>{
    expect(()=>logMelFeatures([Number.MAX_VALUE,Number.MAX_VALUE])).toThrow();
    expect(()=>onsetFeatures(fixture(),0,0)).toThrow();
  });
  // Full independent NumPy/FFT check is opt-in so npm tests do not require Python.
  // ONSET_PARITY_PYTHON=python3 npx vitest run src/onset-features.test.ts
  it.skipIf(!process.env.ONSET_PARITY_PYTHON)('matches every NumPy float32 feature on deterministic padded/full windows',()=>{
    const output=execFileSync(process.env.ONSET_PARITY_PYTHON!,['-c',`
import importlib.util, json, numpy as np
spec=importlib.util.spec_from_file_location('onset_features','tools/onset-model/features.py')
f=importlib.util.module_from_spec(spec); spec.loader.exec_module(f)
def fixture(length):
    i=np.arange(length,dtype=np.float64); t=i/f.SAMPLE_RATE
    return (.25*(.4+.6*i/f.WINDOW_SAMPLES)*np.sin(2*np.pi*(180*t+1200*t*t))+.08*np.cos(2*np.pi*3100*t)).astype(np.float32)
print(json.dumps({mode:[f.log_mel(fixture(length),normalization=mode).tolist() for length in [0,611,4800,5000]] for mode in ['band','global']}))
`],{encoding:'utf8',timeout:10_000,maxBuffer:1024*1024});
    const expected=JSON.parse(output) as Record<OnsetNormalization,number[][][]>;
    for(const mode of ['band','global'] as const){
      for(const [index,length] of [0,611,4800,5000].entries()){
        const actual=logMelFeatures(fixture(length),mode);
        let maxError=0;
        for(let t=0;t<N_FRAMES;t++)for(let band=0;band<MEL_BANDS;band++){
          maxError=Math.max(maxError,Math.abs(actual[t][band]-expected[mode][index][t][band]));
        }
        expect(maxError).toBeLessThan(2e-6);
      }
    }
  });
});
