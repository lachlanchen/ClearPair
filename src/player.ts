import { hasNativeAudio, nativeAudio } from "./native";
import type { Language } from "./types";
export type Clip = {
  text: string;
  language: Language;
  key: string;
  url?: string;
};
export class Player {
  private generation = 0;
  private cancel: () => void = () => {};
  private activeAudio: HTMLAudioElement | undefined;
  constructor(private changed: (key: string | null, loop: boolean) => void) {}
  stop() {
    this.generation++;
    this.cancel();
    this.cancel = () => {};
    this.activeAudio?.pause();
    this.activeAudio = undefined;
    if (hasNativeAudio()) void nativeAudio.stopSpeech().catch(() => {});
    else if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
    this.changed(null, false);
  }
  async play(clips: Clip[], loop = false, rate = 1): Promise<void> {
    this.stop();
    const generation = this.generation;
    try {
      do {
        for (const clip of clips) {
          if (generation !== this.generation) return;
          this.changed(clip.key, loop);
          await this.one(clip, rate);
          if (generation !== this.generation) return;
          await this.pause(260);
        }
        if (loop && generation === this.generation) await this.pause(650);
      } while (loop && generation === this.generation);
    } finally {
      if (generation === this.generation) this.stop();
    }
  }
  async blob(blob: Blob) {
    const url = URL.createObjectURL(blob);
    try {
      await this.play([{ text: "", language: "en-US", key: "recording", url }]);
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  private pause(ms: number) {
    return new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, ms);
      this.cancel = () => {
        clearTimeout(timer);
        resolve();
      };
    });
  }
  private one(clip: Clip, rate: number): Promise<void> {
    return new Promise((resolve, reject) => {
      let finished = false;
      const done = (error?: Error) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        this.cancel = () => {};
        error ? reject(error) : resolve();
      };
      const timer = setTimeout(
        () =>
          done(
            new Error("Playback timed out. Tap again or choose another voice."),
          ),
        30_000,
      );
      this.cancel = () => done();
      if (clip.url) {
        const audio = new Audio(clip.url);
        this.activeAudio = audio;
        audio.playbackRate = rate;
        audio.onended = () => done();
        audio.onerror = () => done(new Error("This audio cannot be played."));
        void audio.play().catch((error) => done(error));
        return;
      }
      if (hasNativeAudio()) {
        void nativeAudio
          .speak({ text: clip.text, language: clip.language, rate })
          .then(
            () => done(),
            (error) => done(error),
          );
        return;
      }
      if (typeof speechSynthesis === "undefined") {
        done(new Error("Speech playback is unavailable on this device."));
        return;
      }
      const voices = speechSynthesis.getVoices(),
        voice =
          voices.find((v) => v.lang.replace("_", "-") === clip.language) ||
          voices.find((v) => v.lang.startsWith(clip.language.slice(0, 2)));
      if (!voice) {
        done(
          new Error(
            `Install a ${clip.language} voice in your device speech settings, then reopen the app.`,
          ),
        );
        return;
      }
      const speech = new SpeechSynthesisUtterance(clip.text);
      speech.lang = clip.language;
      speech.voice = voice;
      speech.rate = rate;
      speech.onend = () => done();
      speech.onerror = (e) =>
        done(
          new Error(
            e.error === "not-allowed"
              ? "Tap to allow audio playback."
              : `Voice playback failed (${e.error}).`,
          ),
        );
      speechSynthesis.speak(speech);
    });
  }
}
