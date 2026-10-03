import type {AssessmentPlan} from './scoring-profiles';
import type {Analysis} from './types';
import type {ScoreResult} from './scoring';
type Plan=Extract<AssessmentPlan,{mode:'contrast'}>;
export interface HfWordEvidence {
 engine:string;text:string;words:{word:string;conf:number;start:number;end:number}[];
 /** Only the native bridge produces final saved-PCM Apple/native Vosk results. */
 final?:boolean;
 /** A native request has closed with a usable partial result; not an ASR final. */
 completed?:boolean;
}
export function nativeHfWordEvidence(plan:Plan,e:HfWordEvidence):boolean{
 return e.final===true&&e.engine===`apple-on-device-words:v1/${plan.profile.language}`;
}
export function provisionalNativeHfWords(plan:Plan,e:HfWordEvidence):boolean{
 return e.completed===true&&e.final===false&&e.engine===`apple-on-device-words:v1/${plan.profile.language}`;
}
function finalNativeWords(plan:Plan,e:HfWordEvidence):boolean{
 return e.final===true&&[`apple-on-device-words:v1/${plan.profile.language}`,`hf-vosk-native:v1/${plan.profile.language}`].includes(e.engine);
}
type Decision=NonNullable<Extract<ScoreResult,{status:'matched'}>['recognition']>['decision'];
export function needsHfWordEvidence(plan:Plan,result:ScoreResult):boolean{
 return plan.calibrationKey.startsWith('handf/')&&!plan.calibrationKey.includes('/hf-final/')&&
  (plan.calibrationKey.includes('/sentence/')||result.status==='unscored'&&['uncertain','unaligned','model-unavailable','reference-unavailable','poor-signal','sound-unresolved'].includes(result.reason)||result.status==='matched'&&(result.score<65||result.hf?.heard==='uncertain'));
}
// Exact authored homophones only; no fuzzy edit distance or target prompting.
// This course assesses H/F, not lexical tone accuracy. Never generalize this
// dictionary to other Mandarin courses or accept a changed vowel as "close".
const aliases:Record<string,string[]>={
 '哈':['哈'],'发':['发','發'],'呼':['呼','乎'],'夫':['夫','肤','敷'],'黑':['黑','嘿'],
 '飞':['飞','非','飛'],'汉':['汉','漢','汗'],'饭':['饭','飯','范','泛','犯'],
 '虎':['虎','唬'],'斧':['斧','府','腐'],'很':['很','狠'],'粉':['粉'],
};
const omissions:Record<string,string[]>={hat:['at'],fat:['at'],hill:['ill'],fill:['ill'],heat:['eat'],feet:['eat'],
 hair:['air'],fair:['air'],harm:['arm'],farm:['arm'],hit:['it'],fit:['it'],leaf:['lee','lea'],leave:['lee','lea'],safe:['say'],save:['say']};
const norm=(s:string)=>s.normalize('NFKC').toLowerCase().replace(/[’']/g,'').replace(/[^\p{Letter}\p{Number}]+/gu,' ').trim();
const englishForms:Record<string,string[]>={fill:['fill','phil'],feet:['feet','feat'],hair:['hair','hare'],fair:['fair','fare']};
// Common recognizer coda confusions preserve the H/F onset and vowel, but NOT
// the entire word. They contribute partial content evidence, never a full match.
const partialForms:Record<string,string[]>={hat:['had'],fat:['fad'],heat:['hed'],feet:['feed'],hit:['hid']};
function nearbyVowelWord(expected:string,heard:string):boolean{
 // Onset-preserving, one-vowel spelling substitution gives PARTIAL content
 // evidence (hat/hot, fat/fit), never a correct whole-word or phoneme claim.
 // No edit-distance rescue for inserted consonants, TH, plurals or sentences.
 if(!/^[hf]/.test(expected)||heard[0]!==expected[0]||heard.length!==expected.length)return false;
 const differences=[...expected].flatMap((c,i)=>c===heard[i]?[]:[i]);
 return differences.length===1&&/[aeiou]/.test(expected[differences[0]])&&/[aeiou]/.test(heard[differences[0]]);
}
export function hfWordDecision(plan:Plan,e:HfWordEvidence):{decision:Decision;confidence:number;wordMatch?:number}{
 if(!plan.calibrationKey.startsWith('handf/')||!['en-US','zh-CN'].includes(plan.profile.language))
  return {decision:'unknown',confidence:0};
 if(e.text.length>500||e.words.length>150||e.words.some(w=>![w.conf,w.start,w.end].every(Number.isFinite)||w.conf<0||w.conf>1||w.start<0||w.end<w.start))
  return {decision:'unknown',confidence:0};
 const chinese=plan.profile.language==='zh-CN';
 const units=e.words.flatMap(w=>chinese?Array.from(norm(w.word).replace(/ /g,'')).map(word=>({...w,word})):[{...w,word:norm(w.word)}]);
 // Tokens and text must agree: a partial/stale recognizer message is not evidence.
 const text=norm(e.text).replace(chinese?/ /g:/$^/g,'');
 if(!text||text!==(chinese?units.map(w=>w.word).join(''):units.map(w=>w.word).join(' ')))return {decision:'unknown',confidence:0};
 const sentence=plan.calibrationKey.includes('/sentence/');
 const forms=(word:string)=>chinese?(aliases[word]??[word]):[...(englishForms[word]??[norm(word)]),...(partialForms[word]??[])];
 const target=units.filter(w=>forms(plan.target.text).includes(w.word)),opposite=units.filter(w=>forms(plan.competitor.text).includes(w.word));
 if(target.length&&opposite.length)return {decision:'both',confidence:Math.min(...[...target,...opposite].map(w=>w.conf))};
 const hits=target.length?target:opposite;
 // Do not reward an isolated correct word hidden among unrelated speech.
 if(hits.length&&(!sentence&&units.length!==1||hits.length!==1))return {decision:'other',confidence:0};
 if(hits.length){
  const confidence=hits[0].conf;
  const selected=target.length?plan.target.text:plan.competitor.text;
  // Apple final word identity follows L & N's lexical route. Keep its actual
  // confidence (including zero), never substitute a fabricated probability.
  // This establishes spelling/word identity, NOT a measured consonant grade.
  return {decision:confidence>=.65||nativeHfWordEvidence(plan,e)||provisionalNativeHfWords(plan,e)?(target.length?'target':'opposite'):'unknown',confidence,
   wordMatch:!chinese&&partialForms[selected]?.includes(hits[0].word)?75:100};
 }
 if(!chinese&&units.length===1){
  const hit=units[0],targetNear=nearbyVowelWord(norm(plan.target.text),hit.word),oppositeNear=nearbyVowelWord(norm(plan.competitor.text),hit.word);
  if(targetNear!==oppositeNear&&(hit.conf>=.65||nativeHfWordEvidence(plan,e)||provisionalNativeHfWords(plan,e)))
   return {decision:targetNear?'target':'opposite',confidence:hit.conf,wordMatch:55};
 }
 const omitted=units.filter(w=>(omissions[norm(plan.target.text)]??[]).includes(w.word));
 if(!sentence&&units.length===1&&omitted[0]?.conf>=.65)return {decision:'omitted',confidence:omitted[0].conf};
 const confidence=units.length?Math.min(...units.map(w=>w.conf)):0;
 return {decision:confidence>=.65?'other':'unknown',confidence};
}
/** L & N's architecture, not its nasal classifier: word identity dominates
 * content decisions, acoustics explain the difficult sound. The indices are
 * deliberately not a calibrated correctness percentage. */
export function hfHybridScore(plan:Plan,e:HfWordEvidence|undefined,acoustic:ScoreResult,quality:Analysis):ScoreResult{
 if(!e||(!needsHfWordEvidence(plan,acoustic)&&!finalNativeWords(plan,e)&&!provisionalNativeHfWords(plan,e)))return acoustic;
 if(!plan.calibrationKey.startsWith('handf/'))return acoustic;
 const provisional=provisionalNativeHfWords(plan,e);
 const native=nativeHfWordEvidence(plan,e)||provisional;
 let {decision,confidence,wordMatch}=hfWordDecision(plan,e);
 if(acoustic.status==='unscored'&&(['cancelled','invalid-evidence'].includes(acoustic.reason)||acoustic.reason==='poor-signal'&&!['clear','quiet'].includes(quality.status)))return acoustic;
 const base=acoustic.status==='matched'?acoustic:undefined;
 // Word recognizers systematically confuse final F/V (e.g. leaf/leave). Do
 // not apply initial H/F lexical evidence to the separate final-voicing task.
 if(plan.calibrationKey.includes('/hf-final/'))return acoustic;
 // Strongly conflicting independent observations mean uncertainty, not an
 // authoritative claim that the user said the other sound.
 const conflict=!native&&!!base?.hf&&decision==='opposite'&&base.hf.heard===base.hf.target&&base.hf.sound>=80&&base.hf.word>=75;
 if(conflict)decision='unknown';
 // Never turn an extremely close acoustic word match into "wrong word" solely
 // because a language model substituted a common spelling. Its transcript is
 // retained as uncertain evidence; it is not a pronunciation ground truth.
 // Unrestricted ASR also substitutes unrelated words for short correct crops.
 // Confidence alone is not proof of a pronunciation error. Penalize OTHER only
 // when independently measured acoustics reject BOTH displayed whole words.
 if(decision==='other'&&(!base||confidence<.85||Math.min(base.targetDistance,base.competitorDistance)<1.35||
   (base.hf?.word??base.breakdown?.wordMatch??100)>50))decision='unknown';
 if(decision==='unknown'&&!base)return {status:'unscored',reason:'uncertain'};
 const labels=plan.calibrationKey.includes('/hf-final/')?['f','v'] as const:['h','f'] as const;
 const side=plan.calibrationKey.split('/')[3]==='1'?1:0;
 const lexicalSide=decision==='target'?side:decision==='opposite'?1-side:undefined;
 // This phoneme is supported by WORD identity, not independently measured
 // acoustics. Keep that provenance explicit for live results and History.
 const recognition={engine:e.engine,text:e.text.slice(0,500),decision,confidence,
  ...(lexicalSide!==undefined?{wordSound:lexicalSide===0?'h' as const:'f' as const}:{}),
  ...(wordMatch!==undefined&&wordMatch<100?{partialWord:true}:{}),...(provisional?{provisional:true}:{})};
 const inconsistentSound=lexicalSide!==undefined&&!!base?.hf&&
  (native&&base.hf.heard!==labels[lexicalSide]||finalNativeWords(plan,e)&&base.hf.heard==='uncertain');
 // L & N lets final word identity lead. A disagreeing synthetic boundary is
 // explicitly unmeasured, not coaching that the learner made the wrong sound.
 // A whole-word fallback's contrast ratio is not a measured consonant. Never
 // count the same word evidence twice or let it bypass the word-only cap.
 const sound=inconsistentSound||base?.evidence==='word'&&!base.hf?undefined:base?.hf?.sound??base?.breakdown?.pairDistinction;
 const word=decision==='target'?wordMatch??100:decision==='opposite'?0:decision==='omitted'?20:decision==='other'?0:base?.hf?.word??base?.breakdown?.wordMatch??0;
 // A confident opposite/missing/unrelated word receives useful low-score
 // feedback. The selected target never biases decoding into these two words.
 const cap=decision==='opposite'?45:decision==='omitted'?30:decision==='other'?25:decision==='both'?40:conflict?59:decision==='unknown'?base!.score:
  wordMatch!==undefined&&wordMatch<=55?69:provisional||wordMatch!==undefined&&wordMatch<100?79:sound===undefined?85:100;
 const identity=decision==='target'?100:decision==='opposite'?0:decision==='omitted'?0:decision==='other'?0:50;
 const measured=sound??identity;
 const score=Math.min(cap,Math.round(decision==='target'?(native ? .65*word+.20*identity+.15*measured : .55*word+.35*measured+.10*confidence*100):
  decision==='unknown'?base!.score:decision==='both'?Math.min(40,.25*measured):.25*word+.35*measured+.10*confidence*100));
 const hf=base?.hf&&!inconsistentSound?{...base.hf,word,
  ...(decision==='opposite'?{heard:labels[1-side],cue:plan.calibrationKey.includes('/hf-final/')?(side===0?'keep-ending':'add-voice'):side===1?'lip-friction':plan.profile.language==='zh-CN'?'back-friction':'gentle-breath'} as const:{}),
  ...(decision==='omitted'?{heard:'uncertain',sound:0,cue:'missing'} as const:{}),
  ...(decision==='other'?{heard:'uncertain',cue:'different-word'} as const:{}),
  ...(conflict||decision==='both'?{heard:'uncertain',cue:'uncertain'} as const:{})}:undefined;
 return {status:'matched',score,contrast:plan.calibrationKey,model:native?'local-hf-native:v1':'local-hf-hybrid:v1',unit:plan.profile.unit,
  targetDistance:base?.targetDistance??0,competitorDistance:base?.competitorDistance??0,
  referenceVoice:base?.referenceVoice??'none:word-identification-only',scope:plan.calibrationKey.includes('/sentence/')?'sentence':'word',
  recognition,...(hf?{hf}:{}),evidence:hf?'sound':'word',
  ...(decision==='target'?{closestWord:plan.target.text}:decision==='opposite'?{closestWord:plan.competitor.text}:{}),
  // Word identity is not a measured consonant score. The UI marks this item
  // unavailable for word-only results rather than displaying a fabricated 100.
  breakdown:{wordMatch:word,pairDistinction:sound===undefined||decision==='omitted'?0:sound,speechMs:Math.round(quality.voicedSeconds*1000),referenceMs:base?.breakdown?.referenceMs??0}};
}
