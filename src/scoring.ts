import type { Analysis, AppId, Language } from "./types";
import type { AssessmentPlan } from "./scoring-profiles";
export type ScoreReason =
  | "poor-signal"
  | "unvalidated-model"
  | "wrong-model"
  | "unsupported-contrast"
  | "unaligned"
  | "uncertain"
  | "invalid-evidence"
  | "ungraded-exercise"
  | "cancelled"
  | "model-unavailable"
  | "reference-unavailable";
export interface ScoreEvidence {
  model: string;
  profile: string;
  language: Language;
  contrast: string;
  unit: "phone" | "letter-name" | "tone";
  alignedFrames: number;
  coverage: number;
  contentConfidence: number;
  outOfDistribution: number;
  // The on-device phonetic encoder supplies likelihoods, never ASR string equality.
  targetLogLikelihood: number;
  competitorLogLikelihoods: number[];
  otherLogLikelihood: number;
  features: Record<string, number>;
  quality: Analysis;
}
export interface Calibration {
  model: string;
  profile: string;
  language: Language;
  contrasts: string[];
  app: AppId;
  unit: ScoreEvidence["unit"];
  validation: {
    reportSha256: string;
    heldOutSpeakers: number;
    correctExamples: number;
    confusedExamples: number;
    approved: boolean;
  };
  intercept: number;
  weights: Record<string, number>;
  // Monotonic held-out calibration mapping from the head output to correctness.
  knots: [number, number][];
  gates: {
    coverage: number;
    contentConfidence: number;
    maxOOD: number;
    minFrames: number;
    maxEntropy: number;
  };
}
export type ScoreResult =
  | { status: "unscored"; reason: ScoreReason }
  | {
      status: "matched";
      score: number;
      contrast: string;
      model: "local-reference-dtw:v1";
      unit: ScoreEvidence["unit"];
      // A reference similarity index, NOT a probability of correct pronunciation.
      targetDistance: number;
      competitorDistance: number;
      referenceVoice: string;
      scope: "word" | "sentence";
      hf?: import('./hf-score').HFDetails;
      closestWord?: string;
      evidence?: "sound" | "word";
    }
  | {
      status: "scored";
      score: number;
      probability: number;
      contrast: string;
      model: string;
      unit: ScoreEvidence["unit"];
    };
const sigmoid = (x: number) =>
  x >= 0 ? 1 / (1 + Math.exp(-x)) : Math.exp(x) / (1 + Math.exp(x));
export function logSumExp(values: number[]): number {
  if (!values.length) return -Infinity;
  const m = Math.max(...values);
  return m === -Infinity || m === Infinity
    ? m
    : m + Math.log(values.reduce((s, v) => s + Math.exp(v - m), 0));
}
export function calibratedProbability(
  value: number,
  knots: [number, number][],
): number {
  if (
    !Number.isFinite(value) ||
    value < 0 ||
    value > 1 ||
    knots.length < 2 ||
    knots.some(
      ([x, y], i) =>
        !Number.isFinite(x) ||
        !Number.isFinite(y) ||
        x < 0 ||
        x > 1 ||
        y < 0 ||
        y > 1 ||
        (i > 0 && (x <= knots[i - 1][0] || y < knots[i - 1][1])),
    )
  )
    throw new Error("Invalid calibration");
  if (value <= knots[0][0]) return knots[0][1];
  for (let i = 1; i < knots.length; i++) {
    const [x, y] = knots[i],
      [px, py] = knots[i - 1];
    if (value <= x) return py + ((y - py) * (value - px)) / (x - px);
  }
  return knots.at(-1)![1];
}
export function scoreContrast(
  app: AppId,
  e: ScoreEvidence,
  calibration?: Calibration,
): ScoreResult {
  const no = (reason: ScoreReason): ScoreResult => ({
    status: "unscored",
    reason,
  });
  const probabilityValue = (value: number) =>
    Number.isFinite(value) && value >= 0 && value <= 1;
  if (
    ![
      e.quality.seconds,
      e.quality.rms,
      e.quality.peak,
      e.quality.voicedSeconds,
    ].every((value) => Number.isFinite(value) && value >= 0) ||
    !probabilityValue(e.quality.clipped) ||
    e.quality.voicedSeconds > e.quality.seconds + 0.001
  )
    return no("invalid-evidence");
  if (
    !["clear", "quiet"].includes(e.quality.status) ||
    e.quality.seconds <= 0 ||
    e.quality.voicedSeconds < 0.12
  )
    return no("poor-signal");
  const c = calibration;
  if (
    !c ||
    !c.validation.approved ||
    !/^[a-f0-9]{64}$/.test(c.validation.reportSha256) ||
    ![
      c.validation.heldOutSpeakers,
      c.validation.correctExamples,
      c.validation.confusedExamples,
    ].every((value) => Number.isSafeInteger(value) && value >= 0) ||
    c.validation.heldOutSpeakers < 30 ||
    c.validation.correctExamples < 100 ||
    c.validation.confusedExamples < 100
  )
    return no("unvalidated-model");
  if (
    c.app !== app ||
    c.model !== e.model ||
    c.profile !== e.profile ||
    c.language !== e.language ||
    c.unit !== e.unit
  )
    return no("wrong-model");
  if (!c.contrasts.includes(e.contrast)) return no("unsupported-contrast");
  if (
    ![
      c.gates.coverage,
      c.gates.contentConfidence,
      c.gates.maxOOD,
      c.gates.maxEntropy,
    ].every(probabilityValue) ||
    !Number.isSafeInteger(c.gates.minFrames) ||
    c.gates.minFrames < 1 ||
    !Number.isFinite(c.intercept) ||
    !Object.values(c.weights).length ||
    !Object.values(c.weights).every(Number.isFinite) ||
    !Object.values(c.weights).some((value) => value !== 0)
  )
    return no("invalid-evidence");
  if (
    !Number.isSafeInteger(e.alignedFrames) ||
    e.alignedFrames < 1 ||
    ![e.coverage, e.contentConfidence, e.outOfDistribution].every(
      probabilityValue,
    ) ||
    !e.competitorLogLikelihoods.length ||
    !Number.isFinite(e.targetLogLikelihood) ||
    e.targetLogLikelihood > 0 ||
    ![e.otherLogLikelihood, ...e.competitorLogLikelihoods].every(
      (value) => (Number.isFinite(value) && value <= 0) || value === -Infinity,
    )
  )
    return no("invalid-evidence");
  if (
    e.alignedFrames < c.gates.minFrames ||
    e.coverage < c.gates.coverage ||
    e.contentConfidence < c.gates.contentConfidence
  )
    return no("unaligned");
  if (e.outOfDistribution > c.gates.maxOOD) return no("uncertain");
  // An impossible CTC alternative has log mass -Infinity, not corrupt evidence.
  // It contributes zero to the union; the remaining union must still have mass
  // so the learned head receives a finite, calibrated likelihood-ratio feature.
  const alternative = logSumExp([
    ...e.competitorLogLikelihoods,
    e.otherLogLikelihood,
  ]);
  if (!Number.isFinite(alternative)) return no("invalid-evidence");
  const llr = (e.targetLogLikelihood - alternative) / e.alignedFrames;
  const features = { ...e.features, llr };
  let linear = c.intercept;
  for (const [key, weight] of Object.entries(c.weights)) {
    if (
      !Number.isFinite(features[key as keyof typeof features]) ||
      !Number.isFinite(weight)
    )
      return no("invalid-evidence");
    linear += weight * features[key as keyof typeof features];
  }
  if (!Number.isFinite(linear)) return no("invalid-evidence");
  let probability: number;
  try {
    probability = calibratedProbability(sigmoid(linear), c.knots);
  } catch {
    return no("invalid-evidence");
  }
  const entropy =
    probability === 0 || probability === 1
      ? 0
      : -probability * Math.log2(probability) -
        (1 - probability) * Math.log2(1 - probability);
  if (entropy > c.gates.maxEntropy) return no("uncertain");
  return {
    status: "scored",
    score: Math.round(probability * 100),
    probability,
    contrast: e.contrast,
    model: e.model,
    unit: e.unit,
  };
}
// Deliberately empty until each language/contrast passes the documented release gates.
export const releasedCalibrations: Calibration[] = [];

/** Public assessment entry point: match the exact exercise plan before examining
 * any model confidence. A calibration for a word/name must not leak into a
 * different language, target side, carrier sentence or feature-extractor version. */
export function scorePlannedContrast(
  app: AppId,
  plan: Extract<AssessmentPlan, { mode: "contrast" }>,
  evidence: ScoreEvidence,
  calibrations: readonly Calibration[] = releasedCalibrations,
): ScoreResult {
  if (
    evidence.profile !== plan.profile.id ||
    evidence.language !== plan.profile.language ||
    evidence.unit !== plan.profile.unit ||
    evidence.contrast !== plan.calibrationKey ||
    !plan.calibrationKey.startsWith(`${app}/`)
  )
    return { status: "unscored", reason: "wrong-model" };
  return scoreContrast(
    app,
    evidence,
    calibrations.find(
      (c) =>
        c.app === app &&
        c.profile === evidence.profile &&
        c.model === evidence.model &&
        c.language === evidence.language &&
        c.unit === evidence.unit &&
        c.contrasts.includes(evidence.contrast),
    ),
  );
}
