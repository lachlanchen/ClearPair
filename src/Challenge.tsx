import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Headphones, Play, RotateCcw, Star, Trophy, X } from 'lucide-react';
import type { Lesson, Word } from './types';
import type { Clip, Player } from './player';
import { createChallenge, starsFor } from './game';
import { needsVoiceInstallation } from './ui-errors';

export function Challenge({ lesson, player, clip, tr, onExit, onAnswer, onComplete, onPractice }: {
  lesson: Lesson; player: Player; clip: (word: Word, sentence?: boolean) => Clip;
  tr: (en: string, zh: string) => string; onExit: () => void;
  onAnswer: (pair: number, correct: boolean, visual: boolean) => void;
  onComplete: (answers: boolean[]) => void; onPractice: () => void;
}) {
  const [deck, setDeck] = useState(() => createChallenge(lesson.pairs.length));
  const [round, setRound] = useState(0), [answers, setAnswers] = useState<boolean[]>([]);
  const [choice, setChoice] = useState<0 | 1 | null>(null), [heard, setHeard] = useState(false);
  const [playing, setPlaying] = useState(false), [error, setError] = useState(''), [done, setDone] = useState(false);
  const run = useRef(0), answered = useRef(false), awarded = useRef(false);
  const question = deck[round], pair = lesson.pairs[question.pair];
  const visual = lesson.quizMode === 'visual';
  const correct = answers.filter(Boolean).length;
  useEffect(() => () => { run.current++; player.stop(); }, [player]);
  async function listen(words = [pair[question.target]]) {
    const token = ++run.current;
    setError(''); setPlaying(true);
    try {
      const completed = await player.play(words.map((word) => clip(word, false)));
      if (completed && token === run.current) setHeard(true);
    } catch (error) {
      if (token === run.current) setError(needsVoiceInstallation(error)
        ? tr('Install a voice for the practice language in device settings, then reopen the app.', '请在设备设置中安装练习语言的语音，然后重新打开应用。') + ` (${lesson.language})`
        : tr('Playback is unavailable. Check sound and installed voices, then retry.', '播放不可用。请检查音量和已安装的语音，然后重试。'));
    } finally { if (token === run.current) setPlaying(false); }
  }
  function respond(value: 0 | 1) {
    if (answered.current || playing || (!visual && !heard)) return;
    answered.current = true;
    setChoice(value);
    setAnswers((rows) => [...rows, value === question.target]);
    onAnswer(question.pair, value === question.target, visual);
  }
  function next() {
    if (!answered.current) return;
    run.current++; player.stop(); setPlaying(false); setError('');
    if (round === 4) {
      if (!awarded.current) { awarded.current = true; onComplete(answers); }
      setDone(true);
    } else {
      setRound(round + 1); setChoice(null); setHeard(false); answered.current = false;
    }
  }
  function restart() {
    run.current++; player.stop(); setDeck(createChallenge(lesson.pairs.length));
    setRound(0); setAnswers([]); setChoice(null); setHeard(false); setDone(false); setError('');
    answered.current = false; awarded.current = false;
  }
  return <section className="panel challenge" aria-label={tr('Five-question challenge', '五題挑戰')}>
    <div className="challenge-top"><span className="eyebrow">{tr('SPOT THE DIFFERENCE', '找出區別')}</span>
      <button className="icon-button" aria-label={tr('Leave challenge', '離開挑戰')} onClick={onExit}><X size={20}/></button></div>
    <div className="round-track" aria-label={`${answers.length} / 5`}>
      {deck.map((_, i) => <span key={i} className={i < answers.length ? answers[i] ? 'won' : 'tried' : i === round ? 'current' : ''}/>)}
    </div>
    {done ? <div className="challenge-finish" aria-live="polite">
      <div className="prize"><Trophy size={46}/></div>
      <div className="earned-stars" aria-label={`${starsFor(correct)} ${tr('stars collected','颗练习星星')}`}>{[1,2,3].map((n) => <Star key={n} size={34} fill={n <= starsFor(correct) ? 'currentColor' : 'none'}/>)}</div>
      <h2>{tr('A little clearer.', '又清楚了一點。')}</h2>
      <p>{correct} / 5 {tr('answers correct', '題答對')} · {tr('Round complete', '完成一輪')}</p>
      <p className="muted">{tr('Stars celebrate listening and recall—not a pronunciation grade.', '星星代表聽辨與回憶練習，不是發音評分。')}</p>
      <div className="finish-actions"><button className="primary" onClick={restart}><RotateCcw size={18}/>{tr('Play another round', '再玩一輪')}</button>
      <button className="secondary-button" onClick={onPractice}>{tr('Now try saying it', '試著說出來')}<ArrowRight size={17}/></button></div>
    </div> : <>
      <div className="challenge-heading"><p>{tr('ROUND', '第')} {round + 1} / 5</p><h2>{visual ? tr('Which one matches?', '哪一個相符？') : tr('What did you hear?', '你聽到哪個？')}</h2>
        <p>{tr('Take your time. Replays are free.', '慢慢來，可以重聽。')}</p></div>
      <div className="challenge-question">{visual ? <strong>{pair[question.target].gloss}</strong> : <button className="listen-question" disabled={playing} onClick={() => void listen()}><Headphones size={23}/>{tr('Play mystery sound', '播放待辨音')}</button>}</div>
      <div className="pair-cards" lang={lesson.language}>{pair.map((w, i) => <button key={i}
        className={`word-card ${choice !== null && question.target === i ? 'correct' : ''} ${choice === i && choice !== question.target ? 'incorrect' : ''}`}
        disabled={choice !== null || playing || (!visual && !heard)} onClick={() => respond(i as 0 | 1)}>
        <span className="word" dir={lesson.language === 'ar-SA' ? 'rtl' : 'auto'}>{w.text}</span><span className="ipa" dir="ltr">{w.ipa}</span>
        <span className="card-foot">{tr('Choose', '選擇')}<span>{i + 1}</span></span>
      </button>)}</div>
      <div className="challenge-feedback" aria-live="polite">{choice === null ? <p>{tr('One small difference. A new meaning.', '一點區別，不同意思。')}</p> : <>
        <strong>{choice === question.target ? tr('You caught it!', '你分清了！') : tr('A useful discovery.', '又有新發現。')}</strong>
        <p>{tr('The answer was', '答案是')} <bdi>{pair[question.target].text}</bdi> · {pair[question.target].ipa}</p>
      </>}</div>
      <div className="challenge-actions"><button className="secondary-button" disabled={playing || choice === null} onClick={() => void listen(pair)}><Play size={17}/>{tr('Compare pair', '比較詞對')}</button>
        <button className="primary" disabled={choice === null} onClick={next}>{round === 4 ? tr('See results', '看看成果') : tr('Continue', '繼續')}<ArrowRight size={17}/></button></div>
      <div className="challenge-error" role="status">{error}</div>
    </>}
  </section>;
}
