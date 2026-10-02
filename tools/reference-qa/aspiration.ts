import type {AcousticReference} from '../../src/reference-features';

/** QA diagnostic only; not a production score. Frame-resolution release-to-vowel
 * estimate, not a clinical VOT measurement.
 * Relative timing accommodates speaking rate. A stable energetic, periodic
 * vowel anchors the estimate; a noise/click alone cannot supply that anchor. */
export function releaseTiming(a:AcousticReference):{milliseconds:number;relative:number}|null {
 const peak=Math.max(0,...a.energy);
 if(peak<.001||a.frames.length<8)return null;
 const start=a.energy.findIndex(e=>e>Math.max(.00008,peak*.02));
 let vowel=-1;
 for(let i=Math.max(0,start);i<a.frames.length-3;i++){
  if(a.energy.slice(i,i+3).filter(e=>e>peak*.4).length>=2&&
     a.pitch.slice(i,i+4).filter(p=>p!==null).length>=3){vowel=i;break;}
 }
 if(start<0||vowel<start)return null;
 return {milliseconds:(vowel-start)*10,relative:(vowel-start)/a.frames.length};
}
