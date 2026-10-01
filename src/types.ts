export type AppId =
  | "handf"
  | "landr"
  | "english"
  | "chinese"
  | "korean"
  | "cantonese"
  | "arabic";
export type Locale = "en" | "ar" | "es" | "fr" | "ja" | "ko" | "vi" | "zh-Hans" | "zh-Hant" | "de" | "ru";
export type Language = "en-US" | "zh-CN" | "zh-HK" | "ko-KR" | "ar-SA";
export type Text = { en: string; zh: string; hant?: string };
export type Diagram = "vowel" | "air" | "tongue" | "tone" | "glyph";
export interface Word {
  text: string;
  ipa: string;
  gloss?: string;
  sentence: string;
  sentenceReading?: string;
  audioKey?: string;
  spoken?: string;
}
export interface Lesson {
  id: string;
  language: Language;
  group: string;
  title: Text;
  sounds: [string, string];
  cue: Text;
  sides: [Text, Text];
  tip: Text;
  pairs: [Word, Word][];
  diagram: Diagram;
  positions?: [[number, number], [number, number]];
  tones?: [number[], number[]];
  caution?: Text;
  difficulty: 1 | 2 | 3;
  quizMode?: "listen" | "visual" | "none";
  allowAudioQuiz?: boolean;
}
export interface Product {
  id: AppId;
  name: string;
  zhName: string;
  mark: string;
  accent: string;
  blurb: Text;
  lessons: string[];
}
export interface Signal {
  rms: number;
  peaks: number[];
}
export interface Analysis {
  seconds: number;
  rms: number;
  peak: number;
  clipped: number;
  voicedSeconds: number;
  waveform: number[];
  pitch: (number | null)[];
  status: "clear" | "quiet" | "silent" | "clipped" | "unavailable";
}
export interface Take {
  id: string;
  app: AppId;
  lesson: string;
  word: string;
  prompt: string;
  language: Language;
  createdAt: number;
  mimeType: string;
  audio: Blob;
  analysis: Analysis;
  storage?: "device" | "session";
}
export type TakeMeta = Omit<Take, "audio">;
export interface LessonProgress {
  attempts: number;
  correct: number;
  recordings: number;
  last: number;
  nextDue: number;
  streak: number;
}
