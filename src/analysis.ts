import type { Analysis } from "./types";
import { decodeRecording } from './pcm';
import { pitchContour } from './pitch';
export function analyze(samples: Float32Array, rate: number): Analysis {
  if (!Number.isFinite(rate) || rate <= 0)
    throw new Error("Invalid sample rate");
  let sum = 0,
    dc = 0,
    peak = 0,
    clipped = 0,
    voiced = 0;
  for (const v of samples) {
    if (!Number.isFinite(v)) throw new Error("Invalid audio sample");
    sum += v * v;
    dc += v;
    peak = Math.max(peak, Math.abs(v));
    if (Math.abs(v) > 0.985) clipped++;
  }
  // DC is not speech. Keep original peaks for clipping, but use AC energy for
  // signal availability so a faulty constant input cannot look like a clear take.
  const count = Math.max(samples.length, 1);
  const rms = Math.sqrt(Math.max(0, sum / count - (dc / count) ** 2)),
    waveform: number[] = [];
  const window = Math.max(1, Math.round(rate * 0.04));
  for (let start = 0; start < samples.length; start += window) {
    const frame = samples.subarray(start, start + window);
    const mean = frame.reduce((s, v) => s + v, 0) / frame.length;
    const r = Math.sqrt(frame.reduce((s, v) => s + (v - mean) ** 2, 0) / frame.length);
    if (r > 0.008) voiced += frame.length / rate;
  }
  for (let i = 0; i < 96; i++) {
    const from = Math.floor((i * samples.length) / 96),
      to = Math.floor(((i + 1) * samples.length) / 96);
    let p = 0;
    for (let j = from; j < to; j++) p = Math.max(p, Math.abs(samples[j]));
    waveform.push(p);
  }
  const clipping = clipped / Math.max(samples.length, 1);
  return {
    seconds: samples.length / rate,
    rms,
    peak,
    clipped: clipping,
    voicedSeconds: voiced,
    waveform,
    pitch: pitchContour(samples, rate),
    status:
      rms < 0.002 || voiced < 0.12
        ? "silent"
        : clipping > 0.015
          ? "clipped"
          : rms < 0.01
            ? "quiet"
            : "clear",
  };
}
export async function analyzeBlob(blob: Blob): Promise<Analysis> {
  const {samples,rate}=await decodeRecording(blob);
  return analyze(samples,rate);
}

/** A decoder failure is not silence. Keep the original capture for replay/export. */
export function unavailableAnalysis(seconds: number): Analysis {
  return {
    seconds: Number.isFinite(seconds) && seconds >= 0 ? seconds : 0,
    rms: 0,
    peak: 0,
    clipped: 0,
    voicedSeconds: 0,
    waveform: [],
    pitch: [],
    status: "unavailable",
  };
}

export async function inspectRecording(
  blob: Blob,
  seconds: number,
  inspect = analyzeBlob,
  timeoutMs = 4000,
): Promise<Analysis> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      inspect(blob),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("Audio analysis timed out")),
          timeoutMs,
        );
      }),
    ]);
  } catch {
    return unavailableAnalysis(seconds);
  } finally {
    clearTimeout(timer);
  }
}
