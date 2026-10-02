import {describe,it,expect} from 'vitest';
import {referenceScore} from './reference-score';
import {assessmentPlan} from './scoring-profiles';
import {fricativeSegment} from './hf-score';
import {acousticReference,locateReference,type AcousticReference} from './reference-features';
/** Controlled synthetic consonant+vowel fixtures verify segmentation and
 * invariance. They are not human pronunciation-accuracy validation. */
function word(kind:'h'|'f'|'none',gain=1,pitch=140){
 const onset=kind==='none'?0:3200,vowel=8000,a=new Float32Array(onset+vowel+1600);let seed=123;
 for(let i=0;i<onset;i++){
  seed=(seed*1664525+1013904223)>>>0;const noise=seed/2**32-.5,t=i/16000;
  // H's vowel-shaped breath vs F's flatter high-band friction.
  a[i]=gain*.08*(kind==='f'?noise*Math.sin(2*Math.PI*5000*t):noise*(.3+.7*Math.sin(2*Math.PI*750*t)));
 }
 for(let i=0;i<vowel;i++){
  const t=i/16000,envelope=Math.min(1,i/400,(vowel-i)/400);
  for(let h=1;h<28;h++)a[onset+i]+=gain*.045*(Math.exp(-(((h*pitch-750)/200)**2))+.35*Math.exp(-(((h*pitch-2100)/320)**2)))*Math.sin(2*Math.PI*pitch*h*t)*envelope;
 }
 return a;
}
function assess(audio:Float32Array,side:0|1=0,lesson='hf-en',sentence=false){
 const p=assessmentPlan('handf',lesson,0,side,sentence);if(p.mode!=='contrast')throw Error('plan');
 const h=word('h'),f=word('f');return referenceScore({id:'fixture',plan:p,samples:audio,target:side===0?h:f,competitor:side===0?f:h,voice:'synthetic-engineering-fixture',
 ...(sentence?{wordTarget:side===0?h:f,wordCompetitor:side===0?f:h}:{})});
}
describe('consonant-focused H & F scoring',()=>{
 it('does not mistake a brief preceding carrier vowel for the stable target vowel',()=>{
  const energy=[.1,.05,.04,.04,.04,.04,.04,.08,.12,.14,.14,.13,.12,.1,.09,.06,.04,.02];
  const a:AcousticReference={energy,frames:energy.map(()=>Array(12).fill(0)),spectra:energy.map(()=>Array(32).fill(0)),
   pitch:energy.map((_,i)=>i===0||i>=8?0:null),seconds:energy.length*.01,periodic:.5};
  expect(fricativeSegment(a,false)?.to).toBeGreaterThanOrEqual(7);
 });
 it('keeps a bounded carrier search from selecting an earlier repeated word',()=>{
  const a=acousticReference(word('h'))!,n=a.frames.length;
  const take:AcousticReference={frames:[...a.frames,...a.frames],spectra:[...a.spectra,...a.spectra],energy:[...a.energy,...a.energy],
   pitch:[...a.pitch,...a.pitch],periodic:a.periodic,seconds:a.seconds*2};
  expect(locateReference(take,a,n)?.from).toBeGreaterThanOrEqual(n);
  expect(locateReference(take,a)?.from).toBeLessThan(n);
 });
 it('separates the onset even when the rest of the word is identical',()=>{
  const h=assess(word('h')),f=assess(word('f'));
  expect(h.status).toBe('matched');expect(f.status).toBe('matched');
  if(h.status==='matched'&&f.status==='matched'){
   expect(h.hf?.heard).toBe('h');expect(f.hf?.heard).toBe('f');
   expect(h.hf?.sound).toBeGreaterThan(90);expect(f.hf?.sound).toBeLessThan(20);
   expect(h.score-f.score).toBeGreaterThan(50);expect(f.hf?.cue).toBe('gentle-breath');
  }
 });
 it('scores the selected F side and keeps Mandarin H separate',()=>{
  const f=assess(word('f'),1),x=assess(word('f'),0,'hf-zh');
  expect(f.status).toBe('matched');if(f.status==='matched')expect(f.hf?.target).toBe('f');
  if(x.status==='matched')expect(x.hf?.cue).toBe('back-friction');
 });
 it('does not award a high score to vowel-only speech, noise or silence',()=>{
  expect(assess(word('none')).status).toBe('unscored');expect(assess(new Float32Array(16000)).status).toBe('unscored');
 });
 it('preserves sound separation after quieter capture or changed vowel pitch',()=>{
  const h=assess(word('h',.35,180)),f=assess(word('f',.35,180));
  expect(h.status).toBe('matched');expect(f.status).toBe('matched');
  if(h.status==='matched'&&f.status==='matched')expect(h.hf!.sound-f.hf!.sound).toBeGreaterThan(25);
 });
 it('locates either side inside a sentence without selecting the expected side first',()=>{
  const prefix=word('none',.8,240),suffix=word('none',.8,240),make=(kind:'h'|'f')=>{
   const target=word(kind),a=new Float32Array(prefix.length+target.length+suffix.length);
   a.set(prefix);a.set(target,prefix.length);a.set(suffix,prefix.length+target.length);return a;
  };
  const h=assess(make('h'),0,'hf-en',true),f=assess(make('f'),0,'hf-en',true);
  expect(h.status).toBe('matched');expect(f.status).toBe('matched');
  if(h.status==='matched'&&f.status==='matched'){
   expect(h.hf?.heard).toBe('h');expect(f.hf?.heard).toBe('f');expect(h.hf!.sound-f.hf!.sound).toBeGreaterThan(40);
  }
 });
});
