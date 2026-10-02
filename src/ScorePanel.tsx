import {useEffect,useRef,useState} from 'react';
import {Sparkles,Square} from 'lucide-react';
import {LocalScorer} from './local-score';
import {saveTake} from './storage';
import {WordText} from './WordText';
import type {Take} from './types';
import type {ScoreReason,ScoreResult} from './scoring';
export function scoreMessage(reason:ScoreReason,tr:(en:string,zh:string)=>string):string {
  switch(reason){
    case 'ungraded-exercise':return tr('This is an ungraded exploration, not a spoken contrast test.','这是不计分的探索，不是发音对比测试。');
    case 'poor-signal':return tr('No reliable speech signal. Check the microphone and try again.','没有可靠语音信号，请检查麦克风后重试。');
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
    // Store only real grades with their model/contrast provenance. No result from
    // a previous target can overwrite a newly recorded take or change recall stars.
    if(next.status==='scored'||next.status==='matched'){
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
        <p>{result.status==='matched'&&result.hf?tr('Target sound','目标音'):tr('Practice match','练习匹配分')}
          {result.status==='matched'&&result.hf&&<small>{tr('Heard','听到的音')}: {result.hf.heard==='uncertain'?tr('Uncertain','不确定'):`/${result.hf.heard==='h'&&take?.language==='zh-CN'?'x':result.hf.heard}/`}</small>}
        </p>
      </div>:<p>{result?.status==='unscored'?scoreMessage(result.reason,tr):automatic?tr('Record, speak, then pause for your score.','点录音，说出词语，停顿后查看评分。'):tr('Record first, then assess the confusing sound.','先录音，再评估容易混淆的音。')}</p>}
      {!running&&result?.status==='matched'&&result.closestWord&&<p className="closest-word">{tr('Closer to','更接近')}: <bdi>{result.closestWord}</bdi></p>}
      {!running&&result?.status==='matched'&&result.hf&&<dl className="hf-score-items">
        <div><dt>{tr('Target sound','目标音')}</dt><dd>{result.hf.sound}<small>/100</small></dd></div>
        <div><dt>{tr('Vowel and word','元音与词语')}</dt><dd>{result.hf.word}<small>/100</small></dd></div>
        <div><dt>{tr('Sound timing','发音时长')}</dt><dd>{result.hf.timing}<small>/100</small></dd></div>
      </dl>}
      {!running&&result?.status==='matched'&&!result.hf&&result.breakdown&&<dl className="hf-score-items">
        <div><dt>{tr('Word match','词语匹配')}</dt><dd>{result.breakdown.wordMatch}<small>/100</small></dd></div>
        <div><dt>{contrastLabel(result.focus?.region,tr)}</dt><dd>{result.breakdown.pairDistinction}<small>/100</small></dd></div>
        <div><dt>{tr('Speech duration','有效发声时长')}</dt><dd>{result.breakdown.speechMs}<small>ms</small></dd></div>
      </dl>}
      {!running&&result?.status==='matched'&&result.hf&&<p className="hf-coaching">{hfCue(result.hf.cue,tr)}</p>}
      {!running&&(result?.status==='matched'||result?.status==='scored')&&<details className="score-details">
        <summary>{tr('Score details','评分详情')}</summary>
        <p>{result.status==='matched'?tr('Beta practice match. Similarity to the device voice, not a pronunciation accuracy percentage.','测试版练习匹配分：与设备示范声音的相似度，不是发音正确率。'):tr('Estimated target-contrast score, not a diagnosis.','目标音对比的估计分数，不是诊断。')}</p>
        <small>{tr('On this device. No audio uploads.','在此设备运行，不上传录音。')}</small>
      </details>}
    </div>
    <div className="local-score-actions">{(!automatic||running||result?.status==='unscored'||(!result&&take?.assessment&&autoStarted.current===take.id))&&<button className="secondary-button" disabled={busy||!take?.assessment}
      onClick={()=>running?cancel():void assess()}>{running?<Square size={16}/>:<Sparkles size={16}/>}
      {running?tr('Stop','停止'):automatic?tr('Retry scoring','重新评分'):tr('Assess my pronunciation','评估我的发音')}</button>}</div>
  </section>;
}
function contrastLabel(region:import('./pair-focus').FocusRegion|undefined,tr:(en:string,zh:string)=>string){
  if(region==='initial')return tr('Initial contrast','词首音区别');
  if(region==='final')return tr('Ending contrast','词尾音区别');
  if(region==='vowel')return tr('Vowel contrast','元音区别');
  return tr('Pair distinction','词对区别');
}
function hfCue(cue:import('./hf-score').HFDetails['cue'],tr:(en:string,zh:string)=>string){
  switch(cue){
    case 'good':return tr('The target sound is clearer. Keep the airflow smooth.','目标音较清晰，继续保持平稳气流。');
    case 'lip-friction':return tr('For F, let your upper teeth lightly touch your lower lip and keep air flowing.','发 F 时，上齿轻触下唇，保持气流。');
    case 'gentle-breath':return tr('For English H, release your lip and breathe into the vowel.','发英语 H 时，松开嘴唇，轻轻呼气接上元音。');
    case 'back-friction':return tr('For Mandarin H, make gentle friction at the back of your mouth.','发普通话 H 时，在口腔后部产生轻柔摩擦。');
    case 'keep-ending':return tr('Keep the final F flowing without adding a vowel.','词尾 F 保持气流，不要添加元音。');
    case 'add-voice':return tr('For V, keep lip contact and add gentle voicing.','发 V 时保持唇齿接触，加上轻柔声带振动。');
    default:return tr('The consonant is unclear. Listen to the pair and try once more.','辅音区别不够清晰，请听词对后再试。');
  }
}
