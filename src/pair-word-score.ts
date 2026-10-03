import {lessonById} from './curriculum';
import {pronunciationText} from './pronunciation-text';
import {focusRegion} from './pair-focus';
import type {AssessmentPlan} from './scoring-profiles';
import type {ScoreResult} from './scoring';
import type {Analysis,Word,Text} from './types';
import type {HfWordEvidence} from './hf-word-score';
import {japanesePairGuidance} from './japanese-curriculum';
import {carrierContext} from './carrier-context';
type Plan=Extract<AssessmentPlan,{mode:'contrast'}>;
type Match=Extract<ScoreResult,{status:'matched'}>;
type Decision=NonNullable<Match['recognition']>['decision'];
export interface PairFeedback {
 version:'pair-feedback:v1';expected:string;heard:string;
 kind:'target'|'opposite'|'different'|'mixed'|'unconfirmed';
 region:ReturnType<typeof focusRegion>|'tone'|'timing'|'letter-name';
 targetSound:string;partnerSound:string;heardSound?:string;cue:Text;
 /** Reference comparison and lexical evidence are independent observations. */
 soundMeasured:boolean;conflict:boolean;
}
const homophones:Record<string,string[]>={
 right:['write','rite'],row:['roe'],road:['rode'],led:['lead'],rice:['ryce'],
 pray:['prey'],blew:['blue'],poor:['pour','pore'],fear:['feer'],
 sheep:['sheep'],ship:['ship'],leave:['leave'],live:['live'],
 feet:['feat'],hair:['hare'],fair:['fare'],four:['for','fore'],
 see:['sea'],sew:['so'],son:['sun'],two:['too','to'],
 knight:['night'],night:['knight'],no:['know'],buy:['by','bye'],
 eye:['i'],ate:['eight'],pair:['pear','pare'],sole:['soul'],
};
const chineseScript:Record<string,string>={'標':'标','飄':'飘','個':'个','係':'系','詩':'诗','試':'试','婦':'妇','時':'时','實':'实','濕':'湿','雞':'鸡','藍':'蓝','連':'连','這':'这','說':'说','發':'发','綠':'绿','來':'来','聲':'声','詞':'词'};
export function normalizeWords(text:string,language:string,keepMarks=false):string {
 let value=text.normalize('NFKC').toLowerCase().replace(/[’']/g,'');
 // Script variants in the authored Chinese courses are spelling equivalents,
 // not extra accepted pronunciations. Retain the original decoder text in UI
 // and never use this conversion as evidence for a tone or sound measurement.
 if(['zh-CN','zh-HK'].includes(language)){
  value=Array.from(value,c=>chineseScript[c]??c).join('');
 }
 if(language==='ja-JP')value=value.replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-0x60));
 if(language==='ar-SA')value=value.replace(keepMarks?/\u0640/g:/[\u064B-\u065F\u0670\u0640]/g,'');
 value=value.replace(keepMarks?/[^\p{Letter}\p{Number}\p{Mark}]+/gu:/[^\p{Letter}\p{Number}]+/gu,' ').trim();
 return ['zh-CN','zh-HK','ja-JP'].includes(language)?value.replace(/ /g,''):value.replace(/ +/g,' ');
}
function forms(word:Word,language:string,keepMarks=false):string[]{
 // Authored readings only. A recognizer spelling is not a new accepted sound.
 const spoken=pronunciationText(word,language as Plan['profile']['language'],false);
 return [...new Set([word.text,spoken,...(language==='ja-JP'&&word.reading?[word.reading]:[]),
  ...(language==='en-US'?homophones[word.text.toLowerCase()]??[]:[])].map(v=>normalizeWords(v,language,keepMarks)))].filter(Boolean);
}
export function pairWordDecision(plan:Plan,e:HfWordEvidence):{decision:Decision;confidence:number;valid:boolean}{
 const unknown={decision:'unknown' as const,confidence:0,valid:false};
 const lang=plan.profile.language;
 const keepMarks=plan.profile.id==='ar-syllable-vowel:v1';
 const normalize=(v:string)=>normalizeWords(v,lang,keepMarks);
 const untimed=lang==='zh-HK'&&e.engine==='pair-sensevoice-native:v1/zh-HK'&&e.final===true&&e.untimed===true&&e.words.length===0;
 const provenance=[`apple-on-device-words:v1/${lang}`,`pair-offline-words:v1/${lang}`,`pair-vosk-native:v1/${lang}`,`hf-vosk-native:v1/${lang}`,...(untimed?['pair-sensevoice-native:v1/zh-HK']:[])];
 if(!provenance.includes(e.engine)||e.text.length>500||e.words.length>150||
   e.words.some(w=>!w.word||![w.conf,w.start,w.end].every(Number.isFinite)||w.conf<0||w.conf>1||w.start<0||w.end<w.start||w.end>15))return unknown;
 const text=normalize(e.text),tokens=e.words.map(w=>normalize(w.word));
 if(!text||!untimed&&text!==normalize(tokens.join(' ')))return unknown;
 let confidence=e.words.length?Math.min(...e.words.map(w=>w.conf)):0;
 const apple=e.engine===`apple-on-device-words:v1/${lang}`&&(e.final===true||e.completed===true&&e.final===false);
 if(e.engine===`apple-on-device-words:v1/${lang}`&&!apple)return unknown;
 const sentence=plan.calibrationKey.includes('/sentence/');
 const candidates=(word:Word)=>forms(word,lang,keepMarks);
 const compact=['zh-CN','zh-HK','ja-JP'].includes(lang);
 const contexts=sentence?[plan.target,plan.competitor].flatMap(word=>{
  const c=carrierContext(word,lang),result=c?[{prefix:normalize(c.prefix),suffix:normalize(c.suffix)}]:[];
  // Japanese's displayed 一度 and spoken いちど are explicitly authored
  // spellings of the same carrier. Accept either without guessing new kanji
  // readings or replacing the decoder's original text.
  if(word.sentenceReading){
   const display=normalize(word.sentence),form=normalize(word.text),at=display.lastIndexOf(form);
   if(at>=0)result.push({prefix:display.slice(0,at).trim(),suffix:display.slice(at+form.length).trim()});
  }
  return result;
 }):[];
 const slots=contexts.map(({prefix,suffix})=>{
  if(!text.startsWith(prefix)||!text.endsWith(suffix)||text.length<=prefix.length+suffix.length)return null;
  const from=prefix.length,to=text.length-suffix.length;
  return {from,to,body:text.slice(from,to).trim()};
 }).filter((v):v is NonNullable<typeof v>=>!!v);
 if(slots.length&&e.words.length){
  // Only actual decoder segments overlapping the answer slot contribute.
  // Low confidence in a shared carrier word must not hide a clear answer,
  // and an earlier 字/말/I in that carrier is never a second practice word.
  const slot=slots[0];let at=0;const confidences:number[]=[];
  for(const w of e.words){const token=normalize(w.word);if(!token)continue;
   if(at&&!compact)at++;const from=at;at+=token.length;
   if(at>slot.from&&from<slot.to)confidences.push(w.conf);
  }
  if(confidences.length)confidence=Math.min(...confidences);
 }
 if(!apple&&!untimed&&confidence<.65)return {decision:'unknown',confidence,valid:true};
 const has=(word:Word)=>candidates(word).some(form=>sentence?slots.some(slot=>slot.body===form):text===form);
 const target=has(plan.target),other=has(plan.competitor);
 if(target&&other)return {decision:candidates(plan.target).some(f=>candidates(plan.competitor).includes(f))?'unknown':'both',confidence,valid:true};
 const contains=(slot:string,word:Word)=>candidates(word).some(form=>compact?slot.includes(form):slot.split(' ').includes(form));
 if(sentence&&!target&&!other&&slots.some(slot=>contains(slot.body,plan.target)&&contains(slot.body,plan.competitor)))
  return {decision:'both',confidence,valid:true};
 return {decision:target?'target':other?'opposite':'other',confidence,valid:true};
}
export function feedbackFor(plan:Plan,heard:string,decision:Decision,soundMeasured:boolean,conflict=false):PairFeedback{
 const lesson=lessonById(plan.calibrationKey.split('/')[1]),side=plan.calibrationKey.split('/')[3]==='1'?1:0;
 const region=plan.profile.unit==='tone'?'tone':plan.profile.unit==='letter-name'?'letter-name':
  plan.profile.id.startsWith('ja-mora')||plan.profile.id==='yue-vowels:v1'?'timing':focusRegion(plan);
 return {version:'pair-feedback:v1',expected:plan.spokenPrompt,heard,
  kind:decision==='target'?'target':decision==='opposite'?'opposite':decision==='other'||decision==='omitted'?'different':decision==='both'?'mixed':'unconfirmed',
  region,targetSound:plan.target.ipa,partnerSound:plan.competitor.ipa,...(decision==='opposite'?{heardSound:plan.competitor.ipa}:{}),
  cue:lesson.language==='ja-JP'?japanesePairGuidance(lesson,lesson.pairs[Number(plan.calibrationKey.split('/')[2])])[side]:lesson.sides[side],soundMeasured,conflict};
}
/** Designed practice index, NOT phoneme correctness probability. Word content
 * leads feedback; only a separately aligned acoustic region measures sound. */
export function pairHybridScore(plan:Plan,e:HfWordEvidence|undefined,acoustic:ScoreResult,quality:Analysis):ScoreResult{
 if(plan.calibrationKey.startsWith('handf/'))return acoustic;
 if(acoustic.status==='scored'||acoustic.status==='unscored'&&['cancelled','invalid-evidence','poor-signal'].includes(acoustic.reason)||!['clear','quiet'].includes(quality.status))return acoustic;
 const base=acoustic.status==='matched'?acoustic:undefined;
 // Isolated kana/letter names may have no lexical ASR result. Keep genuinely
 // measured sound feedback, with an explicit provisional cap, rather than
 // presenting an empty transcript as a failed recording or inventing words.
 const emptyNative=e&&e.final===true&&e.words.length===0&&!e.text.trim()&&
  [`apple-on-device-words:v1/${plan.profile.language}`,`pair-vosk-native:v1/${plan.profile.language}`,`hf-vosk-native:v1/${plan.profile.language}`,...(plan.profile.language==='zh-HK'&&e.untimed===true?['pair-sensevoice-native:v1/zh-HK']:[])].includes(e.engine);
 if(!e||emptyNative){
  if(!base)return acoustic;
  const measured=!!base.focus||!!base.tone||plan.profile.id.startsWith('ja-mora')||plan.profile.id==='yue-vowels:v1';
  const contrastOnly=!!base.tone||plan.profile.id.startsWith('ja-mora')||plan.profile.id==='yue-vowels:v1';
  return {...base,model:'local-pair-hybrid:v1',score:Math.min(measured?79:59,contrastOnly?Math.round((base.breakdown?.pairDistinction??0)*.79):base.score),evidence:measured?'sound':'word',
   pairFeedback:feedbackFor(plan,'','unknown',measured)};
 }
 const decoded=pairWordDecision(plan,e);
 if(!decoded.valid)return acoustic;
 const provisional=e.engine===`apple-on-device-words:v1/${plan.profile.language}`&&e.completed===true&&e.final===false;
 // ASR is not ground truth. Unrelated short-word substitutions only receive a
 // low content score when independent acoustics also reject the displayed pair.
 const conflict=decoded.decision==='other'&&!!base&&Math.min(base.targetDistance,base.competitorDistance)<.65;
 const decision=conflict?'unknown':decoded.decision;
 const measured=!!base&&(!!base.focus||!!base.tone||plan.profile.id.startsWith('ja-mora')||plan.profile.id==='yue-vowels:v1');
 const disagrees=measured&&(decision==='target'&&base!.closestWord===plan.competitor.text||decision==='opposite'&&base!.closestWord===plan.target.text);
 const briefStop=plan.profile.id==='ko-three-way-stop:v1'&&!!base?.focus&&base.focus.frames>=3&&base.focus.separation>=.2&&
  Math.min(base.targetDistance,base.competitorDistance)<.65;
 const strongContrast=!!base&&(!!base.focus&&(base.focus.frames>=6||briefStop)&&base.focus.separation>=.08||!!base.tone&&base.tone.frames>=10&&base.tone.separation>=.75)&&
  Math.min(base.targetDistance,base.competitorDistance)<1.35&&
  ((base.breakdown?.pairDistinction??50)>=85||(base.breakdown?.pairDistinction??50)<=15);
 // A recognizer can collapse BOTH displayed pronunciations to one spelling.
 // Keep the transcript, but do not discard a strongly measured differing
 // region. This can lower a falsely accepted word or rescue a falsely rejected
 // word; the explicit disagreement stays visible, with a provisional cap.
 const soundMeasured=measured&&(!disagrees||strongContrast);
 const sound=soundMeasured?base!.breakdown?.pairDistinction:undefined;
 const word=decision==='target'?100:decision==='opposite'||decision==='other'?0:base?.breakdown?.wordMatch??0;
 const needsAcoustics=plan.profile.unit==='tone'||plan.profile.id.startsWith('ja-mora')||plan.profile.id==='yue-vowels:v1';
 const score=disagrees&&strongContrast?Math.min(79,Math.round(.2*word+.8*(sound??0))):decision==='target'?Math.min(provisional?79:sound===undefined?(needsAcoustics?60:85):100,
  Math.round(sound===undefined?85:needsAcoustics?0.15*word+0.85*sound:0.65*word+0.35*sound)):
  decision==='opposite'?Math.min(35,Math.round((sound??0)*.25)):
  decision==='other'?Math.min(25,Math.round((sound??0)*.2)):
  decision==='both'?Math.min(40,base?.score??0):Math.min(strongContrast&&!conflict?79:59,
   base?Math.round((base.breakdown?.pairDistinction??0)*(strongContrast&&!conflict?.79:.6)):0);
 if(decision==='unknown'&&!base)return {...acoustic,diagnostics:{speechMs:Math.round(quality.voicedSeconds*1000),signal:quality.status,
  acousticState:acoustic.status==='unscored'?acoustic.reason:'unknown',wordState:'recognized',wordEngine:e.engine,wordText:e.text.slice(0,500),wordFinal:e.final,wordProvisional:provisional}};
 return {status:'matched',score,contrast:plan.calibrationKey,model:'local-pair-hybrid:v1',unit:plan.profile.unit,
  targetDistance:base?.targetDistance??0,competitorDistance:base?.competitorDistance??0,referenceVoice:base?.referenceVoice??'none:word-identification-only',
  scope:plan.calibrationKey.includes('/sentence/')?'sentence':'word',evidence:soundMeasured?'sound':'word',
  recognition:{engine:e.engine,text:e.text.slice(0,500),decision,confidence:decoded.confidence,...(provisional?{provisional:true}:{})},
  pairFeedback:feedbackFor(plan,e.text.slice(0,500),decision,soundMeasured,conflict||disagrees),
  ...(base?.focus&&soundMeasured?{focus:base.focus}:{}),
  ...(base?.tone&&soundMeasured?{tone:base.tone}:{}),
  ...(decision==='target'?{closestWord:plan.target.text}:decision==='opposite'?{closestWord:plan.competitor.text}:{}),
  breakdown:{wordMatch:word,pairDistinction:sound??0,speechMs:Math.round(quality.voicedSeconds*1000),referenceMs:base?.breakdown?.referenceMs??0}};
}
