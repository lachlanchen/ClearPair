import {useState} from 'react';
import {Play,Square} from 'lucide-react';
import {soundMaps} from './sound-map';
import {toneSequences} from './tone-curriculum';
import {sourceLocale,text} from './i18n';
import type {AppId,Locale,Word} from './types';

export function SoundMap({app,locale,play,stop,isPlaying,active,busy,tr}: {
  app:AppId;locale:Locale;play:(words:Word[])=>void;stop:()=>void;
  isPlaying:(word:Word)=>boolean;active:boolean;busy:boolean;tr:(en:string,zh:string)=>string;
}) {
  const map=soundMaps[app];
  const [groupIndex,setGroupIndex]=useState(0),[names,setNames]=useState(false);
  if(!map)return null;
  const group=map.groups[groupIndex]??map.groups[0],sequences=toneSequences(map.language);
  const hasNames=group.items.some(i=>i.name);
  const hasExamples=group.items.some(i=>i.example);
  const hasReferenceFallback=[map.scope,group.note].some(value=>sourceLocale(locale,value)!==locale);
  return <details className="panel sound-map" data-testid="sound-map">
    <summary>{tr('Sound and letter map','声音与字母表')} <small>{map.groups.reduce((n,g)=>n+g.items.length,0)}</small></summary>
    {hasReferenceFallback&&<span className="reference-label">{tr('Reference notes','参考说明')} · English</span>}
    <p className="muted" lang={sourceLocale(locale,map.scope)}>{text(locale,map.scope)}</p>
    <div className="map-sections" role="group" aria-label={tr('Sound groups','声音分组')}>
      {map.groups.map((g,i)=><button key={g.id} aria-pressed={groupIndex===i} data-map-group={g.id}
        onClick={()=>{stop();setGroupIndex(i);setNames(false);}} lang={sourceLocale(locale,g.title)}>{text(locale,g.title)} <small>{g.items.length}</small></button>)}
    </div>
    {hasNames&&hasExamples&&<div className="small-controls" role="group" aria-label={tr('Playback type','播放类型')}>
      <button aria-pressed={!names} onClick={()=>{stop();setNames(false);}}>{tr('Sound example','例音')}</button>
      <button aria-pressed={names} onClick={()=>{stop();setNames(true);}}>{tr('Letter name','字母名称')}</button>
    </div>}
    <p className="muted" lang={sourceLocale(locale,group.note)}>{text(locale,group.note)}</p>
    <div className="sound-tiles" lang={map.language} dir={map.language==='ar-SA'?'rtl':'ltr'} data-testid="sound-tiles">
      {group.items.map(item=>{
        const useName=!!item.name&&(names||!item.example);
        const word=useName?item.name:item.example;
        return <button key={item.id} data-sound-id={item.id} className={word&&isPlaying(word)?'speaking':''}
          disabled={busy||!word} onClick={()=>word&&play([word])}
          aria-label={`${tr(useName?'Letter name':'Sound example',useName?'字母名称':'例音')}: ${item.label}${word?' · '+word.text:' · '+tr('No verified audio example','暂无核实例音')}`}>
          <b>{item.label}</b><span dir="auto">{word?.text??'—'}</span><small dir="ltr">{word?.ipa??item.reading}</small>
        </button>;
      })}
    </div>
    {sequences.length>0&&<details className="tone-sequences">
      <summary>{tr('Back-to-back tone grid','连续声调表')} · {sequences.length}</summary>
      <p className="muted">{tr('Separate syllables with a pause. This listening drill is not connected-speech scoring; Mandarin 3 + 3 changes in a phrase.','音节之间有停顿。这是听辨练习，不是连续语流评分；普通话短语中的三声加三声会变调。')}</p>
      <div className="tone-sequence-grid" style={{gridTemplateColumns:`repeat(${Math.sqrt(sequences.length)},minmax(0,1fr))`}}
        role="group" aria-label={tr('Back-to-back tone grid','连续声调表')} lang={map.language}>
        {sequences.map(([a,b])=><button key={`${a.number}-${b.number}`} disabled={busy} data-tone-sequence={`${a.number}-${b.number}`}
          onClick={()=>play([a.word,b.word])} aria-label={`${a.number} → ${b.number}: ${a.word.text} · ${b.word.text}`}>
          <b>{a.number} → {b.number}</b><small>{a.word.text} · {b.word.text}</small>
        </button>)}
      </div>
    </details>}
    <div className="map-footer">
      <small>{tr('Reference map: listening and recall, not a pronunciation grade.','参考表：用于聆听与回忆，不是发音评分。')}</small>
      {active&&<button onClick={stop} className="motion-toggle"><Square size={14}/>{tr('Stop','停止')}</button>}
      {!active&&<Play size={14} aria-hidden="true"/>}
    </div>
  </details>;
}
