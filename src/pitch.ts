import { resamplePCM } from './pcm';

/** Conservative YIN-style pitch aid. Independent implementation of difference,
 * cumulative-mean normalization and interpolated first acceptable minimum:
 * de Cheveigné & Kawahara (2002), doi:10.1121/1.1458024.
 * Unlike the paper's fallback, uncertain frames return null, not a best guess.
 * This measures periodicity only. It cannot identify a word or grade a tone.
 */
export function framePitch(frame: Float32Array, rate: number): number | null {
  const minHz = 70, maxHz = 650;
  const first = Math.max(2, Math.floor(rate / maxHz));
  const last = Math.ceil(rate / minHz) + 1;
  if (frame.length < 2 * last + 2) return null;
  let mean = 0, energy = 0;
  for (const value of frame) mean += value;
  mean /= frame.length;
  for (const value of frame) energy += (value - mean) ** 2;
  if (energy / frame.length < .008 ** 2) return null;
  const difference = new Float64Array(last + 1);
  const normalized = new Float64Array(last + 1);
  normalized[0] = 1;
  const width = frame.length - last;
  let cumulative = 0;
  for (let lag = 1; lag <= last; lag++) {
    let sum = 0;
    // Same integration width at every lag: do not reward longer lags just
    // because fewer sample pairs were compared.
    for (let i = 0; i < width; i++) sum += (frame[i] - frame[i + lag]) ** 2;
    difference[lag] = sum;
    cumulative += sum;
    normalized[lag] = cumulative > 1e-20 ? sum * lag / cumulative : 1;
  }
  for (let lag = first; lag < last; lag++) {
    if (normalized[lag] > .15 || normalized[lag] > normalized[lag - 1] ||
        normalized[lag] > normalized[lag + 1]) continue;
    const left = difference[lag - 1], center = difference[lag], right = difference[lag + 1];
    const curvature = left - 2 * center + right;
    const shift = curvature > 1e-20 ? Math.max(-.5, Math.min(.5, (left - right) / (2 * curvature))) : 0;
    const hz = rate / (lag + shift);
    return hz >= minHz && hz <= maxHz ? hz : null;
  }
  return null;
}

/** Keep the existing 40-ms display cadence and avoid aliased sample dropping. */
export function pitchContour(samples: Float32Array, rate: number): (number | null)[] {
  const working = rate > 16000 ? resamplePCM(samples, rate) : samples;
  const sr = rate > 16000 ? 16000 : rate;
  const window = Math.max(1, Math.round(sr * .04));
  const result: (number | null)[] = [];
  for (let from = 0; from < working.length; from += window)
    result.push(framePitch(working.subarray(from, from + window), sr));
  return result;
}
