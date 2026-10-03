import {describe,it,expect,vi,afterEach} from 'vitest';
import {referenceScore} from './reference-score';
import {assessmentPlan} from './scoring-profiles';
import {fricativeSegment,hfAnalysisSamples} from './hf-score';
import * as hfEngine from './hf-score';
import {acousticReference,locateReference,type AcousticReference} from './reference-features';
/** Controlled synthetic consonant+vowel fixtures verify segmentation and
 * invariance. They are not human pronunciation-accuracy validation. */
function word(kind:'h'|'f'|'none',gain=1,pitch=140,onsetSamples=3200){
 const onset=kind==='none'?0:onsetSamples,vowel=8000,a=new Float32Array(onset+vowel+1600);let seed=123,breath=0;
 for(let i=0;i<onset;i++){
  seed=(seed*1664525+1013904223)>>>0;const noise=seed/2**32-.5,t=i/16000;
  // H's vowel-shaped breath vs F's flatter high-band friction.
  breath=.85*breath+.15*noise;
  // Filter the breath, rather than amplitude-modulating white noise (which
  // stays broadband and is not a physical H/F spectral contrast).
  a[i]=gain*.08*(kind==='f'?noise:breath*2.5);
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
 it('uses active-frame gain, not trailing silence, without mutating the original recording',()=>{
  const a=word('f'),b=new Float32Array(a.length+16000);b.set(a.map(v=>v*.08));
  const x=hfAnalysisSamples(a),y=hfAnalysisSamples(b);
  expect(a[0]).not.toBe(x[0]);
  for(let i=0;i<a.length;i+=100)expect(x[i]).toBeCloseTo(y[i],5);
  expect(hfAnalysisSamples(new Float32Array(16000))).toEqual(new Float32Array(16000));
  expect(()=>hfAnalysisSamples(new Float32Array([NaN]))).toThrow();
  expect(()=>hfAnalysisSamples(new Float32Array([1.2]))).toThrow();
 });
 afterEach(()=>vi.restoreAllMocks());
 it('retains a clear opposite-word comparison when the consonant boundary is unavailable',()=>{
  vi.spyOn(hfEngine,'hfDetails').mockReturnValue(null);
  // A longer friction region supplies clear whole-word separation. A weak
  // whole-word difference must still abstain when sound alignment is missing.
  const f=word('f',1,140,8000),h=word('h');
  const plan=assessmentPlan('handf','hf-en',0,0,false);if(plan.mode!=='contrast')throw Error('plan');
  const result=referenceScore({id:'fallback-fixture',plan,samples:f,target:h,competitor:f,voice:'synthetic-engineering-fixture'});
  expect(result.status).toBe('matched');
  if(result.status==='matched'){
   expect(result.closestWord).toBe('fat');expect(result.score).toBeLessThan(50);
   expect(result.evidence).toBe('word');expect(result.hf).toBeUndefined();
  }
  expect(assess(word('none')).status).toBe('unscored');
  const partial=assess(word('h'));
  expect(partial.status).toBe('matched');
  if(partial.status==='matched'){expect(partial.score).toBeLessThanOrEqual(59);expect(partial.evidence).toBe('word');expect(partial.hf).toBeUndefined();}
  const clearOpposite=assess(word('f'));
  expect(clearOpposite.status).toBe('matched');
  if(clearOpposite.status==='matched'){
   expect(clearOpposite.score).toBeLessThan(50);expect(clearOpposite.evidence).toBe('word');
  }
 });
 it('returns measured analysis and a bounded score for an ambiguous consonant, not a failed take',()=>{
  const clear=assess(word('h'));if(clear.status!=='matched'||!clear.hf)throw Error('fixture');
  vi.spyOn(hfEngine,'hfDetails').mockReturnValue({...clear.hf,heard:'uncertain',sound:51,margin:.01,cue:'uncertain'});
  const result=assess(word('h'));
  expect(result.status).toBe('matched');
  if(result.status==='matched'){
   expect(result.score).toBeLessThanOrEqual(59);expect(result.score).toBeGreaterThan(0);
   expect(result.hf).toMatchObject({heard:'uncertain',sound:51,cue:'uncertain'});
   expect(result.breakdown?.wordMatch).toBeGreaterThan(0);expect(result.closestWord).toBeUndefined();
  }
 });
 it('does not mistake a brief preceding carrier vowel for the stable target vowel',()=>{
  const energy=[.1,.05,.04,.04,.04,.04,.04,.08,.12,.14,.14,.13,.12,.1,.09,.06,.04,.02];
  const a:AcousticReference={energy,frames:energy.map(()=>Array(12).fill(0)),spectra:energy.map(()=>Array(32).fill(0)),
   pitch:energy.map((_,i)=>i===0||i>=8?0:null),seconds:energy.length*.01,periodic:.5};
  expect(fricativeSegment(a,false)?.to).toBeGreaterThanOrEqual(7);
 });
 it('recovers discarded strong unvoiced friction without selecting a future vowel too early',()=>{
  const friction=.4;
  const energy=[...Array(6).fill(friction),...Array(20).fill(.1)];
  const a:AcousticReference={energy,frames:energy.map(()=>Array(12).fill(0)),spectra:energy.map(()=>Array(32).fill(0)),
   pitch:energy.map((_,i)=>i>=6?0:null),seconds:.26,periodic:20/26};
  // A future vowel is not evidence that preceding high-energy F is voiced.
  expect(fricativeSegment(a,false)).toMatchObject({from:0,to:6});
 });
 it('does not locate a vowel in friction with no periodic evidence',()=>{
  const energy=Array(30).fill(.1);
  const a:AcousticReference={energy,frames:energy.map(()=>Array(12).fill(0)),spectra:energy.map(()=>Array(32).fill(0)),
   pitch:energy.map(()=>null),seconds:.3,periodic:0};
  expect(fricativeSegment(a,false)).toBeNull();
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
   expect(h.closestWord).toBe('hat');expect(f.closestWord).toBe('fat');
   expect(h.hf?.sound).toBeGreaterThan(90);expect(f.hf?.sound).toBeLessThan(20);
   expect(h.score-f.score).toBeGreaterThan(50);expect(f.hf?.cue).toBe('gentle-breath');
  }
 });
 it('keeps the closest word consistent with the consonant-focused result',()=>{
  const opposite=assess(word('f'));if(opposite.status!=='matched'||!opposite.hf)throw Error('fixture');
  vi.spyOn(hfEngine,'hfDetails').mockReturnValue(opposite.hf);
  // Even perfect vowel/whole-reference similarity must not contradict a
  // consonant-focused opposite-side result in the displayed word pair.
  const result=assess(word('h'));
  expect(result.status).toBe('matched');if(result.status==='matched')expect(result.closestWord).toBe('fat');
 });
 it('scores the selected F side and keeps Mandarin H separate',()=>{
  const f=assess(word('f'),1),x=assess(word('f'),0,'hf-zh');
  expect(f.status).toBe('matched');if(f.status==='matched')expect(f.hf?.target).toBe('f');
  if(x.status==='matched')expect(x.hf?.cue).toBe('back-friction');
 });
 it('does not award a high score to vowel-only speech, noise or silence',()=>{
  const missing=assess(word('none'));
  expect(missing.status).toBe('matched');
  if(missing.status==='matched'){
   expect(missing.score).toBeLessThanOrEqual(30);expect(missing.hf?.sound).toBe(0);
   expect(missing.hf?.cue).toBe('missing');expect(missing.closestWord).toBeUndefined();
  }
  expect(assess(new Float32Array(16000)).status).toBe('unscored');
 });
 it('does not change phoneme identity with a longer or shorter consonant',()=>{
  for(const length of [1280,4800,8000]){
   const h=assess(word('h',1,140,length)),f=assess(word('f',1,140,length));
   expect(h.status).toBe('matched');expect(f.status).toBe('matched');
   if(h.status==='matched'&&f.status==='matched'){
    expect(h.hf?.heard,`${length}: ${JSON.stringify(h.hf)}`).toBe('h');expect(f.hf?.heard).toBe('f');
    expect(h.score-f.score).toBeGreaterThan(40);
   }
  }
 });
 it('keeps identical reference voices ungraded even for H & F',()=>{
  const plan=assessmentPlan('handf','hf-en',0,0);if(plan.mode!=='contrast')throw Error('plan');
  expect(referenceScore({id:'same',plan,samples:word('h'),target:word('h'),competitor:word('h'),voice:'fixture'}).status).toBe('unscored');
 });
 it('preserves sound separation after quieter capture or changed vowel pitch',()=>{
  const h=assess(word('h',.35,180)),f=assess(word('f',.35,180));
  expect(h.status).toBe('matched');expect(f.status).toBe('matched');
  if(h.status==='matched'&&f.status==='matched')expect(h.hf!.sound-f.hf!.sound).toBeGreaterThan(25);
 });
 it.each([.04,.02])('keeps weak breath/friction before a quiet vowel at gain %s',gain=>{
  const h=assess(word('h',gain)),f=assess(word('f',gain));
  expect(h.status).toBe('matched');expect(f.status).toBe('matched');
  if(h.status==='matched'&&f.status==='matched'){
   expect(h.hf?.heard).toBe('h');expect(f.hf?.heard).toBe('f');
   expect(h.hf!.sound-f.hf!.sound).toBeGreaterThan(40);
  }
 });
 it('retains a quiet final fricative rather than trimming it to its vowel',()=>{
  // Reversing this controlled friction+vowel fixture puts the friction at the
  // end. This tests trimming, not whether the artificial word is English F/V.
  const normal=word('f').reverse(),quiet=normal.map(v=>v*.02);
  const a=acousticReference(normal)!,b=acousticReference(quiet)!;
  expect(b.frames.length).toBeGreaterThanOrEqual(a.frames.length-3);
  expect(fricativeSegment(b,true)?.duration).toBeGreaterThan(.15);
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
