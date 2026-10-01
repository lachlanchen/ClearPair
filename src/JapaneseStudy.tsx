import { useEffect, useState, type CSSProperties } from 'react';
import { Play, Square, ArrowRight } from 'lucide-react';
import strokeData from '../assets/japanese/kanjivg.json';
import { kanaRows, basicKana } from './japanese-curriculum';
import { morae } from './japanese-mora';
import { WordText } from './WordText';
import type { Lesson, Word } from './types';

const strokes: Record<string,{paths:string[]}> = strokeData.characters;
function Stroke({ character, drawing }: { character: string; drawing: boolean }) {
  const paths=strokes[character]?.paths;
  if(!paths)return <span className="kana-glyph">{character}</span>;
  return <svg viewBox="0 0 109 109" role="img" aria-label={character} className="kana-stroke">
    <g className="stroke-guide">{paths.map((d,i)=><path key={i} d={d}/>)}</g>
    <g className={drawing?'stroke-ink drawing':'stroke-ink'}>{paths.map((d,i)=><path key={i} d={d} pathLength={1}
      style={{animationDelay:`${i*.65}s`}} />)}</g>
  </svg>;
}
export function JapaneseStudy({ lesson, pair, play, tr }: {
  lesson:Lesson; pair:[Word,Word]; play:(words:Word[])=>void; tr:(en:string,zh:string)=>string;
}) {
  const [drawing,setDrawing]=useState(false),[run,setRun]=useState(0),[script,setScript]=useState<0|1>(0);
  const [selected,setSelected]=useState<string|null>(null);
  useEffect(()=>{setDrawing(false);setSelected(null);},[lesson.id,pair]);
  const selectedReading=basicKana.find(k=>k.hiragana===selected||k.katakana===selected)?.reading;
  const studyWords:Word[]=selected?[{text:selected,ipa:selectedReading??'',reading:selected,sentence:selected}]:pair;
  const characters=studyWords.map(word=>Array.from(word.text)[0]);
  useEffect(()=>{
    if(!drawing)return;
    const count=Math.max(...characters.map(c=>strokes[c]?.paths.length??1));
    const timer=setTimeout(()=>setDrawing(false),count*650+900);
    return()=>clearTimeout(timer);
  },[drawing,run,characters.join('')]);
  function animate(){setRun(n=>n+1);setDrawing(!drawing);}
  return <section className="japanese-study">
    <div className={`kana-focus ${selected?'single':''}`} key={`${lesson.id}/${run}/${selected}`}>{studyWords.map((word,i)=><div key={i}>
      <Stroke character={characters[i]} drawing={drawing}/>
      <button className="kana-word" onClick={()=>play([word])} lang="ja-JP"><WordText value={word.text} reading={word.reading}/><Play size={14}/></button>
      <span className="mora-track" aria-label={`${morae(word.reading??word.spoken??word.text).length} ${tr('Mora beats','拍')}`}>
        {morae(word.reading??word.spoken??word.text).map((m,j)=><span key={j} style={{'--beat':j} as CSSProperties}>{m}</span>)}
      </span>
      <small>{word.ipa}</small>
    </div>)}</div>
    <button className="motion-toggle" onClick={animate} aria-pressed={drawing}>{drawing?<Square size={14}/>:<Play size={14}/>}
      {tr(drawing?'Stop strokes':'Replay strokes',drawing?'停止笔顺动画':'重看笔顺')}</button>
    {selected&&<button className="motion-toggle" onClick={()=>{setSelected(null);setDrawing(false);}}>{tr('Compare pair','比较词对')}</button>}
    <p className="muted">{tr('Modern stroke order, not historical handwriting.','现代笔顺，不是古代字形演变。')}</p>
    <details className="kana-map">
      <summary>{tr('Kana map','假名表')}</summary>
      <div className="small-controls"><button aria-pressed={script===0} onClick={()=>setScript(0)}>{tr('Hiragana','平假名')}</button>
        <button aria-pressed={script===1} onClick={()=>setScript(1)}>{tr('Katakana','片假名')}</button></div>
      <div className="kana-table" lang="ja-JP">{kanaRows.flatMap(row=>Array.from(row[script]).map((c,i)=>c===' '?<span key={`${row[0]}-${i}`} aria-hidden="true"/>:
        <button key={c} className={selected===c?'selected':''} aria-label={`${c} ${row[2][i]}`} onClick={()=>{
          setSelected(c);setDrawing(false);
          play([{text:c,ipa:row[2][i],sentence:c,spoken:c}]);
        }}><b>{c}</b><small>{row[2][i]}</small></button>))}</div>
      <p className="muted">{tr('Tap a kana to hear it in Japanese.','点击假名，听日语读音。')}</p>
    </details>
    <details className="kana-origins"><summary>{tr('Origins, not memory tricks','字源，不是记忆口诀')}</summary>
      <div className="origin-pair" lang="ja-JP"><span><ruby>安<rt>あん</rt></ruby><ArrowRight size={18}/>あ</span><span><ruby>阿<rt>あ</rt></ruby><ArrowRight size={18}/>ア</span></div>
      <p>{tr('Hiragana developed from cursive kanji; katakana from parts of kanji. These arrows show the relationship, not intermediate historical forms.',
        '平假名来自汉字草写，片假名来自汉字的一部分。箭头表示字源关系，不代表中间的古代字形。')}</p>
      <a href="https://www.irodori.jpf.go.jp/assets/data/starter/pdf/X_L03_au.pdf" target="_blank" rel="noreferrer">The Japan Foundation · Irodori</a>
    </details>
    <small className="stroke-license"><a href="https://github.com/KanjiVG/kanjivg" target="_blank" rel="noreferrer">KanjiVG</a> · Ulrich Apel & contributors · <a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noreferrer">CC BY-SA 3.0</a></small>
  </section>;
}
