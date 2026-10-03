import {useEffect,useRef,useState} from 'react';
import {Sparkles,Square} from 'lucide-react';
import {LocalScorer} from './local-score';
import {saveTake} from './storage';
import {WordText} from './WordText';
import type {Take} from './types';
import type {ScoreReason,ScoreResult} from './scoring';
import {pairContrastText,type ContrastText} from './pair-contrast-text';
export function scoreMessage(reason:ScoreReason,tr:(en:string,zh:string)=>string):string {
  switch(reason){
    case 'ungraded-exercise':return tr('This is an ungraded exploration, not a spoken contrast test.','这是不计分的探索，不是发音对比测试。');
    case 'poor-signal':return tr('No reliable speech signal. Check the microphone and try again.','没有可靠语音信号，请检查麦克风后重试。');
    case 'sound-unresolved':return tr('Recording captured. Sound details could not be measured.','录音已保存，但未能测量发音细节。');
    case 'unvalidated-model':return tr('The on-device pronunciation models are still being validated. No grade is invented.','设备端发音模型仍在验证中，不会编造分数。');
    case 'cancelled':return tr('Assessment stopped. Your recording is safe.','评分已停止，录音仍保留。');
    case 'reference-unavailable':return tr('Install an offline voice for this practice language in device speech settings, then try again. Your recording is saved.','请在设备语音设置中安装此练习语言的离线声音后重试，录音已保留。');
    case 'unaligned':return tr('The target could not be located reliably. Try the sentence option.','无法可靠定位目标音，请尝试短句模式。');
    case 'uncertain':return tr('The sound is uncertain. Compare the pair and record again.','音的区别不够确定，请比较词对后重录。');
    default:return tr('Local assessment is unavailable for this take. You can still replay it.','这段录音暂时无法在设备端评分，仍可回放。');
  }
}
export function ScorePanel({take,busy,automatic=false,tr,onSaved,onStorageWarning}:{take?:Take;busy:boolean;automatic?:boolean;
  tr:(en:string,zh:string)=>string;onSaved:(take:Take)=>void;onStorageWarning:()=>void}){
  const engine=useRef(new LocalScorer()),token=useRef(0),autoStarted=useRef<string|undefined>(undefined);
  const [running,setRunning]=useState(false),[result,setResult]=useState<ScoreResult>();
  useEffect(()=>{token.current++;engine.current.cancel();setRunning(false);setResult(take?.score);},[take?.id,busy]);
  useEffect(()=>{
    if(automatic&&!busy&&take?.assessment&&!take.score&&autoStarted.current!==take.id&&!document.hidden){
      autoStarted.current=take.id;void assess();
    }
  },[take?.id,busy,automatic]);
  useEffect(()=>{
    const hidden=()=>{if(document.hidden){token.current++;engine.current.dispose();setRunning(false);}};
    document.addEventListener('visibilitychange',hidden);
    return()=>{document.removeEventListener('visibilitychange',hidden);token.current++;engine.current.dispose();};
  },[]);
  function cancel(){token.current++;engine.current.cancel();setRunning(false);setResult({status:'unscored',reason:'cancelled'});}
  async function assess(){
    if(!take?.assessment||busy||running)return;
    const run=++token.current,entry=take,task=take.assessment;
    setRunning(true);setResult(undefined);
    let next:ScoreResult;
    try{next=await engine.current.assess(entry.app,entry.lesson,task.pair,task.side,task.sentence,entry.audio,
      {word:entry.word,spokenPrompt:task.spokenPrompt??entry.prompt,calibrationKey:task.calibrationKey});}
    catch{next={status:'unscored',reason:'model-unavailable'};}
    if(run!==token.current)return;
    setResult(next);setRunning(false);
    // H/F also retains unsuccessful assessment reasons next to the audio for
    // diagnosis. These remain ungraded and never become recall stars. No result from
    // a previous target can overwrite a newly recorded take or change recall stars.
    if(next.status==='scored'||next.status==='matched'||next.status==='unscored'&&next.reason!=='cancelled'&&(entry.app==='handf'||next.diagnostics)){
      const updated={...entry,score:next};
      try{const storage=await saveTake(updated);if(storage==='session')onStorageWarning();
        if(run===token.current)onSaved({...updated,storage});}
      catch{onStorageWarning();}
    }
  }
  return <section className="local-score-panel" aria-label={tr('Pronunciation assessment','发音评分')}>
    <div className="local-score-result" aria-live="polite" aria-busy={running}>
      {take&&<small className="score-target">{tr('Recorded word','录制的词')}: <WordText value={take.word} reading={take.reading}/></small>}
      {running?<p>{tr('Analysing the target sound…','正在分析目标音…')}</p>:result?.status==='scored'||result?.status==='matched'?<div className="local-grade">
        <strong>{result.score}<small>/ 100</small></strong>
        <p>{result.status==='matched'&&result.hf&&!result.recognition?tr('Target sound','目标音'):result.status==='matched'&&result.evidence==='word'&&result.recognition?tr('Word match','词语匹配'):tr('Practice match','练习匹配分')}
          {result.status==='matched'&&result.hf&&!result.recognition&&<small>{tr('Heard','听到的音')}: {result.hf.heard==='uncertain'?tr('Uncertain','不确定'):`/${result.hf.heard==='h'&&take?.language==='zh-CN'?'x':result.hf.heard}/`}</small>}
        </p>
      </div>:<p>{result?.status==='unscored'?result.diagnostics&&['clear','quiet'].includes(result.diagnostics.signal)&&['uncertain','unaligned','sound-unresolved'].includes(result.reason)?take?.app==='handf'?tr('Speech was captured, but word recognition could not confirm H/F. Try the sentence option; your recording is saved.','已录到语音，但词语识别未能确认 H/F。可尝试短句模式，录音仍保留。'):tr('Recording captured. Sound details could not be measured.','录音已保存，但未能测量发音细节。'):scoreMessage(result.reason,tr):automatic?tr('Record, speak, then pause for your score.','点录音，说出词语，停顿后查看评分。'):tr('Record first, then assess the confusing sound.','先录音，再评估容易混淆的音。')}</p>}
      {!running&&result?.status==='matched'&&(result.recognition?.text||result.closestWord)&&<p className="closest-word">{result.recognition?.text?tr('Recognized words','识别的词语'):tr('Closer to','更接近')}: <bdi>{result.recognition?.text??result.closestWord}</bdi></p>}
      {!running&&take?.app==='handf'&&result?.status==='matched'&&(result.hf||result.breakdown)&&<HfScoreItems result={result} language={take.language} tr={tr}/>}
      {!running&&result?.status==='matched'&&result.pairFeedback&&<PairScoreItems result={result} tr={tr}/>}
      {!running&&take?.app!=='handf'&&result?.status==='matched'&&!result.pairFeedback&&result.hf&&<dl className="hf-score-items">
        <div><dt>{tr('Target sound','目标音')}</dt><dd>{result.hf.sound}<small>/100</small></dd></div>
        <div><dt>{result.recognition?tr('Word match','词语匹配'):tr('Vowel and word','元音与词语')}</dt><dd>{result.hf.word}<small>/100</small></dd></div>
        <div><dt>{result.recognition?tr('Speech duration','有效发声时长'):tr('Sound timing','发音时长')}</dt><dd>{result.recognition?result.breakdown?.speechMs:result.hf.timing}<small>{result.recognition?'ms':'/100'}</small></dd></div>
      </dl>}
      {!running&&take?.app!=='handf'&&result?.status==='matched'&&!result.pairFeedback&&!result.hf&&result.breakdown&&<dl className="hf-score-items">
        <div><dt>{tr('Word match','词语匹配')}</dt><dd>{result.breakdown.wordMatch}<small>/100</small></dd></div>
        <div><dt>{result.recognition?tr('Target sound','目标音'):contrastLabel(result.focus?.region,tr)}</dt><dd>{result.recognition&&result.evidence==='word'?tr('Not measured','未测量'):<>{result.breakdown.pairDistinction}<small>/100</small></>}</dd></div>
        <div><dt>{tr('Speech duration','有效发声时长')}</dt><dd>{result.breakdown.speechMs}<small>ms</small></dd></div>
      </dl>}
      {!running&&result?.status==='matched'&&result.hf&&<p className="hf-coaching">{result.hf.cue==='uncertain'?tr('Both sounds are close in this recording. The score shows the measured difference; try clearer breath for H or lip friction for F.','这段录音的两个音较接近。分数反映测量到的区别；H 可加强轻柔呼气，F 可加强唇齿摩擦。'):hfCue(result.hf.cue,tr)}</p>}
      {!running&&take?.app==='handf'&&result?.status==='matched'&&!result.hf&&!result.recognition&&<p className="hf-coaching">{tr('The word shape was compared, but the consonant boundary was unclear. This score is provisional, not a confirmed H/F sound grade.','已比较词语的声音特征，但辅音边界不清晰。这是暂定匹配分，不是已确认的 H/F 发音分。')}</p>}
      {!running&&result?.status==='matched'&&result.pairFeedback&&<PairFeedbackView result={result} tr={tr}/>}
      {!running&&result?.status==='matched'&&!result.pairFeedback&&!result.hf&&result.recognition&&result.recognition.decision!=='target'&&<p className="hf-coaching">{hfCue(result.recognition.decision==='omitted'?'missing':result.recognition.decision==='other'?'different-word':result.recognition.decision==='opposite'&&result.recognition.wordSound?result.recognition.wordSound==='h'?'lip-friction':take?.language==='zh-CN'?'back-friction':'gentle-breath':'uncertain',tr)}</p>}
      {!running&&result?.status==='matched'&&result.recognition?.partialWord&&<p className="hf-coaching">{tr('A nearby word supports the initial sound, but the complete word was not confirmed. Compare the vowel and ending too.','识别到的近似词支持词首音，但完整词语未确认。请同时比较元音和词尾。')}</p>}
      {!running&&result?.status==='unscored'&&result.diagnostics?.wordText&&<p className="closest-word">{tr('Recognized words','识别的词语')}: <bdi>{result.diagnostics.wordText}</bdi></p>}
      {!running&&result?.status==='unscored'&&result.diagnostics&&<dl className="hf-score-items">
        <div><dt>{tr('Word match','词语匹配')}</dt><dd><span className="score-empty">{tr('Not measured','未测量')}</span></dd></div>
        <div><dt>{tr('Target sound','目标音')}</dt><dd><span className="score-empty">{tr('Not measured','未测量')}</span></dd></div>
        <div><dt>{tr('Speech duration','有效发声时长')}</dt><dd>{result.diagnostics.speechMs}<small>ms</small></dd></div>
      </dl>}
      {!running&&(result?.status==='matched'||result?.status==='scored'||result?.status==='unscored'&&result.diagnostics)&&<details className="score-details">
        <summary>{tr('Score details','评分详情')}</summary>
        <p>{result.status==='matched'?result.recognition?result.evidence==='word'?result.pairFeedback?tr('Word identity does not measure this sound contrast. This is a word-match score, not a pronunciation accuracy percentage.','词语识别并未测量这个发音区别。这是词语匹配分，不是发音正确率。'):tr('The word was identified offline; its consonant could not be measured reliably. This is a word-match score, not a pronunciation accuracy percentage.','离线识别到了词语，但无法可靠测量辅音。这是词语匹配分，不是发音正确率。'):tr('Offline word recognition plus sound comparison. This practice index is not a pronunciation accuracy percentage.','离线词语识别结合声音比较：练习分数不是发音正确率。'):tr('Beta practice match. Similarity to the device voice, not a pronunciation accuracy percentage.','测试版练习匹配分：与设备示范声音的相似度，不是发音正确率。'):result.status==='scored'?tr('Estimated target-contrast score, not a diagnosis.','目标音对比的估计分数，不是诊断。'):scoreMessage(result.reason,tr)}</p>
        {result.status==='matched'&&result.recognition?.provisional&&<p>{tr('Provisional word recognition: Apple returned useful words but did not finalize the transcript.','暂定词语识别：Apple 返回了有效词语，但未完成最终转写。')}</p>}
        {take?.app==='handf'&&result.status==='matched'&&result.hf&&<p>{tr('Sound timing','发音时长')}: {result.hf.timing}/100 · {result.hf.segmentMs}ms</p>}
        {result.status!=='scored'&&result.diagnostics&&<small className="score-diagnostics">{result.diagnostics.wordEngine??'offline-words-unavailable'} · {result.diagnostics.acousticState} · {result.diagnostics.wordState}</small>}
        <small>{tr('On this device. No audio uploads.','在此设备运行，不上传录音。')}</small>
      </details>}
    </div>
    <div className="local-score-actions">{(!automatic||running||result?.status==='unscored'||(!result&&take?.assessment&&autoStarted.current===take.id))&&<button className="secondary-button" disabled={busy||!take?.assessment}
      onClick={()=>running?cancel():void assess()}>{running?<Square size={16}/>:<Sparkles size={16}/>}
      {running?tr('Stop','停止'):automatic?tr('Retry scoring','重新评分'):tr('Assess my pronunciation','评估我的发音')}</button>}</div>
  </section>;
}
function HfScoreItems({result,language,tr}:{result:Extract<ScoreResult,{status:'matched'}>;language:string;tr:(en:string,zh:string)=>string}){
  const wordSound=result.recognition?.wordSound;
  const phoneme=wordSound==='h'&&language==='zh-CN'?'x':wordSound;
  return <dl className="hf-score-items">
    <div><dt>{tr('Word match','词语匹配')}</dt><dd>{result.breakdown?.wordMatch??result.hf?.word}<small>/100</small></dd></div>
    <div><dt>{tr('Target sound','目标音')}</dt><dd>{result.hf?<>{result.hf.sound}<small>/100</small></>:phoneme?<><bdi>/{phoneme}/</bdi><small className="score-evidence">{tr('Word evidence','词语证据')}</small></>:<span className="score-empty">{tr('Not measured','未测量')}</span>}</dd></div>
    <div><dt>{tr('Speech duration','有效发声时长')}</dt><dd>{result.breakdown?.speechMs??result.diagnostics?.speechMs??tr('Not measured','未测量')}{(result.breakdown||result.diagnostics)&&<small>ms</small>}</dd></div>
  </dl>;
}
function contrastLabel(region:import('./pair-focus').FocusRegion|undefined,tr:(en:string,zh:string)=>string){
  if(region==='initial')return tr('Initial contrast','词首音区别');
  if(region==='final')return tr('Ending contrast','词尾音区别');
  if(region==='vowel')return tr('Vowel contrast','元音区别');
  return tr('Pair distinction','词对区别');
}
function PairScoreItems({result,tr}:{result:Extract<ScoreResult,{status:'matched'}>;tr:(en:string,zh:string)=>string}){
 const feedback=result.pairFeedback!;
 return <dl className="hf-score-items pair-score-items">
  <div><dt>{tr('Word match','词语匹配')}</dt><dd>{result.breakdown?.wordMatch??tr('Not measured','未测量')}<small>/100</small></dd></div>
  <div><dt>{feedback.region==='tone'?tr('Tone contrast','声调区别'):feedback.region==='timing'?tr('Timing contrast','节奏区别'):feedback.region==='letter-name'?tr('Letter name','字母名称'):contrastLabel(feedback.region,tr)}</dt>
   <dd>{feedback.soundMeasured?<>{result.breakdown?.pairDistinction}<small>/100</small></>:<span className="score-empty">{tr('Word evidence','词语证据')}</span>}</dd></div>
  <div><dt>{tr('Speech duration','有效发声时长')}</dt><dd>{result.breakdown?.speechMs}<small>ms</small></dd></div>
 </dl>;
}
function PairFeedbackView({result,tr}:{result:Extract<ScoreResult,{status:'matched'}>;tr:(en:string,zh:string)=>string}){
 const f=result.pairFeedback!;
 const [target,partner]=pairContrastText(f.targetSound,f.partnerSound);
 const summary=f.conflict?tr('Words and sound disagree. Neither is treated as certain.','词语识别与声音比较不一致，两者都不作为确定结论。'):
  f.kind==='target'?tr('The displayed word was recognized.','识别到了屏幕上的词语。'):
  f.kind==='opposite'?tr('The other word in this pair was recognized.','识别到了这个词对中的另一个词。'):
  f.kind==='different'?tr('A different word was recognized.','识别到了其他词语。'):
  f.kind==='mixed'?tr('Both words were recognized. Practise one at a time.','识别到了两个词语，请一次练一个。'):
  tr('The transcript is shown, but the word is not confirmed.','已显示识别文字，但词语尚未确认。');
  return <div className={`pair-feedback pair-feedback-${f.kind}`}>
  <p className="pair-feedback-summary">{summary}</p>
  <div className="pair-feedback-contrast" aria-label={tr('Compare the confusing part','比较容易混淆的部分')}>
   <div><small>{tr('Target','目标')}</small><bdi><ContrastPronunciation value={target}/></bdi></div>
   <span aria-hidden="true">↔</span><div><small>{tr('Pair distinction','词对区别')}</small><bdi><ContrastPronunciation value={partner}/></bdi></div>
  </div>
  {f.soundMeasured&&result.breakdown&&<div className="pair-comparison" role="meter" aria-label={tr('Pair distinction','词对区别')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={result.breakdown.pairDistinction}>
   <div className="pair-comparison-track"><span style={{left:`${Math.max(2,Math.min(98,result.breakdown.pairDistinction))}%`}}/></div>
   <div className="pair-comparison-labels"><small><bdi>{f.partnerSound}</bdi></small><small><bdi>{f.targetSound}</bdi></small></div>
  </div>}
  {f.soundMeasured&&result.tone&&<ToneComparisonView tone={result.tone} tr={tr}/>}
  {f.region==='tone'&&!f.soundMeasured&&result.scope==='word'?<p className="hf-coaching">{tr('For pitch level, try the sentence option.','要比较音高位置，请试试短句模式。')}</p>:f.kind!=='target'&&<p className="hf-coaching">{tr(f.cue.en,f.cue.zh)}</p>}
 </div>;
}
function ContrastPronunciation({value}:{value:ContrastText}){
 return <>{value.before}{value.contrast&&<mark className="pair-phone-focus">{value.contrast}</mark>}{value.after}</>;
}
function ToneComparisonView({tone,tr}:{tone:import('./tone-comparison').ToneComparison;tr:(en:string,zh:string)=>string}){
 const all=[...tone.heard,...tone.target,...tone.partner],extent=Math.max(3,...all.map(Math.abs));
 const path=(values:number[])=>values.map((v,i)=>`${12+i*216/(values.length-1)},${50-v/extent*35}`).join(' ');
 return <figure className="pair-tone-chart">
  <svg viewBox="0 0 240 100" role="img" aria-label={tone.baseline==='carrier-median'?tr('Pitch relative to the sentence','相对于短句的音高'):tr('Relative pitch shape','相对音高走势')}>
   <line x1="12" x2="228" y1="50" y2="50" className="pair-tone-axis"/>
   <polyline points={path(tone.partner)} className="pair-tone-partner"/>
   <polyline points={path(tone.target)} className="pair-tone-target"/>
   <polyline points={path(tone.heard)} className="pair-tone-heard"/>
  </svg>
  <figcaption><span className="tone-key-heard">{tr('Your recording','你的录音')}</span><span className="tone-key-target">{tr('Target','目标')}</span></figcaption>
 </figure>;
}
function hfCue(cue:import('./hf-score').HFDetails['cue'],tr:(en:string,zh:string)=>string){
  switch(cue){
    case 'good':return tr('The target sound is clearer. Keep the airflow smooth.','目标音较清晰，继续保持平稳气流。');
    case 'lip-friction':return tr('For F, let your upper teeth lightly touch your lower lip and keep air flowing.','发 F 时，上齿轻触下唇，保持气流。');
    case 'gentle-breath':return tr('For English H, release your lip and breathe into the vowel.','发英语 H 时，松开嘴唇，轻轻呼气接上元音。');
    case 'back-friction':return tr('For Mandarin H, make gentle friction at the back of your mouth.','发普通话 H 时，在口腔后部产生轻柔摩擦。');
    case 'keep-ending':return tr('Keep the final F flowing without adding a vowel.','词尾 F 保持气流，不要添加元音。');
    case 'add-voice':return tr('For V, keep lip contact and add gentle voicing.','发 V 时保持唇齿接触，加上轻柔声带振动。');
    case 'missing':return tr('The vowel was captured, but the consonant is missing or too weak. Start with a little breath or lip friction.','录到了元音，但辅音缺失或太弱。请先发出轻柔呼气或唇齿摩擦。');
    case 'different-word':return tr('A different word was recognized. Listen to this pair, then try the displayed word.','识别到了其他词语，请先听这个词对，再说屏幕上的词。');
    default:return tr('The consonant is unclear. Listen to the pair and try once more.','辅音区别不够清晰，请听词对后再试。');
  }
}
