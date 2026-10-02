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
 const hfTask=plan.calibrationKey.startsWith('handf/');
 let hf:ReturnType<typeof hfDetails>=null;
 if(hfTask){
  const parts=plan.calibrationKey.split('/'),lesson=parts[1],side=parts[3]==='1'?1:0;
  const wt=request.wordTarget?acousticReference(request.wordTarget):target;
  const wc=request.wordCompetitor?acousticReference(request.wordCompetitor):competitor;
  if(!wt||!wc)return {status:'unscored',reason:'reference-unavailable'};
  hf=hfDetails(take,wt,wc,lesson,side,plan.calibrationKey.includes('/sentence/'));
  // Do not award a vowel-only take a high F/H score.
  if(!hf)return {status:'unscored',reason:'unaligned'};
  if(hf.heard==='uncertain')return {status:'unscored',reason:'uncertain'};
 }
 return {status:'matched',score:hf?Math.round(hf.sound*.8+hf.word*.2):score,contrast:plan.calibrationKey,model:'local-reference-dtw:v1',
  unit:plan.profile.unit,targetDistance,competitorDistance,referenceVoice:request.voice,
  ...(hf?{hf}:{}),
  scope:plan.calibrationKey.includes('/sentence/')?'sentence':'word'};
}
