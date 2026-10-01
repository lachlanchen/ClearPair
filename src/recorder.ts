import { hasNativeAudio, nativeAudio } from "./native";
import type { PluginListenerHandle } from "@capacitor/core";
export class Recorder {
  private generation = 0;
  private stream?: MediaStream;
  private media?: MediaRecorder;
  private context?: AudioContext;
  private animation = 0;
  private listener?: PluginListenerHandle;
  private chunks: Blob[] = [];
  private native = false;
  async start(meter: (rms: number) => void) {
    if (this.stream || this.media || this.native)
      throw new Error("A recording is already active.");
    const generation = ++this.generation;
    this.native = hasNativeAudio();
    if (this.native) {
      try {
        const listener = await nativeAudio.addListener("meter", (e) => {
          if (generation === this.generation) meter(e.rms);
        });
        // Registration and OS permission can both finish after cancellation.
        // A stale attempt owns only its subscription, never the next take.
        if (generation !== this.generation) {
          await listener.remove();
          return;
        }
        this.listener = listener;
        await nativeAudio.start();
      } catch (error) {
        if (generation === this.generation) await this.cancel();
        throw error;
      }
      return;
    }
    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    )
      throw new Error(
        "Microphone recording requires a supported browser and HTTPS.",
      );
    let stream: MediaStream | undefined;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      if (generation !== this.generation) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      this.stream = stream;
      const context = new AudioContext();
      this.context = context;
      await context.resume();
      if (generation !== this.generation) {
        // This attempt owns its context/stream, not a newer take's resources.
        stream.getTracks().forEach((t) => t.stop());
        await context.close().catch(() => {});
        return;
      }
      const source = context.createMediaStreamSource(stream),
        analyser = context.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      const frame = new Float32Array(analyser.fftSize);
      const tick = () => {
        if (generation !== this.generation) return;
        analyser.getFloatTimeDomainData(frame);
        meter(Math.sqrt(frame.reduce((s, v) => s + v * v, 0) / frame.length));
        this.animation = requestAnimationFrame(tick);
      };
      tick();
      const mime = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find(
        (m) => MediaRecorder.isTypeSupported(m),
      );
      this.media = new MediaRecorder(
        stream,
        mime ? { mimeType: mime } : undefined,
      );
      this.chunks = [];
      this.media.ondataavailable = (e) => {
        if (e.data.size) this.chunks.push(e.data);
      };
      this.media.start(200);
    } catch (error) {
      stream?.getTracks().forEach((t) => t.stop());
      if (generation === this.generation) await this.release();
      throw error;
    }
  }
  async stop(): Promise<Blob> {
    this.generation++;
    if (this.native) {
      try {
        const result = await nativeAudio.stop();
        return new Blob(
          [Uint8Array.from(atob(result.base64), (c) => c.charCodeAt(0))],
          { type: result.mimeType },
        );
      } finally {
        await this.listener?.remove();
        this.listener = undefined;
        this.native = false;
      }
    }
    const media = this.media;
    if (!media) throw new Error("No recording is active.");
    try {
      return await new Promise<Blob>((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error("The recorder did not finish. Please retry.")),
          4000,
        );
        media.onstop = () => {
          clearTimeout(timer);
          const blob = new Blob(this.chunks, { type: media.mimeType });
          blob.size
            ? resolve(blob)
            : reject(new Error("The microphone returned an empty recording."));
        };
        media.onerror = () => {
          clearTimeout(timer);
          reject(
            new Error("Recording failed. Please check microphone permission."),
          );
        };
        media.stop();
      });
    } finally {
      await this.release();
    }
  }
  async cancel() {
    this.generation++;
    if (this.native) {
      await nativeAudio.cancel().catch(() => {});
      await this.listener?.remove();
      this.listener = undefined;
      this.native = false;
    }
    if (this.media?.state === "recording") {
      this.media.ondataavailable = null;
      this.media.stop();
    }
    await this.release();
  }
  private async release() {
    cancelAnimationFrame(this.animation);
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = undefined;
    this.media = undefined;
    this.chunks = [];
    await this.context?.close().catch(() => {});
    this.context = undefined;
  }
}
