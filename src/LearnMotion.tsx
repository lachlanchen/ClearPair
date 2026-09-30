import { useState } from 'react';
import { Play, Pause } from 'lucide-react';
import type { Lesson, Text } from './types';

/** Deliberately schematic. These are contrast cues, never a measured mouth model. */
export function LearnMotion({ lesson, txt }: { lesson: Lesson; txt: (t: Text) => string }) {
  const [moving, setMoving] = useState(false);
  const lr = ['lr-start', 'lr-more', 'lr-clusters'].includes(lesson.id);
  const hf = lesson.id === 'hf-en' || lesson.id === 'hf-zh';
  const aspiration = lesson.id === 'yue-b-p' || lesson.id === 'b-p';
  if (!lr && !hf && !aspiration) return null;
  return <div className={`mouth-study ${moving ? 'moving' : ''}`}>
    <div className="mouth-pair">{[0,1].map((side) => {
      const lip = hf && side === 1;
      const back = lesson.id === 'hf-zh' && side === 0;
      return <div key={side}>
        <svg viewBox="0 0 180 158" role="img" aria-label={txt(lesson.sides[side])}>
          {/* Facing right: roof above, tongue below, front teeth to the right. */}
          <path className="mouth-roof" d="M24 76 Q52 29 112 39 Q133 42 143 61"/>
          <path className="mouth-jaw" d="M24 113 Q63 139 111 116 Q129 107 147 105"/>
          <path className="tooth" d="M126 45 L139 52 L139 76 L128 73 Z"/>
          <path className="tongue-shape" d={lr ? side === 0
            ? 'M28 107 Q69 103 99 76 Q111 55 125 51 Q129 56 124 67 Q103 117 45 119Z'
            : 'M28 107 Q62 57 90 70 Q107 78 115 90 Q95 107 50 119Z'
            : back ? 'M28 93 Q42 42 60 50 Q66 78 114 100 L114 111 Q62 118 28 109Z'
            : 'M28 107 Q65 91 110 101 L117 111 Q72 124 28 117Z'}/>
          {lip ? <path className="lip-contact" d="M112 102 Q129 72 143 77 Q153 83 150 91"/>
            : <path className="lip-contact" d="M131 108 Q147 103 152 109"/>}
          {lr && side === 0 && <circle cx="124" cy="54" r="5" className="contact-point"/>}
          {!lr && <g className={`air-stream ${aspiration && side === 0 ? 'soft-air' : ''}`}>
            <path d="M143 87h27"/><path d="M149 95h18"/><path d="M152 79h15"/>
          </g>}
          {lr && side === 1 && <path className="gap-mark" d="M106 57v17m-4-13 4-4 4 4m-8 9 4 4 4-4"/>}
        </svg>
        <strong>{lesson.sounds[side]}</strong>
        <small>{txt(lr ? side === 0
          ? {en: 'tip contact', zh: '舌尖接触'} : {en: 'one bunched-R shape', zh: 'R 的一种拱舌形态'}
          : lip ? {en: 'teeth + lower lip', zh: '上齿 + 下唇'}
          : back ? {en: 'friction farther back', zh: '摩擦在后方'}
          : aspiration ? side === 0 ? {en: 'less aspiration', zh: '送气较少'} : {en: 'more aspiration', zh: '送气较强'}
          : {en: 'open breath', zh: '轻轻呼气'})}</small>
      </div>;
    })}</div>
    <button className="motion-toggle" onClick={() => setMoving(!moving)} aria-pressed={moving}>
      {moving ? <Pause size={14}/> : <Play size={14}/>}{txt({en: moving ? 'Pause illustration' : 'Animate the cue', zh: moving ? '暂停示意' : '播放示意'})}
    </button>
    <p>{txt(aspiration ? {en: 'After lip release · schematic, not to scale', zh: '双唇放开之后 · 非等比例示意'} : {en: 'Schematic side view · not to scale', zh: '侧面示意 · 非等比例'})}</p>
  </div>;
}
