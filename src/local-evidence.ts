import { alignCtc, targetAnchor } from './alignment';
import { mergeCtcSeparators } from './ctc';
import { contrastLatticeEvidence, type ContrastLattice } from './contrast-lattice';
import { logSumExp, type ScoreEvidence } from './scoring';
import type { Analysis } from './types';
import type { LearnedGate, LocalModel, LocalTask } from './local-models';
import { phoneEditFeatures } from './phone-edit-evidence';
function learnedProbability(gate:LearnedGate,features:Record<string,number>):number {
  let linear=gate.intercept;
  for(const [key,weight] of Object.entries(gate.weights)){
    if(!Number.isFinite(features[key]))throw Error('A required content/acoustic feature is unavailable');
    linear+=features[key]*weight;
  }
  if(!Number.isFinite(linear))throw Error('Invalid learned gate');
  return linear>=0?1/(1+Math.exp(-linear)):Math.exp(linear)/(1+Math.exp(linear));
}
function acceptedTargetAnchor(frames:readonly (readonly number[])[],spec:ContrastLattice){
  // The target is a union of accepted CTC sequences. Condition on that same
  // union when measuring acoustics, rather than silently choosing variant 0.
  // Deduplicate just as the lattice does; repeated lexicon entries add no mass.
  const variants=[...new Map(spec.target.map(phones=>[phones.join(','),phones])).entries()]
    .sort(([a],[b])=>a.localeCompare(b));
  const anchors: {logLikelihood:number;occupancy:number[]}[]=[];
  for(const [,phones] of variants){
    const alignment=alignCtc(frames,[...spec.prefix,...phones,...spec.suffix],spec.blank);
    if(!alignment)continue;
    const anchor=targetAnchor(alignment,spec.prefix.length,spec.prefix.length+phones.length);
    anchors.push({logLikelihood:alignment.logLikelihood,occupancy:anchor.occupancy});
  }
  if(!anchors.length)throw Error('Unable to align the spoken target');
  const mass=logSumExp(anchors.map(anchor=>anchor.logLikelihood));
  const occupancy=Array<number>(frames.length).fill(0);
  for(const anchor of anchors){
    const probability=Math.exp(anchor.logLikelihood-mass);
    for(let t=0;t<frames.length;t++)occupancy[t]+=probability*anchor.occupancy[t];
  }
  const quantile=(fraction:number)=>{
    let sum=0;
    for(let t=0;t<occupancy.length;t++){
      sum+=occupancy[t];if(sum>=fraction)return t;
    }
    return occupancy.length-1;
  };
  return {occupancy,startFrame:quantile(.05),endFrameExclusive:quantile(.95)+1};
}
/** Exact on-device candidate algorithm. Raw CTC evidence is never directly a
 * pronunciation grade. The same head/gates must be evaluated end-to-end on humans. */
export function localEvidence(model:LocalModel,task:LocalTask,raw:readonly (readonly number[])[],
  quality:Analysis,acoustic:Record<string,readonly number[]>={}):ScoreEvidence {
  if(raw.length>1000||!raw.length||raw.some(row=>row.length!==model.vocabulary))throw Error('Invalid encoder shape');
  const frames=mergeCtcSeparators(raw,model.blank,model.separators);
  const spec=task.lattice;
  if(spec.blank!==model.blank)throw Error('Wrong vocabulary adapter');
  const lattice=contrastLatticeEvidence(frames,spec);
  const anchor=acceptedTargetAnchor(frames,spec);
  const alignedFrames=anchor.endFrameExclusive-anchor.startFrame;
  if(alignedFrames<1||lattice.targetLogRatio===null)throw Error('Target has no usable acoustic evidence');
  const entropy=-anchor.occupancy.reduce((s,p)=>s+(p>0?p*Math.log(p):0),0)/Math.log(Math.max(2,frames.length));
  const measurements:Record<string,number>={};
  for(const [key,values] of Object.entries(acoustic)){
    if(values.length!==frames.length||values.some(v=>!Number.isFinite(v)))throw Error('Invalid aligned acoustic head');
    measurements[key]=values.reduce((sum,value,t)=>sum+value*anchor.occupancy[t],0);
  }
  let phoneFeatures:Record<string,number>={};
  if(task.phoneEditHead!==undefined){
    if(task.phoneEditHead!=='ctc-context-phone:v1'||spec.target.length!==1||spec.target[0].length!==1)
      throw Error('Phone edit head requires one unambiguous single-phone target');
    phoneFeatures=phoneEditFeatures(frames,[...spec.prefix,...spec.target[0],...spec.suffix],
      spec.prefix.length,spec.inventory,spec.blank);
  }
  const features={...measurements,...phoneFeatures,
    listedPerFrame:lattice.listedLogLikelihood/frames.length,
    targetLogRatio:lattice.targetLogRatio,
    unlistedPerFrame:lattice.unlistedLogLikelihood/frames.length,
    alignedFraction:alignedFrames/frames.length,
    alignmentConcentration:1-entropy,
    blankFraction:frames.reduce((sum,row)=>sum+Math.exp(row[model.blank]),0)/frames.length,
  };
  const other=logSumExp([lattice.unlistedLogLikelihood,...lattice.classes
    .filter(c=>c.kind!=='target'&&c.kind!=='confusion').map(c=>c.logLikelihood)]);
  return {model:model.id,profile:task.calibration.profile,language:model.language,
    contrast:task.calibrationKey,unit:task.calibration.unit,alignedFrames,
    coverage:learnedProbability(task.gates.coverage,features),
    contentConfidence:learnedProbability(task.gates.contentConfidence,features),
    outOfDistribution:learnedProbability(task.gates.outOfDistribution,features),
    targetLogLikelihood:lattice.targetLogLikelihood,
    competitorLogLikelihoods:lattice.classes.filter(c=>c.kind==='confusion').map(c=>c.logLikelihood),
    otherLogLikelihood:other,features,quality};
}
