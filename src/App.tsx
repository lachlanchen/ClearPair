import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  ArrowLeft,
  ArrowRight,
  AudioLines,
  BookOpen,
  Check,
  ChevronDown,
  Download,
  Headphones,
  History,
  Languages,
  Mic,
  Pause,
  Play,
  Repeat2,
  RotateCcw,
  ShieldCheck,
  Square,
  Star,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { Capacitor } from "@capacitor/core";
import { audioKey, lessonById, productById, products } from "./curriculum";
import type {
  Analysis,
  Lesson,
  Locale,
  Take,
  TakeMeta,
  Text,
  Word,
} from "./types";
import { Player, type Clip } from "./player";
import { Recorder } from "./recorder";
import { inspectRecording, unavailableAnalysis } from "./analysis";
import { shareNativeRecording } from "./export";
import { Challenge } from './Challenge';
import { LearnMotion } from './LearnMotion';
import { completeGame, readGame, saveGame } from './game';
import {
  deleteTake,
  getTake,
  listTakes,
  saveTake,
  type Cursor,
} from "./storage";
import {
  emptyProgress,
  priority,
  readProgress,
  review,
  storeProgress,
} from "./review";

type Tab = "learn" | "listen" | "practice" | "history";
type Recording = "idle" | "starting" | "recording" | "saving";
const product = productById(__APP_ID__),
  progressKey = `clearpair:${product.id}:progress:v1`;
const courses = product.lessons.map(lessonById);
const gameKey = `clearpair:${product.id}:game:v1`;
function initialLocale(): Locale {
  try {
    return localStorage.getItem("clearpair:locale") === "zh-Hans"
      ? "zh-Hans"
      : "en";
  } catch {
    return "en";
  }
}

export function App() {
  const [locale, setLocale] = useState<Locale>(initialLocale),
    [tab, setTab] = useState<Tab>("learn");
  const [gameOpen, setGameOpen] = useState(false),
    [gameProgress, setGameProgress] = useState(() => readGame(gameKey));
  const [lessonId, setLessonId] = useState(product.lessons[0]),
    [pairIndex, setPairIndex] = useState(0),
    [side, setSide] = useState<0 | 1>(0);
  const [picker, setPicker] = useState(false),
    [progress, setProgress] = useState(() => readProgress(progressKey));
  const [active, setActive] = useState<string | null>(null),
    [loop, setLoop] = useState(false),
    [slow, setSlow] = useState(false),
    [context, setContext] = useState(false);
  const [audioQuiz, setAudioQuiz] = useState(false);
  const [message, setMessage] = useState(""),
    [recording, setRecording] = useState<Recording>("idle"),
    [seconds, setSeconds] = useState(0),
    [meter, setMeter] = useState<number[]>(Array(64).fill(0));
  const [take, setTake] = useState<Take>(),
    [analysis, setAnalysis] = useState<Analysis>(),
    [answer, setAnswer] = useState<0 | 1 | null>(null),
    [target, setTarget] = useState<0 | 1>(() => (Math.random() < 0.5 ? 0 : 1)),
    [heard, setHeard] = useState(false);
  const [history, setHistory] = useState<TakeMeta[]>([]),
    [more, setMore] = useState(false),
    [historyLoading, setHistoryLoading] = useState(false),
    [storageWarning, setStorageWarning] = useState(false);
  const cursor = useRef<Cursor | undefined>(undefined),
    historyRequest = useRef(0),
    generation = useRef(0),
    recordingState = useRef<Recording>("idle");
  const player = useRef<Player | null>(null),
    recorder = useRef(new Recorder()),
    timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined),
    limit = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hold = useRef<ReturnType<typeof setTimeout> | undefined>(undefined),
    longPress = useRef(false),
    clips = useRef<Record<string, string>>({});
  const lesson = lessonById(lessonId),
    pair = lesson.pairs[pairIndex],
    word = pair[side],
    busy = recording !== "idle",
    visual =
      lesson.quizMode === "visual" && !(lesson.allowAudioQuiz && audioQuiz);
  const tr = (en: string, zh: string) => (locale === "en" ? en : zh),
    txt = (v: Text) => (locale === "en" ? v.en : v.zh);
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: !Capacitor.isNativePlatform(),
    onRegisterError: () => {},
  });
  if (!player.current)
    player.current = new Player((key, repeating) => {
      setActive(key);
      setLoop(repeating);
    });
  const fail = (error: unknown) =>
    setMessage(
      error instanceof Error
        ? error.message
        : tr("Something went wrong. Please retry.", "操作失败，请重试。"),
    );
  useEffect(() => {
    document.title = `ClearPair ${product.name} · Practise what you mix up`;
    fetch(`${import.meta.env.BASE_URL}audio/manifest.json`)
      .then((r) => (r.ok ? r.json() : {}))
      .then((data) => {
        clips.current = data;
      })
      .catch(() => {});
    if (typeof speechSynthesis !== "undefined") speechSynthesis.getVoices();
    const hidden = () => {
      if (document.hidden) {
        player.current?.stop();
        if (recordingState.current === "recording") void finishRef.current();
        else if (recordingState.current === "starting") void cancelRecording();
      }
    };
    document.addEventListener("visibilitychange", hidden);
    return () => {
      document.removeEventListener("visibilitychange", hidden);
      generation.current++;
      player.current?.stop();
      void recorder.current.cancel();
      clearInterval(timer.current);
      clearTimeout(limit.current);
      clearTimeout(hold.current);
    };
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale;
    try {
      localStorage.setItem("clearpair:locale", locale);
    } catch {}
  }, [locale]);
  function clip(w: Word, sentence = false): Clip {
    const key = audioKey(w, lesson.language) + (sentence ? "-context" : "");
    return {
      key,
      text: sentence ? w.sentence : w.spoken || w.text,
      language: lesson.language,
      url: clips.current[key]
        ? `${import.meta.env.BASE_URL}audio/${clips.current[key]}`
        : undefined,
    };
  }
  function playWords(words: Word[], repeat = false, sentence = context) {
    if (busy) return;
    generation.current++;
    setMessage("");
    void player
      .current!.play(
        words.map((w) => clip(w, sentence)),
        repeat,
        slow ? 0.8 : 1,
      )
      .catch(fail);
  }
  function stop() {
    generation.current++;
    player.current!.stop();
  }
  function resetQuiz() {
    setAnswer(null);
    setTarget(Math.random() < 0.5 ? 0 : 1);
    setHeard(false);
  }
  function move(delta: number) {
    if (busy) return;
    stop();
    setPairIndex(
      (i) => (i + delta + lesson.pairs.length) % lesson.pairs.length,
    );
    setAnalysis(undefined);
    setTake(undefined);
    setMessage("");
    resetQuiz();
  }
  function selectLesson(id: string) {
    if (busy) return;
    stop();
    setGameOpen(false);
    setLessonId(id);
    setPairIndex(0);
    setSide(0);
    setAudioQuiz(false);
    setPicker(false);
    setMessage("");
    setTake(undefined);
    setAnalysis(undefined);
    resetQuiz();
  }
  function selectTab(next: Tab) {
    if (busy) return;
    stop();
    setGameOpen(false);
    setTab(next);
    setMessage("");
    if (next === "history") void loadHistory(true);
  }
  function updateProgress(next: typeof progress) {
    setProgress(next);
    if (!storeProgress(progressKey, next)) setStorageWarning(true);
  }
  function startChallenge() {
    if (busy || lesson.quizMode === 'none') return;
    stop(); setMessage(''); setPicker(false); setTab('listen'); setGameOpen(true);
  }
  async function question() {
    stop();
    setMessage("");
    setHeard(false);
    const run = ++generation.current;
    try {
      await player.current!.play(
        [clip(pair[target], false)],
        false,
        slow ? 0.8 : 1,
      );
      if (run === generation.current) setHeard(true);
    } catch (error) {
      fail(error);
    }
  }
  function respond(choice: 0 | 1) {
    if (answer !== null || (!visual && !heard)) return;
    setAnswer(choice);
    const now = Date.now();
    updateProgress({
      ...progress,
      [lesson.id]: review(progress[lesson.id], choice === target, now),
      [`${lesson.id}/${visual ? "visual" : "listen"}/${pairIndex}`]: review(
        progress[`${lesson.id}/${visual ? "visual" : "listen"}/${pairIndex}`],
        choice === target,
        now,
      ),
    });
  }
  function nextQuestion() {
    stop();
    const candidates = lesson.pairs.map(
      (_, i) => `${lesson.id}/${visual ? "visual" : "listen"}/${i}`,
    );
    const ordered = priority(candidates, progress);
    const next =
      ordered.find((id) => Number(id.split("/").at(-1)) !== pairIndex) ||
      ordered[0];
    setPairIndex(Number(next.split("/").at(-1)));
    resetQuiz();
  }
  async function begin() {
    if (recordingState.current !== "idle") return;
    stop();
    setMessage("");
    setAnalysis(undefined);
    setTake(undefined);
    setMeter(Array(64).fill(0));
    setSeconds(0);
    const run = ++generation.current;
    recordingState.current = "starting";
    setRecording("starting");
    try {
      await recorder.current.start((rms) =>
        setMeter((v) => [...v.slice(1), Math.min(1, rms * 5)]),
      );
      if (run !== generation.current) return;
      recordingState.current = "recording";
      setRecording("recording");
      const start = Date.now();
      timer.current = setInterval(
        () => setSeconds((Date.now() - start) / 1000),
        100,
      );
      limit.current = setTimeout(() => void finishRef.current(), 12_000);
    } catch (error) {
      if (run === generation.current) {
        fail(error);
        recordingState.current = "idle";
        setRecording("idle");
      }
    }
  }
  async function cancelRecording() {
    generation.current++;
    await recorder.current.cancel();
    recordingState.current = "idle";
    setRecording("idle");
    clearInterval(timer.current);
    clearTimeout(limit.current);
  }
  async function finish() {
    if (recordingState.current !== "recording") return;
    recordingState.current = "saving";
    setRecording("saving");
    clearInterval(timer.current);
    clearTimeout(limit.current);
    try {
      const audio = await recorder.current.stop();
      const entry: Take = {
        id: crypto.randomUUID(),
        app: product.id,
        lesson: lesson.id,
        word: word.text,
        prompt: context ? word.sentence : word.text,
        language: lesson.language,
        createdAt: Date.now(),
        mimeType: audio.type,
        audio,
        analysis: unavailableAnalysis(seconds),
      };
      // Preserve capture before either analysis or durable storage can fail.
      setTake({ ...entry, storage: "session" });
      entry.analysis = await inspectRecording(audio, seconds);
      setAnalysis(entry.analysis);
      setTake({ ...entry, storage: "session" });
      const saved = await saveTake(entry);
      setTake({ ...entry, storage: saved });
      if (saved === "session") setStorageWarning(true);
      updateProgress({
        ...progress,
        [lesson.id]: {
          ...(progress[lesson.id] || emptyProgress()),
          recordings: (progress[lesson.id]?.recordings || 0) + 1,
        },
      });
    } catch (error) {
      fail(error);
    } finally {
      recordingState.current = "idle";
      setRecording("idle");
    }
  }
  const finishRef = useRef(finish);
  finishRef.current = finish;
  async function loadHistory(reset = false) {
    if (historyLoading) return;
    const request = ++historyRequest.current;
    setHistoryLoading(true);
    try {
      const page = await listTakes(
        product.id,
        reset ? undefined : cursor.current,
      );
      if (request !== historyRequest.current) return;
      setHistory((rows) => (reset ? page.items : [...rows, ...page.items]));
      cursor.current = page.next;
      setMore(page.more);
      if (page.temporary) setStorageWarning(true);
    } catch (error) {
      fail(error);
    } finally {
      if (request === historyRequest.current) setHistoryLoading(false);
    }
  }
  async function replay(id: string) {
    try {
      const t = await getTake(id);
      if (!t)
        throw new Error(
          tr("Recording is no longer available.", "录音已不可用。"),
        );
      await player.current!.blob(t.audio);
    } catch (error) {
      fail(error);
    }
  }
  async function download(t: Take | TakeMeta) {
    try {
      const full = "audio" in t ? t : await getTake(t.id);
      if (!full) throw new Error("Recording not found");
      const ext = full.mimeType.includes("mp4")
          ? "m4a"
          : full.mimeType.includes("wav")
            ? "wav"
            : "webm",
        file = new File(
          [full.audio],
          `clearpair-${new Date(full.createdAt).toISOString().replace(/[:.]/g, "-")}.${ext}`,
          { type: full.mimeType },
        );
      if (Capacitor.isNativePlatform()) {
        await shareNativeRecording(file);
        return;
      }
      const url = URL.createObjectURL(file),
        link = document.createElement("a");
      link.href = url;
      link.download = file.name;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 15_000);
    } catch (error) {
      fail(error);
    }
  }
  async function remove(t: TakeMeta) {
    if (
      !confirm(
        tr(
          `Delete the recording “${t.word}”? This cannot be undone.`,
          `删除“${t.word}”的录音？此操作不可撤销。`,
        ),
      )
    )
      return;
    try {
      stop();
      await deleteTake(t.id);
      setHistory((rows) => rows.filter((r) => r.id !== t.id));
    } catch (error) {
      fail(error);
    }
  }
  const total = Object.entries(progress)
    .filter(([k]) => !k.includes("/"))
    .reduce(
      (s, [, p]) => ({
        attempts: s.attempts + p.attempts,
        correct: s.correct + p.correct,
      }),
      { attempts: 0, correct: 0 },
    );
  const status = analysis
    ? {
        clear: tr(
          "Clear signal. Listen back and compare the contrast.",
          "信号清晰，回放并比较区别。",
        ),
        quiet: tr(
          "A quiet recording. Move a little closer and try again.",
          "录音偏轻，请靠近一些重试。",
        ),
        silent: tr(
          "No clear speech detected. Check the microphone before retrying.",
          "未检测到清晰语音，请检查麦克风再试。",
        ),
        clipped: tr(
          "The recording is distorted. Move a little farther away.",
          "录音出现失真，请离麦克风远一些。",
        ),
        unavailable: tr(
          "Analysis is unavailable for this take. Your original recording is still available below.",
          "暂时无法分析这段录音，原始录音仍可在下方回放和导出。",
        ),
      }[analysis.status]
    : tr(
        "Your voice stays on this device. Record up to 12 seconds.",
        "声音保留在此设备上，每次最多录制 12 秒。",
      );
  const pairButton = (
    <button
      className="pair-play"
      disabled={busy}
      onPointerDown={() => {
        longPress.current = false;
        hold.current = setTimeout(() => {
          longPress.current = true;
          playWords(pair, true);
        }, 600);
      }}
      onPointerUp={() => clearTimeout(hold.current)}
      onPointerLeave={() => clearTimeout(hold.current)}
      onPointerCancel={() => clearTimeout(hold.current)}
      onClick={() => {
        if (!longPress.current) playWords(pair);
        longPress.current = false;
      }}
    >
      <Play size={17} />
      {tr("Hear the pair", "连读词对")}
    </button>
  );

  return (
    <div
      className={`app ${tab === "learn" ? "" : "focused"}`}
      data-product={product.id}
      style={{ "--accent": product.accent } as CSSProperties}
    >
      <header className="topbar">
        <a
          className="brand"
          href={
            Capacitor.isNativePlatform()
              ? "https://language-agent.lazying.art/"
              : "../"
          }
          aria-label="ClearPair home"
        >
          <img className="brand-icon" src={`${import.meta.env.BASE_URL}icons/icon-192.png`} alt="" width="42" height="42"/>
          <span>
            ClearPair<small>{product.name}</small>
          </span>
        </a>
        <button
          className="language"
          onClick={() => setLocale(locale === "en" ? "zh-Hans" : "en")}
          aria-label={tr("Switch UI to Chinese", "切换界面为英文")}
        >
          <Languages size={18} />
          {locale === "en" ? "中文" : "EN"}
        </button>
      </header>
      <main>
        <section className="intro">
          <div>
            <p className="eyebrow">
              {product.name} <span> / {tr("FIND YOUR SOUND", "找到你的声音")}</span>
            </p>
            <h1>
              {tr("Small difference.", "小小区别，")}
              <br />
              <em>{tr("Different meaning.", "不同意义。")}</em>
            </h1>
            <p>
              {tr(
                "Practise what you mix up. Learn the difference.",
                "专练易混的部分，真正分清区别。",
              )}
            </p>
          </div>
          <img className="identity" src={`${import.meta.env.BASE_URL}icons/icon-192.png`} alt="" width="130" height="130"/>
        </section>
        <div className="course-row">
          <button
            className="course-select"
            disabled={busy}
            onClick={() => setPicker(!picker)}
            aria-expanded={picker}
          >
            <span>
              <small>
                {tr("YOUR FOCUS", "当前重点")} ·{" "}
                {lesson.language === "en-US"
                  ? "English"
                  : lesson.language === "zh-CN"
                    ? "普通话"
                    : lesson.language === 'zh-HK'
                      ? '粵語 · Jyutping'
                    : lesson.language === "ko-KR"
                      ? "한국어"
                      : "العربية"}
              </small>
              <strong>{txt(lesson.title)}</strong>
            </span>
            <ChevronDown size={20} />
          </button>
          <button
            className="review-next"
            disabled={busy}
            onClick={() => selectLesson(priority(product.lessons, progress)[0])}
            title={tr("Review due contrasts first", "优先复习到期对比")}
          >
            <RotateCcw size={17} />
            {tr("Review", "复习")}
          </button>
        </div>
        {picker && (
          <section
            className="lesson-picker"
            aria-label={tr("Choose a contrast", "选择对比")}
          >
            <p>
              {tr(
                "Focus on a difference, not a long word list.",
                "专注区别，不只是长长的词表。",
              )}
            </p>
            {courses.map((l) => (
              <button
                key={l.id}
                className={l.id === lesson.id ? "chosen" : ""}
                onClick={() => selectLesson(l.id)}
              >
                <span className="lesson-symbols">{l.sounds.join(" / ")}</span>
                <span>
                  {txt(l.title)}
                  <small>
                    {l.pairs.length} {tr("pairs", "组对比")}
                    {l.quizMode === "visual"
                      ? tr(" · visual recall", " · 视觉回忆")
                      : ""}
                  </small>
                </span>
                {progress[l.id]?.attempts ? (
                  <Check size={16} />
                ) : (
                  <ArrowRight size={16} />
                )}
              </button>
            ))}
          </section>
        )}
        <nav className="tabs" aria-label={tr("Practice sections", "练习区域")}>
          {(
            [
              { id: "learn", icon: BookOpen, en: "Learn", zh: "学习" },
              { id: "listen", icon: Headphones, en: "Listen", zh: "听辨" },
              { id: "practice", icon: Mic, en: "Practise", zh: "练习" },
              { id: "history", icon: History, en: "History", zh: "录音" },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              disabled={busy}
              onClick={() => selectTab(item.id)}
              aria-current={tab === item.id ? "page" : undefined}
            >
              <item.icon size={18} />
              {tr(item.en, item.zh)}
            </button>
          ))}
        </nav>

        {gameOpen && <Challenge key={lesson.id} lesson={lesson} player={player.current!} clip={clip} tr={tr}
          onExit={() => { stop(); setGameOpen(false); }}
          onPractice={() => selectTab('practice')}
          onAnswer={(index, correct, isVisual) => {
            const now = Date.now();
            const key = `${lesson.id}/${isVisual ? 'visual' : 'listen'}/${index}`;
            updateProgress({ ...progress, [lesson.id]: review(progress[lesson.id], correct, now), [key]: review(progress[key], correct, now) });
          }}
          onComplete={(answers) => {
            const next = completeGame(gameProgress, answers);
            setGameProgress(next);
            if (!saveGame(gameKey, next)) setStorageWarning(true);
          }} />}

        {tab === 'learn' && <section className="game-invite" aria-label={tr('Quick challenge', '小挑战')}>
          <div className="game-emblem"><Sparkles size={25}/></div>
          <div><h2>{tr('A little play. A clearer ear.', '玩一小会，听得更清。')}</h2>
            <p>{tr('5 questions. No timer. Just the tricky bits.', '五道题，不限时，专练易混点。')}</p>
            <span className="game-stars"><Star size={14}/>{gameProgress.stars} {tr('stars collected', '颗练习星星')}</span></div>
          <button className="primary" onClick={lesson.quizMode === 'none' ? () => selectTab('listen') : startChallenge}>
            {lesson.quizMode === 'none' ? tr('Explore pair', '探索词对') : tr('Play a round', '玩一轮')}<ArrowRight size={18}/>
          </button>
        </section>}

        {tab === "learn" && (
          <section className="learn-grid">
            <div className="panel visual-panel">
              <div className="section-label">
                <span>{tr("SEE THE DIFFERENCE", "看见区别")}</span>
                <span>01 / 03</span>
              </div>
              <Diagram lesson={lesson} txt={txt} />
              <h2>{txt(lesson.cue)}</h2>
              <p className="muted">
                {tr(
                  "A learning guide, not a measurement of your mouth.",
                  "学习示意，不是对你口腔的测量。",
                )}
              </p>
            </div>
            <div className="panel guidance">
              <div className="section-label">
                {tr("ONE CHANGE AT A TIME", "一次专注一个变化")}
              </div>
              {lesson.sides.map((s, i) => (
                <div className="cue" key={i}>
                  <button
                    onClick={() => {
                      setSide(i as 0 | 1);
                      playWords([pair[i]], false, false);
                    }}
                    aria-label={`${tr("Hear", "听")} ${pair[i].text}`}
                    className="sound-token"
                  >
                    {lesson.sounds[i]}
                  </button>
                  <p>{txt(s)}</p>
                </div>
              ))}
              <div className="tip">
                <span>✦</span>
                <p>{txt(lesson.tip)}</p>
              </div>
              {lesson.caution && (
                <p className="caution">{txt(lesson.caution)}</p>
              )}
              <button className="primary" onClick={() => selectTab("listen")}>
                {tr("Try the contrast", "试着分辨")}
                <ArrowRight size={18} />
              </button>
            </div>
          </section>
        )}

        {!gameOpen && (tab === "practice" || tab === "listen") && (
          <section className="panel work-panel">
            <div className="section-label">
              <span>
                {tab === "practice"
                  ? tr(
                      "SAY IT. LISTEN BACK. NOTICE.",
                      "说出来，回放，发现区别。",
                    )
                  : visual
                    ? tr("LOOK. RECALL. DISTINGUISH.", "观察，回忆，分清。")
                    : tr("LISTEN FOR THE DIFFERENCE", "听出细微差别")}
              </span>
              <span>
                {String(pairIndex + 1).padStart(2, "0")} /{" "}
                {String(lesson.pairs.length).padStart(2, "0")}
              </span>
            </div>
            {tab === "listen" && lesson.quizMode !== "none" && (
              <div className="quiz-prompt">
                {lesson.allowAudioQuiz && (
                  <div
                    className="small-controls"
                    role="group"
                    aria-label={tr("Practice skill", "练习技能")}
                  >
                    <button
                      aria-pressed={visual}
                      onClick={() => {
                        stop();
                        setAudioQuiz(false);
                        resetQuiz();
                      }}
                    >
                      {tr("Visual recall", "字形回忆")}
                    </button>
                    <button
                      aria-pressed={!visual}
                      onClick={() => {
                        stop();
                        setAudioQuiz(true);
                        resetQuiz();
                      }}
                    >
                      {tr("Listening", "听音辨认")}
                    </button>
                  </div>
                )}
                {visual ? (
                  <>
                    <small>
                      {tr(
                        "Find the matching letter or syllable",
                        "找到对应的字母或音节",
                      )}
                    </small>
                    <h2>{pair[target].gloss}</h2>
                  </>
                ) : (
                  <>
                    <button
                      className="listen-question"
                      onClick={() => void question()}
                      disabled={!!active}
                    >
                      <Headphones size={25} />
                      {lesson.allowAudioQuiz
                        ? tr("Play the mystery sound", "播放待辨音")
                        : tr("Play the mystery word", "播放待辨词")}
                    </button>
                    <small>
                      {tr(
                        "Listen first, then choose what you heard.",
                        "先听，再选择听到的词。",
                      )}
                    </small>
                  </>
                )}
              </div>
            )}
            <div className="pair-cards" lang={lesson.language}>
              {pair.map((w, i) => (
                <button
                  key={`${pairIndex}-${i}`}
                  className={`word-card ${side === i && tab === "practice" ? "selected" : ""} ${active === clip(w, context).key ? "speaking" : ""} ${answer !== null && target === i ? "correct" : ""} ${answer === i && answer !== target ? "incorrect" : ""}`}
                  disabled={
                    busy ||
                    (tab === "listen" &&
                      lesson.quizMode !== "none" &&
                      (answer !== null || (!heard && !visual)))
                  }
                  onClick={() => {
                    if (tab === "listen" && lesson.quizMode !== "none")
                      respond(i as 0 | 1);
                    else {
                      setSide(i as 0 | 1);
                      playWords([w]);
                    }
                  }}
                >
                  <span
                    className="word"
                    dir={lesson.language === "ar-SA" ? "rtl" : "auto"}
                  >
                    {w.text}
                  </span>
                  <span className="ipa" dir="ltr">
                    {w.ipa}
                  </span>
                  <small>
                    {tab === "listen" &&
                    answer === null &&
                    lesson.quizMode !== "none"
                      ? ""
                      : w.gloss || " "}
                  </small>
                  <span className="card-foot">
                    {tab === "practice"
                      ? i === side
                        ? tr("Your next recording", "下一次录音")
                        : tr("Tap to practise", "点击练习")
                      : lesson.quizMode === "none"
                        ? tr("Tap to hear", "点击聆听")
                        : tr("Choose", "选择")}
                    <AudioLines size={16} />
                  </span>
                </button>
              ))}
            </div>
            <div className="pair-navigation">
              <button
                className="icon-button"
                disabled={busy}
                onClick={() => move(-1)}
                aria-label={tr("Previous word pair", "上一组词")}
              >
                <ArrowLeft size={19} />
              </button>
              {pairButton}
              <button
                className="icon-button"
                disabled={busy}
                onClick={() => move(1)}
                aria-label={tr("Next word pair", "下一组词")}
              >
                <ArrowRight size={19} />
              </button>
            </div>
            <div className="small-controls">
              <button
                aria-pressed={slow}
                disabled={busy}
                onClick={() => setSlow(!slow)}
              >
                {tr("Slower audio", "慢速播放")}
              </button>
              <button disabled={busy} onClick={() => playWords(pair, true)}>
                <Repeat2 size={15} />
                {tr("Loop pair", "循环词对")}
              </button>
              {tab === "practice" && (
                <button
                  disabled={busy}
                  aria-pressed={context}
                  onClick={() => setContext(!context)}
                >
                  {tr("Use a sentence", "使用短句")}
                </button>
              )}
            </div>
            {tab === "practice" ? (
              <>
                <div
                  className="record-prompt"
                  lang={lesson.language}
                  dir={lesson.language === "ar-SA" ? "rtl" : "auto"}
                >
                  {context ? word.sentence : word.text}
                </div>
                <Waveform
                  values={
                    recording === "recording"
                      ? meter
                      : analysis?.waveform || Array(64).fill(0)
                  }
                  live={recording === "recording"}
                />
                <div className="record-controls">
                  <button
                    className={`record ${recording === "recording" ? "recording" : ""}`}
                    disabled={
                      recording === "saving" || recording === "starting"
                    }
                    onClick={() =>
                      void (recording === "recording" ? finish() : begin())
                    }
                  >
                    {recording === "recording" ? (
                      <Square size={19} />
                    ) : (
                      <Mic size={20} />
                    )}
                    <span>
                      {recording === "recording"
                        ? tr("Finish recording", "结束录音")
                        : recording === "saving"
                          ? tr("Saving…", "保存中…")
                          : recording === "starting"
                            ? tr("Opening microphone…", "正在打开麦克风…")
                            : tr("Record your voice", "录下你的声音")}
                    </span>
                  </button>
                  <span className="timer">{seconds.toFixed(1)} / 12s</span>
                </div>
                <div className="result-area" aria-live="polite">
                  <p>{status}</p>
                  <p className="muted">
                    {tr(
                      "Signal quality only—not a pronunciation score.",
                      "这里只评估信号质量，不是发音分数。",
                    )}
                  </p>
                  <div className="take-actions">
                    <button
                      disabled={!take || busy}
                      onClick={() =>
                        take &&
                        void player.current!.blob(take.audio).catch(fail)
                      }
                    >
                      <Play size={16} />
                      {tr("My recording", "我的录音")}
                    </button>
                    <button
                      disabled={!take || busy}
                      onClick={() => take && void download(take)}
                    >
                      <Download size={16} />
                      {tr("Export", "导出")}
                    </button>
                    <span>
                      {take?.storage === "device"
                        ? tr("Saved on device", "已保存到设备")
                        : take?.storage === "session"
                          ? tr(
                              "Temporary—export to keep",
                              "临时保存，请导出留存",
                            )
                          : ""}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="quiz-result" aria-live="polite">
                {lesson.quizMode === "none" ? (
                  <p>
                    {tr(
                      "Explore this contrast without a right/wrong test.",
                      "探索此对比，不作对错评分。",
                    )}
                  </p>
                ) : answer !== null ? (
                  <>
                    <div>
                      <strong>
                        {answer === target
                          ? tr("You found the difference.", "分辨正确。")
                          : tr(
                              "Listen to the difference once more.",
                              "再听一次区别。",
                            )}
                      </strong>
                      <p>
                        {tr("The answer was", "正确答案是")}{" "}
                        <bdi>{pair[target].text}</bdi> · {pair[target].ipa}
                      </p>
                    </div>
                    <button className="primary" onClick={nextQuestion}>
                      {tr("Next contrast", "下一组")}
                      <ArrowRight size={16} />
                    </button>
                  </>
                ) : (
                  <p>
                    {tr(
                      "No rush. The goal is to notice, not to guess quickly.",
                      "不用急，重点是发现区别，不是快速猜测。",
                    )}
                  </p>
                )}
              </div>
            )}
            <div className="practice-tip">
              <BookOpen size={17} />
              <p>{txt(lesson.tip)}</p>
            </div>
          </section>
        )}

        {tab === "history" && (
          <section className="panel history">
            <div className="section-label">
              <span>
                {tr("YOUR VOICE, YOUR PROGRESS", "你的声音，你的进步")}
              </span>
              <button
                className="text-button"
                onClick={() => void loadHistory(true)}
                disabled={historyLoading}
              >
                {tr("Refresh", "刷新")}
              </button>
            </div>
            <h2>
              {tr("Keep the attempt that clicked.", "留住说对的那一次。")}
            </h2>
            <p className="muted">
              {tr(
                "Recordings stay on this device. Export favourites before clearing app data or uninstalling.",
                "录音只保存在此设备。清除应用数据或卸载前，请导出喜欢的录音。",
              )}
            </p>
            {!history.length && !historyLoading && (
              <div className="empty">
                <AudioLines size={38} />
                <h3>
                  {tr(
                    "Your first recording belongs here.",
                    "第一条录音会出现在这里。",
                  )}
                </h3>
                <p>
                  {tr(
                    "Practise a pair, record your voice, then compare.",
                    "选择词对，录下声音，再回放比较。",
                  )}
                </p>
                <button
                  className="primary"
                  onClick={() => selectTab("practice")}
                >
                  {tr("Make a recording", "录一段声音")}
                  <Mic size={17} />
                </button>
              </div>
            )}
            {history.map((t) => (
              <article className="history-item" key={t.id}>
                <div>
                  <strong dir="auto">{t.word}</strong>
                  <small>
                    {new Date(t.createdAt).toLocaleString(locale)} ·{" "}
                    {t.analysis.seconds.toFixed(1)}s
                    {t.storage === "session"
                      ? tr(" · temporary", " · 临时")
                      : ""}
                  </small>
                </div>
                <button
                  className="icon-button"
                  onClick={() => void replay(t.id)}
                  aria-label={`${tr("Play recording", "播放录音")} ${t.word}`}
                >
                  <Play size={18} />
                </button>
                <button
                  className="icon-button"
                  onClick={() => void download(t)}
                  aria-label={`${tr("Export", "导出")} ${t.word}`}
                >
                  <Download size={18} />
                </button>
                <button
                  className="icon-button"
                  onClick={() => void remove(t)}
                  aria-label={`${tr("Delete", "删除")} ${t.word}`}
                >
                  <Trash2 size={17} />
                </button>
              </article>
            ))}
            {(more || historyLoading) && (
              <button
                className="load-more"
                disabled={historyLoading}
                onClick={() => void loadHistory()}
              >
                {historyLoading
                  ? tr("Loading…", "加载中…")
                  : tr("Load older recordings", "加载更早录音")}
              </button>
            )}
          </section>
        )}

        <div className={`playback-dock ${tab === 'learn' && !active ? 'dormant' : ''}`}>
          <div className={active ? "play-indicator active" : "play-indicator"}>
            <AudioLines size={18} />
            <span>
              {active
                ? loop
                  ? tr("Repeating until you stop", "循环播放，点停止结束")
                  : tr("Playing", "正在播放")
                : tr("Ready when you are", "随时开始")}
            </span>
          </div>
          <button disabled={!active} onClick={stop}>
            <Square size={15} />
            {tr("Stop", "停止")}
          </button>
        </div>
        <div className="notices" aria-live="polite">
          {message && (
            <div className="notice error">
              <p>{message}</p>
              <button
                onClick={() => setMessage("")}
                aria-label={tr("Dismiss message", "关闭消息")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {storageWarning && (
            <p className="notice">
              {tr(
                "Storage is limited or unavailable. Some recordings or progress may be temporary. Export recordings you want to keep.",
                "存储空间有限或不可用。部分录音或进度可能只是临时保存，请导出要保留的录音。",
              )}
            </p>
          )}
          {needRefresh && !Capacitor.isNativePlatform() && (
            <div className="notice">
              <p>
                {tr(
                  "An update is ready. Your recordings stay on this device.",
                  "有新版本可用，录音仍保存在此设备。",
                )}
              </p>
              <button
                disabled={busy || !!active}
                onClick={() => void updateServiceWorker(true)}
              >
                {tr("Update", "更新")}
              </button>
            </div>
          )}
        </div>
        <footer>
          <div>
            <ShieldCheck size={15} />
            {tr("No account. No recording uploads.", "无需账号，不上传录音。")}
          </div>
          <p>
            {tr(
              "Reference speech uses your device voice unless a bundled clip is available. Voice quality and offline availability vary.",
              "示范优先使用内置音频，否则使用设备语音；音质与离线可用性因设备而异。",
            )}
          </p>
          <p>
            {total.attempts
              ? `${total.correct} / ${total.attempts} ${tr("recall answers correct · not a pronunciation grade", "次回忆回答正确 · 不代表发音评分")}`
              : tr(
                  "Build a habit of hearing the difference.",
                  "养成留意区别的习惯。",
                )}
          </p>
          <details>
            <summary>
              {tr("The ClearPair family & privacy", "ClearPair 系列与隐私")}
            </summary>
            <div className="family-links">
              {products.map((p) => (
                <a
                  key={p.id}
                  href={`https://language-agent.lazying.art/${p.id}/`}
                >
                  {p.name}
                </a>
              ))}
            </div>
            <p>
              {tr(
                "Learning progress and microphone recordings are stored locally. The app does not send recordings to an AI service. Your device speech provider may use its network voice service. Clearing website/app data can remove your recordings. Export them to keep a backup. This is an educational tool, not speech therapy or a validated diagnostic assessment.",
                "学习进度与麦克风录音保存在本地，应用不会把录音发送给 AI 服务。设备语音提供商可能使用联网服务。清理网站或应用数据可能删除录音，请导出备份。本产品是学习工具，不是言语治疗或经验证的诊断评估。",
              )}
            </p>
            <p>
              ClearPair {__APP_VERSION__} ·{" "}
              <a href="mailto:support@lazying.art">support@lazying.art</a>
            </p>
          </details>
        </footer>
      </main>
    </div>
  );
}

function Waveform({ values, live }: { values: number[]; live: boolean }) {
  return (
    <svg
      className={`waveform ${live ? "live" : ""}`}
      viewBox="0 0 480 68"
      role="img"
      aria-label={live ? "Live microphone level" : "Recorded waveform"}
    >
      <line
        x1="0"
        y1="34"
        x2="480"
        y2="34"
        stroke="currentColor"
        opacity=".14"
      />
      {values.map((v, i) => (
        <line
          key={i}
          x1={((i + 0.5) * 480) / values.length}
          x2={((i + 0.5) * 480) / values.length}
          y1={34 - Math.max(1, Math.min(1, v) * 30)}
          y2={34 + Math.max(1, Math.min(1, v) * 30)}
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}
function Diagram({
  lesson,
  txt,
}: {
  lesson: Lesson;
  txt: (v: Text) => string;
}) {
  const [animate, setAnimate] = useState(false);
  if (['lr-start', 'lr-more', 'lr-clusters', 'hf-en', 'hf-zh', 'yue-b-p', 'b-p'].includes(lesson.id))
    return <LearnMotion key={lesson.id} lesson={lesson} txt={txt}/>;
  if (lesson.diagram === "vowel" && lesson.positions)
    return (
      <div className={`diagram vowel-diagram ${animate ? 'motion-on' : ''}`}>
        <svg
          viewBox="0 0 340 240"
          role="img"
          aria-label="Relative tongue height and backness: schematic vowel positions"
        >
          <path d="M55 35H285L270 190H120Z" className="vowel-shape" />
          <path
            d="M75 86H280M97 140H276M165 35L197 190"
            className="grid-lines"
          />
          <text x="54" y="20">
            front
          </text>
          <text x="255" y="20">
            back
          </text>
          <text x="7" y="43">
            high
          </text>
          <text x="12" y="197">
            low
          </text>
          {lesson.positions.map(([x, y], i) => (
            <g key={i} transform={`translate(${50 + x * 2.5} ${32 + y * 1.7})`}>
              <circle r="20" className={i ? "dot secondary" : "dot"} />
              <text textAnchor="middle" dy="6" className="vowel-label">
                {lesson.sounds[i]}
              </text>
            </g>
          ))}
        </svg>
        <button className="motion-toggle" aria-pressed={animate} onClick={() => setAnimate(!animate)}>{animate ? <Pause size={14}/> : <Play size={14}/>} {txt({en: 'Compare positions', zh: '比较舌位'})}</button>
      </div>
    );
  if (lesson.diagram === "tone" && lesson.tones)
    return (
      <div className={`diagram tone-diagram ${animate ? 'motion-on' : ''}`}>
        <svg
          viewBox="0 0 340 240"
          role="img"
          aria-label="Schematic relative tone contours"
        >
          <path d="M40 30V195H310M40 110H310" className="grid-lines" />
          {lesson.tones.map((points, i) => (
            <g key={i}>
              <polyline
                pathLength="1"
                points={points
                  .map(
                    (v, j) =>
                      `${55 + (j * 230) / (points.length - 1)},${185 - v * 145}`,
                  )
                  .join(" ")}
                fill="none"
                stroke={i ? "var(--contrast)" : "var(--accent)"}
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <text x={65 + i * 130} y="226">
                {lesson.sounds[i]}
              </text>
            </g>
          ))}
        </svg>
        <button className="motion-toggle" aria-pressed={animate} onClick={() => setAnimate(!animate)}>{animate ? <Pause size={14}/> : <Play size={14}/>} {txt({en: 'Trace the tones', zh: '观察声调走向'})}</button>
      </div>
    );
  return (
    <div
      className={`contrast-diagram ${lesson.diagram === "glyph" ? "script-diagram" : ""}`}
      aria-label={txt(lesson.title)}
    >
      <span lang={lesson.language} dir="auto">
        {lesson.sounds[0]}
      </span>
      <span className="contrast-arrow">↔</span>
      <span lang={lesson.language} dir="auto">
        {lesson.sounds[1]}
      </span>
      <div className="diagram-caption">
        {lesson.diagram === "air"
          ? "airflow & release"
          : lesson.diagram === "glyph"
            ? "notice · recall · compare"
            : "position · contact · voicing"}
      </div>
    </div>
  );
}
