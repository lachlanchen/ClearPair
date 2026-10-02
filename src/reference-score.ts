import {acousticReference,referenceDistance} from './reference-features';
import type {AssessmentPlan} from './scoring-profiles';
import type {ScoreResult} from './scoring';
import {hfDetails} from './hf-score';

export interface ReferenceRequest {
 id:string;plan:Extract<AssessmentPlan,{mode:'contrast'}>;samples:Float32Array;
 target:Float32Array;competitor:Float32Array;voice:string;
 wordTarget?:Float32Array;wordCompetitor?:Float32Array;
}
export function referenceScore(request:ReferenceRequest):ScoreResult {
 const {plan}=request;
 const take=acousticReference(request.samples),target=acousticReference(request.target),competitor=acousticReference(request.competitor);
 if(!take||take.periodic<.08)return {status:'unscored',reason:'poor-signal'};
 if(!target||!competitor)return {status:'unscored',reason:'model-unavailable'};
 const tone=plan.profile.unit==='tone',timing=plan.profile.id.startsWith('ja-mora')||plan.profile.id==='yue-vowels:v1';
 if(tone&&take.periodic<.35)return {status:'unscored',reason:'poor-signal'};
 const targetDistance=referenceDistance(take,target,tone,timing),competitorDistance=referenceDistance(take,competitor,tone,timing);
 const separation=referenceDistance(target,competitor,tone,timing);
 if(!Number.isFinite(targetDistance+competitorDistance+separation))return {status:'unscored',reason:'invalid-evidence'};
 // Almost identical references cannot resolve a pair. This also prevents an
 // engine reading both spellings identically from handing out bogus grades.
 if(separation<.035)return {status:'unscored',reason:'uncertain'};
 if(Math.min(targetDistance,competitorDistance)>2.2||take.seconds>Math.max(target.seconds,competitor.seconds)*3.5)
  return {status:'unscored',reason:'unaligned'};
 const fit=Math.exp(-targetDistance/1.6);
 const margin=(competitorDistance-targetDistance)/Math.max(.15,separation);
 const contrast=1/(1+Math.exp(-4*Math.max(-4,Math.min(4,margin))));
 // An interpretable designed index: agreement with this reference and separation
 // from its confusable partner. Constants are not claimed to be learned or
 // calibrated. Keep the raw distances and voice in history for beta diagnosis.
 const score=Math.round(100*Math.max(0,Math.min(1,fit*.45+contrast*.55)));
 const closest=margin>=.35?plan.target.text:margin<=-.35?plan.competitor.text:undefined;
 const hfTask=plan.calibrationKey.startsWith('handf/');
 let hf:ReturnType<typeof hfDetails>=null;
 let wordOnly=false;
 if(hfTask){
  const parts=plan.calibrationKey.split('/'),lesson=parts[1],side=parts[3]==='1'?1:0;
  const wt=request.wordTarget?acousticReference(request.wordTarget):target;
  const wc=request.wordCompetitor?acousticReference(request.wordCompetitor):competitor;
  if(!wt||!wc)return {status:'unscored',reason:'reference-unavailable'};
  const sentence=plan.calibrationKey.includes('/sentence/');
  // In the authored Mandarin carrier the target is the final character. Keep
  // the broad last-half search window from matching a similar earlier carrier
  // syllable. Within that window both candidates remain equally eligible.
  const prompt=plan.spokenPrompt.replace(/[^\p{Letter}]/gu,''),position=prompt.indexOf(plan.target.text);
  const earliest=sentence&&lesson==='hf-zh'&&position>=0?Math.max(0,position/prompt.length-.3):0;
  hf=hfDetails(take,wt,wc,lesson,side,sentence,earliest);
  // Do not award a vowel-only take a high F/H score.
  if(!hf||hf.heard==='uncertain'){
   // An opposite word is useful evidence, not a capture failure. If its whole
   // reference fits clearly and there really is breath/friction at the word's
   // edge, retain a LOW word-level comparison even when a clean consonant
   // boundary is unavailable. Never turn this into a high consonant grade or
   // infer a missing H from a vowel alone. Sentence fallback is not eligible.
   const peak=Math.max(...take.energy),edge=lesson==='hf-final'
    ?take.pitch.map((p,i)=>({p,e:take.energy[i]})).slice(Math.floor(take.frames.length*.7))
    :take.pitch.map((p,i)=>({p,e:take.energy[i]})).slice(0,Math.min(15,Math.floor(take.frames.length/3)));
   const friction=edge.filter(({p,e})=>p===null&&e>Math.max(.0005,peak*.003)).length>=2;
   if(!sentence&&closest===plan.competitor.text&&competitorDistance<1.35&&friction){wordOnly=true;hf=null;}
   else return {status:'unscored',reason:hf?'uncertain':'unaligned'};
  }
 }
 // A word-only fallback reports contrast agreement, not vowel similarity.
 // Otherwise the shared vowel can lift an opposite H/F word above 50.
 const resolvedClosest=hf?(hf.heard===hf.target?plan.target.text:plan.competitor.text):closest;
 return {status:'matched',score:hf?Math.round(hf.sound*.8+hf.word*.2):wordOnly?Math.round(100*contrast):score,contrast:plan.calibrationKey,model:'local-reference-dtw:v1',
  unit:plan.profile.unit,targetDistance,competitorDistance,referenceVoice:request.voice,
  ...(hf?{hf}:{}),
  ...(resolvedClosest?{closestWord:resolvedClosest}:{}),evidence:hf&&!wordOnly?'sound':'word',
  scope:plan.calibrationKey.includes('/sentence/')?'sentence':'word'};
}
