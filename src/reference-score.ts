import {acousticReference,referenceDistance} from './reference-features';
import type {AssessmentPlan} from './scoring-profiles';
import type {ScoreResult} from './scoring';
import {hfDetails,hfAnalysisSamples} from './hf-score';
import {focusedPair,focusRegion} from './pair-focus';

export interface ReferenceRequest {
 id:string;plan:Extract<AssessmentPlan,{mode:'contrast'}>;samples:Float32Array;
 target:Float32Array;competitor:Float32Array;voice:string;
 wordTarget?:Float32Array;wordCompetitor?:Float32Array;
}
export function referenceScore(request:ReferenceRequest):ScoreResult {
 const {plan}=request;
 const hfTask=plan.calibrationKey.startsWith('handf/');
 const extract=(samples:Float32Array)=>acousticReference(hfTask?hfAnalysisSamples(samples):samples);
 const take=extract(request.samples),target=extract(request.target),competitor=extract(request.competitor);
 if(!take)return {status:'unscored',reason:'poor-signal'};
 if(take.periodic<.08)return {status:'unscored',reason:hfTask?'sound-unresolved':'poor-signal'};
 if(!target||!competitor)return {status:'unscored',reason:'model-unavailable'};
 const tone=plan.profile.unit==='tone',timing=plan.profile.id.startsWith('ja-mora')||plan.profile.id==='yue-vowels:v1';
 if(tone&&take.periodic<.35)return {status:'unscored',reason:'poor-signal'};
 const targetDistance=referenceDistance(take,target,tone,timing),competitorDistance=referenceDistance(take,competitor,tone,timing);
 const separation=referenceDistance(target,competitor,tone,timing);
 if(!Number.isFinite(targetDistance+competitorDistance+separation))return {status:'unscored',reason:'invalid-evidence'};
 if(Math.min(targetDistance,competitorDistance)>2.2||take.seconds>Math.max(target.seconds,competitor.seconds)*3.5)
  return {status:'unscored',reason:'unaligned'};
 const fit=Math.exp(-targetDistance/1.6);
 const sentence=plan.calibrationKey.includes('/sentence/');
 const side=plan.calibrationKey.split('/')[3]==='1'?1:0;
 // Like L & N, keep word identity separate from evidence for the difficult
 // contrast. Do not let a long shared vowel dominate an initial or final sound.
 // Tone register and mora length keep their existing separate route; a
 // spectral difference mask must not pretend to assess absolute pitch/length.
 const focus=!hfTask&&!tone&&!timing&&!sentence?
  focusedPair(take,side===0?target:competitor,side===0?competitor:target,focusRegion(plan)):null;
 // A brief aspiration difference can be diluted below the whole-word gate.
 // Resolve it only if the focused region supplies real reference separation;
 // identical readings still abstain instead of handing out an invented grade.
 if(separation<.035&&!focus&&!hfTask)return {status:'unscored',reason:'uncertain'};
 const focusedTarget=focus?(side===0?focus.targetDistance:focus.competitorDistance):targetDistance;
 const focusedCompetitor=focus?(side===0?focus.competitorDistance:focus.targetDistance):competitorDistance;
 const margin=(focusedCompetitor-focusedTarget)/Math.max(.15,focus?.separation??separation);
 const contrast=1/(1+Math.exp(-4*Math.max(-4,Math.min(4,margin))));
 // An interpretable designed index: agreement with this reference and separation
 // from its confusable partner. Constants are not claimed to be learned or
 // calibrated. Keep the raw distances and voice in history for beta diagnosis.
 const score=Math.round(100*Math.max(0,Math.min(1,focus?fit*.2+contrast*.8:fit*.45+contrast*.55)));
 const closest=margin>=.35?plan.target.text:margin<=-.35?plan.competitor.text:undefined;
 let hf:ReturnType<typeof hfDetails>=null;
 let wordOnly=false;
 if(hfTask){
  const parts=plan.calibrationKey.split('/'),lesson=parts[1],side=parts[3]==='1'?1:0;
  const wt=request.wordTarget?extract(request.wordTarget):target;
  const wc=request.wordCompetitor?extract(request.wordCompetitor):competitor;
  if(!wt||!wc)return {status:'unscored',reason:'reference-unavailable'};
  const sentence=plan.calibrationKey.includes('/sentence/');
  // In the authored Mandarin carrier the target is the final character. Keep
  // the broad last-half search window from matching a similar earlier carrier
  // syllable. Within that window both candidates remain equally eligible.
  const prompt=plan.spokenPrompt.replace(/[^\p{Letter}]/gu,''),position=prompt.indexOf(plan.target.text);
  const earliest=sentence&&lesson==='hf-zh'&&position>=0?Math.max(0,position/prompt.length-.3):0;
  hf=hfDetails(take,wt,wc,lesson,side,sentence,earliest);
  // Do not award a vowel-only take a high F/H score.
  // A measured but ambiguous H/F margin still has useful sound/word/timing
  // details. Keep its bounded practice index instead of discarding the whole
  // assessment as "uncertain". Uncertainty is not a failed recording.
  if(!hf){
   // An opposite word is useful evidence, not a capture failure. If its whole
   // reference fits clearly and there really is breath/friction at the word's
   // edge, retain a LOW word-level comparison even when a clean consonant
   // boundary is unavailable. Never turn this into a high consonant grade or
   // infer a missing H from a vowel alone. Sentence fallback is not eligible.
   const peak=Math.max(...take.energy),edge=lesson==='hf-final'
    ?take.pitch.map((p,i)=>({p,e:take.energy[i]})).slice(Math.floor(take.frames.length*.7))
    :take.pitch.map((p,i)=>({p,e:take.energy[i]})).slice(0,Math.min(15,Math.floor(take.frames.length/3)));
   const friction=edge.filter(({p,e})=>p===null&&e>Math.max(.00008,peak*.003)).length>=2;
   if(!sentence&&lesson!=='hf-final'&&separation>=.035&&Math.min(targetDistance,competitorDistance)<1.35&&friction){wordOnly=true;}
   else if(!sentence&&closest===plan.competitor.text&&competitorDistance<1.35&&friction){wordOnly=true;}
   else return {status:'unscored',reason:'unaligned'};
  }
 }
 // A word-only fallback reports contrast agreement, not vowel similarity.
 // Otherwise the shared vowel can lift an opposite H/F word above 50.
 const resolvedClosest=hf?(hf.heard==='uncertain'?undefined:hf.heard===hf.target?plan.target.text:plan.competitor.text):closest;
 const total=hf?Math.round(hf.sound*.8+hf.word*.2):wordOnly?Math.round(100*contrast):score;
 const bounded=hf?.heard==='uncertain'?Math.min(hf.cue==='missing'?30:59,total):wordOnly?Math.min(59,total):total;
 // A clear match to the OTHER displayed word is useful low-score feedback,
 // not a capture error. Shared phonemes cannot raise it into a success.
 return {status:'matched',score:resolvedClosest===plan.competitor.text?Math.min(45,bounded):bounded,contrast:plan.calibrationKey,model:focus||hfTask?'local-reference-dtw:v2':'local-reference-dtw:v1',
  unit:plan.profile.unit,targetDistance,competitorDistance,referenceVoice:request.voice,
  ...(hf?{hf}:{}),
  ...(focus?{focus:{...focus,targetDistance:focusedTarget,competitorDistance:focusedCompetitor}}:{}),
  ...(resolvedClosest?{closestWord:resolvedClosest}:{}),evidence:hf&&!wordOnly?'sound':'word',
  breakdown:{wordMatch:hf?.word??Math.round(fit*100),pairDistinction:hf?.sound??Math.round(contrast*100),speechMs:Math.round(take.seconds*1000),referenceMs:Math.round(target.seconds*1000)},
  scope:plan.calibrationKey.includes('/sentence/')?'sentence':'word'};
}
