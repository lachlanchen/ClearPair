import { describe, it, expect } from "vitest";
import {
  calibratedProbability,
  logSumExp,
  scoreContrast,
  releasedCalibrations,
  scorePlannedContrast,
  type Calibration,
  type ScoreEvidence,
} from "./scoring";
import { analyze } from "./analysis";
import { assessmentPlan } from "./scoring-profiles";
// Synthetic contract fixtures test math/gates, NOT pronunciation accuracy.
const evidence = (): ScoreEvidence => ({
  model: "fixture",
  profile: "en-h-f:v1",
  language: "en-US",
  contrast: "h-f",
  unit: "phone",
  alignedFrames: 20,
  coverage: 0.95,
  contentConfidence: 0.99,
  outOfDistribution: 0.01,
  targetLogLikelihood: -2,
  competitorLogLikelihoods: [-70],
  otherLogLikelihood: -100,
  features: {},
  quality: analyze(
    Float32Array.from({ length: 16000 }, (_, i) => 0.1 * Math.sin(i / 10)),
    16000,
  ),
});
const calibration = (): Calibration => ({
  model: "fixture",
  profile: "en-h-f:v1",
  language: "en-US",
  contrasts: ["h-f"],
  app: "handf",
  unit: "phone",
  validation: {
    reportSha256: "a".repeat(64),
    approved: true,
    heldOutSpeakers: 30,
    correctExamples: 100,
    confusedExamples: 100,
  },
  intercept: 0,
  weights: { llr: 1 },
  knots: [
    [0, 0],
    [1, 1],
  ],
  gates: {
    coverage: 0.8,
    contentConfidence: 0.8,
    maxOOD: 0.1,
    minFrames: 4,
    maxEntropy: 0.8,
  },
});
describe("calibrated contrast scorer contract", () => {
  it("ships no pretend validated calibration", () =>
    expect(releasedCalibrations).toEqual([]));
  it("does not score without human-validated calibration", () =>
    expect(scoreContrast("handf", evidence())).toEqual({
      status: "unscored",
      reason: "unvalidated-model",
    }));
  it("refuses silence even if the model is confident", () => {
    const e = evidence();
    e.quality = analyze(new Float32Array(16000), 16000);
    expect(scoreContrast("handf", e, calibration())).toEqual({
      status: "unscored",
      reason: "poor-signal",
    });
  });
  it("refuses cross-app or cross-language calibration", () => {
    expect(scoreContrast("arabic", evidence(), calibration())).toEqual({
      status: "unscored",
      reason: "wrong-model",
    });
  });
  it("scores strong validated target evidence", () => {
    expect(scoreContrast("handf", evidence(), calibration())).toMatchObject({
      status: "scored",
      score: 97,
    });
  });
  it("scores the confused sound low rather than giving a generic pass", () => {
    const e = evidence();
    e.targetLogLikelihood = -90;
    e.competitorLogLikelihoods = [-1];
    expect(scoreContrast("handf", e, calibration())).toMatchObject({
      status: "scored",
      score: 1,
    });
  });
  it("abstains when the acoustic evidence cannot separate the pair", () => {
    const e = evidence();
    e.targetLogLikelihood = -4;
    e.competitorLogLikelihoods = [-4];
    expect(scoreContrast("handf", e, calibration())).toEqual({
      status: "unscored",
      reason: "uncertain",
    });
  });
  it("rejects unrelated speech even with a forced target alignment", () => {
    const e = evidence();
    e.contentConfidence = 0.2;
    expect(scoreContrast("handf", e, calibration())).toEqual({
      status: "unscored",
      reason: "unaligned",
    });
  });
  it("rejects out-of-distribution input", () => {
    const e = evidence();
    e.outOfDistribution = 0.8;
    expect(scoreContrast("handf", e, calibration())).toEqual({
      status: "unscored",
      reason: "uncertain",
    });
  });
  it("rejects nonfinite likelihoods", () => {
    const e = evidence();
    e.targetLogLikelihood = NaN;
    expect(scoreContrast("handf", e, calibration())).toEqual({
      status: "unscored",
      reason: "invalid-evidence",
    });
  });
  it("rejects missing learned features instead of silently using zero", () => {
    const c = calibration();
    c.weights.f3 = 1;
    expect(scoreContrast("handf", evidence(), c)).toEqual({
      status: "unscored",
      reason: "invalid-evidence",
    });
  });
  it("never enables an unsupported contrast", () => {
    const e = evidence();
    e.contrast = "vowel";
    expect(scoreContrast("handf", e, calibration())).toEqual({
      status: "unscored",
      reason: "unsupported-contrast",
    });
  });
  it("rejects unapproved or undersampled validation", () => {
    const c = calibration();
    c.validation.heldOutSpeakers = 1;
    expect(scoreContrast("handf", evidence(), c)).toMatchObject({
      status: "unscored",
      reason: "unvalidated-model",
    });
  });
  it("uses numerically stable likelihood summation", () =>
    expect(logSumExp([-10000, -10000])).toBeCloseTo(-10000 + Math.log(2)));
  it("never grades a letter name or tone using a phone calibration", () => {
    const e = evidence();
    e.unit = "letter-name";
    expect(scoreContrast("handf", e, calibration())).toMatchObject({
      status: "unscored",
      reason: "wrong-model",
    });
  });
  it("routes only evidence belonging to the exact planned task", () => {
    const plan = assessmentPlan("handf", "hf-en", 0, 0);
    const sentence = assessmentPlan("handf", "hf-en", 0, 0, true);
    if (plan.mode !== "contrast" || sentence.mode !== "contrast")
      throw new Error("missing plan");
    const e = evidence(),
      c = calibration();
    e.contrast = plan.calibrationKey;
    c.contrasts = [plan.calibrationKey];
    expect(scorePlannedContrast("handf", plan, e, [c]).status).toBe("scored");
    expect(scorePlannedContrast("handf", sentence, e, [c])).toMatchObject({
      reason: "wrong-model",
    });
    expect(scorePlannedContrast("handf", plan, e)).toMatchObject({
      reason: "unvalidated-model",
    });
    e.profile = "cmn-x-f:v1";
    expect(scorePlannedContrast("handf", plan, e, [c])).toMatchObject({
      reason: "wrong-model",
    });
  });
  it.each([NaN, Infinity, -1, 0.5])(
    "rejects malformed validation counts: %s",
    (value) => {
      const c = calibration();
      c.validation.heldOutSpeakers = value;
      expect(scoreContrast("handf", evidence(), c)).toMatchObject({
        status: "unscored",
        reason: "unvalidated-model",
      });
    },
  );
  it.each([NaN, Infinity, -1, 1.1])(
    "rejects invalid probability gates: %s",
    (value) => {
      for (const key of [
        "coverage",
        "contentConfidence",
        "maxOOD",
        "maxEntropy",
      ] as const) {
        const c = calibration();
        c.gates[key] = value;
        expect(scoreContrast("handf", evidence(), c).status).toBe("unscored");
      }
    },
  );
  it.each([NaN, Infinity, -1, 1.1])(
    "rejects invalid evidence probabilities: %s",
    (value) => {
      for (const key of [
        "coverage",
        "contentConfidence",
        "outOfDistribution",
      ] as const) {
        const e = evidence();
        e[key] = value;
        expect(scoreContrast("handf", e, calibration()).status).toBe(
          "unscored",
        );
      }
    },
  );
  it("rejects invalid quality evidence and unavailable analysis", () => {
    const e = evidence();
    e.quality.voicedSeconds = NaN;
    expect(scoreContrast("handf", e, calibration())).toMatchObject({
      reason: "invalid-evidence",
    });
    e.quality = evidence().quality;
    e.quality.status = "unavailable";
    expect(scoreContrast("handf", e, calibration())).toMatchObject({
      reason: "poor-signal",
    });
  });
  it("does not enable a constant-score head", () => {
    const c = calibration();
    c.weights = {};
    expect(scoreContrast("handf", evidence(), c).status).toBe("unscored");
    c.weights = { llr: 0 };
    expect(scoreContrast("handf", evidence(), c).status).toBe("unscored");
  });
  it.each([NaN, Infinity, -Infinity, -0.1, 1.1])(
    "rejects an invalid calibration input: %s",
    (value) => {
      expect(() =>
        calibratedProbability(value, [
          [0, 0],
          [1, 1],
        ]),
      ).toThrow();
    },
  );
  it("interpolates calibration but rejects nonmonotonic mappings", () => {
    expect(
      calibratedProbability(0.5, [
        [0, 0.1],
        [1, 0.9],
      ]),
    ).toBeCloseTo(0.5);
    expect(() =>
      calibratedProbability(0.5, [
        [0, 0.9],
        [1, 0.1],
      ]),
    ).toThrow();
  });
});
