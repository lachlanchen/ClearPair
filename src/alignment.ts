import { validateCtc } from "./ctc";
import { logSumExp } from "./scoring";

export interface CtcAlignment {
  logLikelihood: number;
  labels: number[];
  /** Posterior occupancy of each distinct phone position, not hard boundaries.
   * CTC spikes/blank spans do not equal physical consonant durations. */
  phones: number[][];
  blank: number[];
}

/** Log-domain forward/backward marginalization of a known pronunciation.
 * Alignment is conditional on this hypothesis: it cannot establish that the
 * learner actually said it. Content/OOD gates and competing paths remain required. */
export function alignCtc(
  frames: readonly (readonly number[])[],
  labels: readonly number[],
  blank = 0,
): CtcAlignment | null {
  validateCtc(frames, labels, blank);
  if (frames.length > 2000 || labels.length > 256)
    throw new Error("Alignment exceeds a short practice utterance");
  if (!frames.length)
    return labels.length
      ? null
      : { logLikelihood: 0, labels: [], phones: [], blank: [] };
  const states = [blank, ...labels.flatMap((label) => [label, blank])];
  const n = states.length,
    tCount = frames.length;
  const alpha = Array.from({ length: tCount }, () =>
    new Float64Array(n).fill(-Infinity),
  );
  alpha[0][0] = frames[0][blank];
  if (labels.length) alpha[0][1] = frames[0][labels[0]];
  for (let t = 1; t < tCount; t++)
    for (let s = 0; s < n; s++) {
      const incoming = [alpha[t - 1][s]];
      if (s > 0) incoming.push(alpha[t - 1][s - 1]);
      if (s > 1 && states[s] !== blank && states[s] !== states[s - 2])
        incoming.push(alpha[t - 1][s - 2]);
      alpha[t][s] = logSumExp(incoming) + frames[t][states[s]];
    }
  const logLikelihood = logSumExp(
    labels.length
      ? [alpha[tCount - 1][n - 1], alpha[tCount - 1][n - 2]]
      : [alpha[tCount - 1][0]],
  );
  if (logLikelihood === -Infinity) return null;
  const beta = Array.from({ length: tCount }, () =>
    new Float64Array(n).fill(-Infinity),
  );
  beta[tCount - 1][n - 1] = 0;
  if (labels.length) beta[tCount - 1][n - 2] = 0;
  for (let t = tCount - 2; t >= 0; t--)
    for (let s = 0; s < n; s++) {
      const outgoing = [beta[t + 1][s] + frames[t + 1][states[s]]];
      if (s + 1 < n)
        outgoing.push(beta[t + 1][s + 1] + frames[t + 1][states[s + 1]]);
      if (s + 2 < n && states[s + 2] !== blank && states[s + 2] !== states[s])
        outgoing.push(beta[t + 1][s + 2] + frames[t + 1][states[s + 2]]);
      beta[t][s] = logSumExp(outgoing);
    }
  const phones = labels.map(() => Array<number>(tCount).fill(0));
  const blanks = Array<number>(tCount).fill(0);
  for (let t = 0; t < tCount; t++)
    for (let s = 0; s < n; s++) {
      const posterior = Math.exp(alpha[t][s] + beta[t][s] - logLikelihood);
      if (s % 2) phones[(s - 1) / 2][t] = posterior;
      else blanks[t] += posterior;
    }
  return { logLikelihood, labels: [...labels], phones, blank: blanks };
}

/** A model-frame anchor for further acoustic segmentation, NOT a duration score.
 * Select only the target's phone positions; carrier-sentence phones stay outside
 * this request. Equal phone weighting prevents a long neighbour dominating it. */
export function targetAnchor(
  alignment: CtcAlignment,
  fromPhone: number,
  toPhone: number,
) {
  if (
    !Number.isInteger(fromPhone) ||
    !Number.isInteger(toPhone) ||
    fromPhone < 0 ||
    toPhone <= fromPhone ||
    toPhone > alignment.phones.length
  )
    throw new Error("Invalid target phone range");
  const occupancy = Array<number>(alignment.blank.length).fill(0);
  for (const phone of alignment.phones.slice(fromPhone, toPhone)) {
    const mass = phone.reduce((sum, value) => sum + value, 0);
    if (!(mass > 0) || !Number.isFinite(mass))
      throw new Error("Target has no aligned posterior mass");
    for (let t = 0; t < phone.length; t++)
      occupancy[t] += phone[t] / mass / (toPhone - fromPhone);
  }
  const quantile = (fraction: number) => {
    let sum = 0;
    for (let t = 0; t < occupancy.length; t++) {
      sum += occupancy[t];
      if (sum >= fraction) return t;
    }
    return occupancy.length - 1;
  };
  return {
    startFrame: quantile(0.05),
    endFrameExclusive: quantile(0.95) + 1,
    occupancy,
  };
}
