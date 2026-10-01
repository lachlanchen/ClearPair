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
export function ScorePanel({take,busy,tr,onSaved,onStorageWarning}:{take?:Take;busy:boolean;
  tr:(en:string,zh:string)=>string;onSaved:(take:Take)=>void;onStorageWarning:()=>void}){
  const engine=useRef(new LocalScorer()),token=useRef(0);
  const [running,setRunning]=useState(false),[result,setResult]=useState<ScoreResult>();
  useEffect(()=>{token.current++;engine.current.cancel();setRunning(false);setResult(take?.score);},[take?.id,busy]);
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
    <div className="local-score-actions"><button className="secondary-button" disabled={busy||!take?.assessment}
      onClick={()=>running?cancel():void assess()}>{running?<Square size={16}/>:<Sparkles size={16}/>}
      {tr(running?'Stop':'Assess my pronunciation',running?'停止':'评估我的发音')}</button>
      <small>{tr('On this device. No audio uploads.','在此设备运行，不上传录音。')}</small></div>
    <div className="local-score-result" aria-live="polite" aria-busy={running}>
      {take&&<small className="score-target">{tr('Recorded word','录制的词')}: <WordText value={take.word} reading={take.reading}/></small>}
      {running?<p>{tr('Analysing the target sound…','正在分析目标音…')}</p>:result?.status==='scored'||result?.status==='matched'?<div className="local-grade">
        <strong>{result.score}<small>/ 100</small></strong>
        <p>{result.status==='matched'?tr('Beta practice match. Similarity to the device voice, not a pronunciation accuracy percentage.','测试版练习匹配分：与设备示范声音的相似度，不是发音正确率。'):tr('Estimated target-contrast score, not a diagnosis.','目标音对比的估计分数，不是诊断。')}<small>{result.model}</small></p>
      </div>:<p>{result?.status==='unscored'?scoreMessage(result.reason,tr):tr('Record first, then assess the confusing sound.','先录音，再评估容易混淆的音。')}</p>}
    </div>
  </section>;
}
