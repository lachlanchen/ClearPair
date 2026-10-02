import {describe,it,expect} from 'vitest';
import {focusedPair,focusRegion} from './pair-focus';
import {assessmentPlan} from './scoring-profiles';
import {referenceDistance,type AcousticReference} from './reference-features';

// Controlled cepstral sequences exercise the algorithm, not human accuracy.
function sequence(onset:number,coda=0,body=0,n=100):AcousticReference {
  const frames=Array.from({length:n},(_,i)=>Array.from({length:12},(_,c)=>
    c===0?(i<15?onset:i>=n-15?coda:body):c===1?.25:0));
  return {frames,spectra:frames.map(()=>Array(32).fill(0)),energy:frames.map(()=>.1),
    pitch:frames.map(()=>0),seconds:n*.01,periodic:1};
}
describe('minimal-pair local contrast focus',()=>{
  it('uses the differing initial rather than a long shared vowel',()=>{
    const a=sequence(2),b=sequence(-2);
    const good=focusedPair(a,a,b,'initial')!,wrong=focusedPair(b,a,b,'initial')!;
    expect(good.targetDistance).toBe(0);expect(wrong.competitorDistance).toBe(0);
    expect(good.competitorDistance).toBeGreaterThan(.5);
    expect(wrong.targetDistance).toBeGreaterThan(.5);expect(good.frames).toBeLessThan(50);
  });
  it('ignores nuisance changes outside the contrast region',()=>{
    const a=sequence(2),b=sequence(-2),take=sequence(2,0,3);
    const result=focusedPair(take,a,b,'initial')!;
    expect(result.targetDistance).toBeLessThan(result.competitorDistance);
  });
  it('uses a final-sound prior for an ending, not an incidental initial difference',()=>{
    const a=sequence(2,1),b=sequence(-2,-1),take=sequence(-2,1);
    const ending=focusedPair(take,a,b,'final')!,initial=focusedPair(take,a,b,'initial')!;
    expect(ending.targetDistance).toBeLessThan(ending.competitorDistance);
    expect(initial.competitorDistance).toBeLessThan(initial.targetDistance);
  });
  it('cannot resolve identical references or one isolated reference artifact',()=>{
    const a=sequence(0),b=sequence(0);b.frames[10][0]=3;
    expect(focusedPair(a,a,a,'whole')).toBeNull();
    expect(focusedPair(a,a,b,'whole')).toBeNull();
  });
  it('retains a short real contrast that is diluted by whole-word averaging',()=>{
    const a=sequence(.25,0,0,600),b=sequence(-.25,0,0,600);
    expect(referenceDistance(a,b)).toBeLessThan(.035);
    const result=focusedPair(a,a,b,'initial')!;
    expect(result.separation).toBeGreaterThan(.08);
    expect(result.targetDistance).toBeLessThan(result.competitorDistance);
  });
  it('retains pair evidence at a different speaking speed',()=>{
    const a=sequence(2),b=sequence(-2);
    const take={...a,frames:a.frames.flatMap(f=>[f,f]),seconds:a.seconds*2};
    const result=focusedPair(take,a,b,'initial')!;
    expect(result.targetDistance).toBeLessThan(.1);expect(result.competitorDistance).toBeGreaterThan(.5);
  });
  it.each([
    ['landr','lr-start','initial'],['landr','lr-end','final'],['english','v-i','vowel'],
    ['english','n-ng','final'],['chinese','b-p','initial'],['chinese','an-ang','final'],
    ['korean','ko-g-k','initial'],['korean','ko-batchim','final'],
    ['arabic','ar-vowels','vowel'],['cantonese','yue-p-t','final'],['cantonese','yue-n-ng','final'],
    ['japanese','ja-dakuten','initial'],['japanese','ja-hira-loops','whole'],
  ] as const)('routes %s/%s to %s', (app,lesson,region)=>{
    const plan=assessmentPlan(app,lesson,0,0);if(plan.mode!=='contrast')throw Error('plan');
    expect(focusRegion(plan)).toBe(region);
  });
  it('positions TH exercises by the displayed pronunciation, not just consonant group',()=>{
    for(const [lesson,pair,region] of [['th-voice',0,'final'],['th-voice',1,'final'],
      ['th-s',0,'initial'],['th-s',4,'final'],['th-z',1,'final'],['th-z',2,'whole']] as const){
      const plan=assessmentPlan('english',lesson,pair,0);
      if(plan.mode!=='contrast')throw Error('plan');
      expect(focusRegion(plan)).toBe(region);
    }
  });
});
