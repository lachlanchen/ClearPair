import type { Calibration } from './scoring';
import type { ContrastLattice } from './contrast-lattice';
import type { Language } from './types';
export interface LearnedGate { intercept:number; weights:Record<string,number> }
export interface LocalTask {
  calibrationKey:string;
  /** Versioned phonetic lexicon: context identical between contrast hypotheses. */
  lattice:ContrastLattice;
  /** Learned from human-labelled content/noise controls, not a pair-only softmax. */
  gates:{coverage:LearnedGate;contentConfidence:LearnedGate;outOfDistribution:LearnedGate};
  calibration:Calibration;
}
export interface LocalModel {
  id:string;
  language:Language;
  asset:string;
  sha256:string;
  bytes:number;
  rate:16000;
  preprocessing:'mono-sinc-zscore:v1';
  input:string;
  logitsOutput:string;
  /** Optional trained acoustic heads: e.g. context-normalized vowel/tone evidence.
   * Never silently replace a required missing measurement with a constant. */
  featuresOutput?:string;
  featureNames:string[];
  vocabulary:number;
  blank:number;
  separators:number[];
  rights:{redistributionApproved:boolean;termsUrl:string};
  tasks:LocalTask[];
}
// A model must pass human, quantized-runtime and physical-device release gates
// before it enters this immutable, source-reviewed catalogue. No backend fallback.
export const localModels:readonly LocalModel[]=[];
export function validatedTask(model:LocalModel,key:string):LocalTask|undefined {
  const t=model.tasks.find(t=>t.calibrationKey===key),c=t?.calibration;
  if(!t||!c||model.id!==c.model||model.language!==c.language||
    !c.contrasts.includes(key)||!key.startsWith(`${c.app}/`)||
    !model.rights.redistributionApproved||!/^https:\/\//.test(model.rights.termsUrl)||
    !/^models\/[a-zA-Z0-9_-]+\.onnx$/.test(model.asset)||!/^[a-f0-9]{64}$/.test(model.sha256)||
    !Number.isSafeInteger(model.bytes)||model.bytes<1||model.bytes>512*1024*1024||
    model.rate!==16000||model.preprocessing!=='mono-sinc-zscore:v1'||
    !Number.isInteger(model.vocabulary)||model.vocabulary<3||model.vocabulary>512||
    !Number.isInteger(model.blank)||model.blank<0||model.blank>=model.vocabulary||
    new Set(model.separators).size!==model.separators.length||
    model.separators.some(id=>!Number.isInteger(id)||id<0||id>=model.vocabulary||id===model.blank)||
    new Set(model.featureNames).size!==model.featureNames.length||
    model.featureNames.some(name=>!/^[a-zA-Z][a-zA-Z0-9-]{0,63}$/.test(name))||
    !c.validation.approved||!/^[a-f0-9]{64}$/.test(c.validation.reportSha256)||
    ![c.validation.heldOutSpeakers,c.validation.correctExamples,c.validation.confusedExamples].every(Number.isSafeInteger)||
    c.validation.heldOutSpeakers<30||c.validation.correctExamples<100||c.validation.confusedExamples<100)
    return undefined;
  const gates=Object.values(t.gates);
  if(gates.length!==3||gates.some(g=>!Number.isFinite(g.intercept)||
    !Object.keys(g.weights).length||!Object.values(g.weights).every(Number.isFinite)||
    !Object.values(g.weights).some(v=>v!==0)))return undefined;
  return t;
}
