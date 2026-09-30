import type { Analysis } from "./types";
export function analyze(samples: Float32Array, rate: number): Analysis {
  if (!Number.isFinite(rate) || rate <= 0)
    throw new Error("Invalid sample rate");
  let sum = 0,
    peak = 0,
    clipped = 0,
    voiced = 0;
  for (const v of samples) {
    if (!Number.isFinite(v)) throw new Error("Invalid audio sample");
    sum += v * v;
    peak = Math.max(peak, Math.abs(v));
    if (Math.abs(v) > 0.985) clipped++;
  }
  const rms = Math.sqrt(sum / Math.max(samples.length, 1)),
    waveform: number[] = [],
    pitch: (number | null)[] = [];
  const window = Math.max(1, Math.round(rate * 0.04));
  for (let start = 0; start < samples.length; start += window) {
    const frame = samples.subarray(start, start + window);
    const r = Math.sqrt(frame.reduce((s, v) => s + v * v, 0) / frame.length);
    if (r > 0.008) voiced += frame.length / rate;
    // Autocorrelation on downsampled 8kHz frames: an aid, not a clinical pitch measurement.
    const step = Math.max(1, Math.floor(rate / 8000)),
      values = Array.from(frame.filter((_, i) => i % step === 0));
    const sr = rate / step,
      minLag = Math.max(1, Math.floor(sr / 500)),
      maxLag = Math.min(Math.ceil(sr / 70), values.length - 2);
    let best = 0,
      lag = 0;
    if (r > 0.008)
      for (let k = minLag; k <= maxLag; k++) {
        let c = 0,
          a = 0,
          b = 0;
        for (let j = 0; j < values.length - k; j++) {
          c += values[j] * values[j + k];
          a += values[j] ** 2;
          b += values[j + k] ** 2;
        }
        const corr = c / Math.sqrt(a * b || 1);
        if (corr > best) {
          best = corr;
          lag = k;
        }
      }
    pitch.push(best > 0.8 && lag ? sr / lag : null);
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
    pitch,
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
  const ctx = new AudioContext();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const decoded = await Promise.race([
      blob.arrayBuffer().then((data) => ctx.decodeAudioData(data)),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error("Audio decoder timed out")),
          3000,
        );
      }),
    ]);
    return analyze(decoded.getChannelData(0), decoded.sampleRate);
  } finally {
    clearTimeout(timeout);
    await ctx.close().catch(() => {});
  }
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
